import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtemp, mkdir, cp, readFile, writeFile, readdir, rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir, homedir} from 'node:os';
import {repositoryRoot} from '../scripts/build-plugin.mjs';

const enabled = process.env.ARKIV_TEST_NATIVE_INSTALL === '1';
const json = value => JSON.stringify(value, null, 2) + '\n';
const config = JSON.parse(await readFile(path.join(repositoryRoot, 'plugin.config.json'), 'utf8'));
const userFiles = ['settings.json', 'plugins/known_marketplaces.json', 'plugins/installed_plugins.json']
  .map(file => path.join(homedir(), '.claude', file));
async function hashes() {
  return Promise.all(userFiles.map(async file => {
    try { return {file, sha256: createHash('sha256').update(await readFile(file)).digest('hex')}; }
    catch (error) { if (error.code === 'ENOENT') return {file, sha256: null}; throw error; }
  }));
}
async function files(root, relative = '') {
  const result = [];
  for (const entry of await readdir(path.join(root, relative), {withFileTypes: true})) {
    assert.equal(entry.isSymbolicLink(), false);
    const file = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await files(root, file));
    else result.push(file);
  }
  return result;
}
async function command(binary, args, cwd, env) {
  assert.ok(binary && path.isAbsolute(binary), 'Point ARKIV_TEST_*_BIN to an installed CLI executable');
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    let output = '';
    const deadline = setTimeout(() => { child.kill(); reject(new Error('Native install operation exceeded 45 seconds')); }, 45_000);
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.once('error', error => { clearTimeout(deadline); reject(error); });
    child.once('close', code => { clearTimeout(deadline); code === 0 ? resolve(output) : reject(new Error(`CLI exited ${code}: ${output}`)); });
  });
}

for (const host of ['claude', 'codex']) {
  test(`R9 ${host}: actual isolated install contains only the loopback MCP fixture`,
    {skip: !enabled, timeout: 120_000}, async t => {
      const before = await hashes();
      const scratchRoot = path.resolve(process.env.ARKIV_TEST_TMP ?? tmpdir());
      const root = await mkdtemp(path.join(scratchRoot, `arkiv-native-${host}-`));
      const requests = [];
      const server = createServer((request, response) => {
        requests.push({host: request.headers.host, audience: request.headers['x-arkiv-audience'] ?? null});
        response.writeHead(200, {'content-type': 'application/json'});
        response.end(json({synthetic: true, profile: 'general'}));
      });
      // The process and its fixture are bounded even if a child CLI stops progressing.
      const serverDeadline = setTimeout(() => server.closeAllConnections(), 110_000);
      t.after(async () => {
        clearTimeout(serverDeadline); server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        assert.equal(path.dirname(root), scratchRoot);
        await rm(root, {recursive: true});
        assert.deepEqual(await hashes(), before, 'User Claude settings or plugin registries changed; never restore them');
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const endpoint = `http://127.0.0.1:${server.address().port}/`;
      const checkout = path.join(root, 'marketplace');
      await mkdir(checkout);
      for (const entry of ['plugins', '.claude-plugin', '.agents']) {
        await cp(path.join(repositoryRoot, entry), path.join(checkout, entry), {recursive: true});
      }
      for (const [bundle, name] of [['arkiv', '.mcp.json'], ['arkiv-codex', 'mcp.json']]) {
        const file = path.join(checkout, 'plugins', bundle, name);
        const mcp = JSON.parse(await readFile(file));
        mcp.mcpServers.arkiv.url = endpoint;
        await writeFile(file, json(mcp));
      }
      const claudeHome = path.join(root, 'claude'), codexHome = path.join(root, 'codex');
      await mkdir(claudeHome); await mkdir(codexHome);
      const env = {...process.env, CLAUDE_CONFIG_DIR: claudeHome, CODEX_HOME: codexHome,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_AUTOUPDATER: '1'};
      delete env.ARKIV_AUDIENCE; delete env.ARKIV_TELEMETRY;
      const binary = process.env[host === 'claude' ? 'ARKIV_TEST_CLAUDE_BIN' : 'ARKIV_TEST_CODEX_BIN'];
      await command(binary, ['plugin', 'marketplace', 'add', checkout], root, env);
      await command(binary, ['plugin', host === 'claude' ? 'install' : 'add', 'arkiv@arkiv'], root, env);
      const listing = await command(binary, host === 'claude' ? ['plugin', 'list', '--json']
        : ['plugin', 'list', '--marketplace', 'arkiv', '--json'], root, env);
      assert.ok(listing.includes(config.version), listing);
      const profile = host === 'claude' ? claudeHome : codexHome;
      const installedFiles = await files(path.join(profile, 'plugins/cache'));
      const bundle = host === 'claude' ? 'arkiv' : 'arkiv-codex';
      const mcpName = host === 'claude' ? '.mcp.json' : 'mcp.json';
      const installedMcp = installedFiles.find(file => path.basename(file) === mcpName);
      assert.ok(installedMcp, 'Installed MCP configuration exists');
      const packageRoot = path.dirname(path.join(profile, 'plugins/cache', installedMcp));
      const mcp = JSON.parse(await readFile(path.join(packageRoot, mcpName)));
      assert.equal(mcp.mcpServers.arkiv.url, endpoint, 'Prove loopback before any request');
      for (const file of await files(path.join(checkout, 'plugins', bundle))) {
        assert.deepEqual(await readFile(path.join(packageRoot, file)),
          await readFile(path.join(checkout, 'plugins', bundle, file)), `Installed byte parity: ${file}`);
      }
      // No model session. Exercise the installed transport metadata only against our sink.
      const headers = host === 'claude' ? JSON.parse(await command(process.execPath,
        [path.join(packageRoot, 'scripts/client-headers.mjs')], root, env)) : mcp.mcpServers.arkiv.headers;
      const response = await fetch(mcp.mcpServers.arkiv.url, {headers, signal: AbortSignal.timeout(3000), redirect: 'error'});
      assert.deepEqual(await response.json(), {synthetic: true, profile: 'general'});
      assert.ok(requests.every(request => request.host === new URL(endpoint).host && request.audience === null));
      assert.equal(headers['X-Arkiv-Client'], `arkiv-plugin/${config.version}; host=${host === 'claude' ? 'claude-code' : 'codex'}`);
      assert.deepEqual(await hashes(), before);
    });
}
