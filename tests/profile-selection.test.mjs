import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cp, mkdir, mkdtemp, readFile, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {repositoryRoot, validateConfig} from '../scripts/build-plugin.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(process.env.ARKIV_TEST_TMP ?? tmpdir(), 'arkiv-profile-'));
  t.after(() => rm(root, {recursive: true}));
  await mkdir(path.join(root, 'scripts'));
  for (const file of ['plugin.config.json', 'source', 'scripts/build-plugin.mjs']) {
    await cp(path.join(repositoryRoot, file), path.join(root, file), {recursive: true});
  }
  return root;
}
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const urls = {general: 'https://mcp.arkiv.network/', mumbai: 'https://mcp.arkiv.network/mumbai'};
function run(root, ...args) {
  return execFileSync(process.execPath, [path.join(root, 'scripts/build-plugin.mjs'), ...args],
    {cwd: root, encoding: 'utf8', stdio: 'pipe', timeout: 5000, windowsHide: true});
}

test('explicit CLI profile selection round-trips both hosts without changing version or hooks', async t => {
  const root = await fixture(t);
  const before = await json(path.join(root, 'plugin.config.json'));
  for (const profile of ['general', 'mumbai', 'general']) {
    run(root, '--mcp-profile', profile);
    const config = await json(path.join(root, 'plugin.config.json'));
    assert.equal(config.mcpUrl, urls[profile]);
    assert.equal(config.version, before.version, 'Releasing maintainers bump the version explicitly');
    for (const [host, file, transport] of [['arkiv', '.mcp.json', 'http'], ['arkiv-codex', 'mcp.json', 'streamable-http']]) {
      const mcp = (await json(path.join(root, 'plugins', host, file))).mcpServers.arkiv;
      assert.equal(mcp.url, urls[profile]); assert.equal(mcp.type, transport);
      for (const name of ['sdk-context.mjs', 'context-hook.mjs']) assert.deepEqual(
        await readFile(path.join(root, 'plugins', host, 'scripts/context', name)),
        await readFile(path.join(repositoryRoot, 'source/context', name)));
    }
    const guide = await readFile(path.join(root, 'plugins/arkiv-codex/AGENTS.md'), 'utf8');
    const manifest = await json(path.join(root, 'plugins/arkiv-codex/.codex-plugin/plugin.json'));
    assert.ok(guide.includes(`server_status reporting profile ${profile}`));
    assert.ok(manifest.interface.shortDescription.includes(profile === 'general' ? 'General' : 'Mumbai'));
    if (profile === 'general') assert.doesNotMatch(guide, /Mumbai|profile mumbai/);
    run(root, '--check', '--mcp-profile', profile);
    run(root, '--check');
  }
});

test('unknown profiles, raw URL options and alternate URL spellings are rejected without mutation', async t => {
  const root = await fixture(t), before = await readFile(path.join(root, 'plugin.config.json'));
  for (const args of [['--mcp-profile', 'devfolio'], ['--mcp-profile', urls.general], ['--mcp-profile'],
    ['--mcp-profile', 'General'], ['--mcp-profile', 'general', '--mcp-profile', 'mumbai'], ['--check', '--check']]) {
    assert.throws(() => run(root, ...args));
    assert.deepEqual(await readFile(path.join(root, 'plugin.config.json')), before);
  }
  const config = JSON.parse(before);
  for (const mcpUrl of Object.values(urls)) assert.doesNotThrow(() => validateConfig({...config, mcpUrl}));
  const credentialUrl = new URL(urls.general);
  credentialUrl.username = 'fixture';
  credentialUrl.password = 'fixture';
  for (const mcpUrl of ['https://mcp.arkiv.network', urls.mumbai + '/', urls.general + '?x=1', urls.mumbai + '#x',
    'https://mcp.arkiv.network:443/', credentialUrl.href, 'https://mcp.arkiv.network/devfolio']) {
    assert.throws(() => validateConfig({...config, mcpUrl}), /Unexpected MCP URL/);
  }
});

test('profile check mode never switches persisted configuration', async t => {
  const root = await fixture(t);
  run(root, '--mcp-profile', 'mumbai');
  const before = await readFile(path.join(root, 'plugin.config.json'));
  assert.throws(() => run(root, '--check', '--mcp-profile', 'general'), /Configured MCP profile differs/);
  assert.deepEqual(await readFile(path.join(root, 'plugin.config.json')), before);
});
