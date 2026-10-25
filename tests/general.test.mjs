import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import * as builder from '../scripts/build-plugin.mjs';

const config = JSON.parse(await readFile(path.join(builder.repositoryRoot, 'plugin.config.json'), 'utf8'));
const source = await readFile(path.join(builder.repositoryRoot, 'source/always-on.md'), 'utf8');
const preview = 'https://arkiv-mcp-general-a1b2c3d4e-golem.vercel.app/';

test('R9 release is 0.4.1 and both hosts target exactly General', () => {
  assert.equal(config.version, '0.4.1');
  assert.equal(config.mcpUrl, 'https://mcp.arkiv.network/');
  const artifacts = builder.buildArtifacts(config, source);
  for (const file of ['plugins/arkiv/.mcp.json', 'plugins/arkiv-codex/mcp.json']) {
    assert.equal(JSON.parse(artifacts.get(file)).mcpServers.arkiv.url, config.mcpUrl);
  }
  assert.match(artifacts.get('plugins/arkiv-codex/AGENTS.md'), /successful server_status.*profile general/);
  assert.doesNotMatch(artifacts.get('plugins/arkiv-codex/AGENTS.md'), /confirm profile devfolio/);
});

test('R9 release rejects every alternative URL spelling, including immutable Preview', () => {
  assert.doesNotThrow(() => builder.validateConfig({...config, mcpUrl: 'https://mcp.arkiv.network/'}));
  for (const mcpUrl of [preview, 'https://mcp.arkiv.network', 'https://mcp.arkiv.network/devfolio',
    'https://mcp.arkiv.network//', 'https://mcp.arkiv.network/?q=1', 'https://mcp.arkiv.network/#x',
    'http://mcp.arkiv.network/', 'https://mcp.arkiv.network:443/', 'https://u:p@mcp.arkiv.network/',
    'https://MCP.arkiv.network/', 'https://mcp.arkiv.network./', 'https://mcp.arkiv.network/\n']) {
    assert.throws(() => builder.validateConfig({...config, mcpUrl}), /Unexpected MCP URL/, mcpUrl);
  }
});

test('R9 audience opt-in is exact and independent of the unchanged Claude telemetry opt-out', () => {
  const helper = builder.buildArtifacts(config, source).get('plugins/arkiv/scripts/client-headers.mjs');
  for (const audience of [undefined, '', 'internal', 'unknown', 'INTERNAL', ' internal', 'internal\n', 'private-canary']) {
    for (const telemetry of [undefined, 'off', 'on', 'private-canary']) {
      const env = {...process.env}; delete env.ARKIV_AUDIENCE; delete env.ARKIV_TELEMETRY;
      if (audience !== undefined) env.ARKIV_AUDIENCE = audience;
      if (telemetry !== undefined) env.ARKIV_TELEMETRY = telemetry;
      const output = execFileSync(process.execPath, ['--input-type=module', '-e', helper],
        {env, encoding: 'utf8', timeout: 3000, windowsHide: true});
      const expected = telemetry === 'off' ? {} : {'X-Arkiv-Client': `arkiv-plugin/${config.version}; host=claude-code`};
      if (audience === 'internal') expected['X-Arkiv-Audience'] = 'internal';
      assert.equal(output, JSON.stringify(expected) + '\n');
      assert.ok(!output.includes('private-canary'));
    }
  }
  const codex = JSON.parse(builder.buildArtifacts(config, source).get('plugins/arkiv-codex/mcp.json'));
  assert.equal(codex.mcpServers.arkiv.headers['X-Arkiv-Audience'], undefined);
});

test('R9 test-only target accepts only the immutable General Preview shape', () => {
  assert.equal(typeof builder.validatePreviewUrl, 'function');
  assert.equal(builder.validatePreviewUrl(preview), preview);
  for (const url of ['https://mcp.arkiv.network/', preview.slice(0, -1), preview + 'path',
    preview + '?q=1', preview + '#x', preview.replace('https:', 'http:'), preview.replace('.app/', '.app:443/'),
    preview.replace('https://', 'https://u:p@'), preview.replace('a1b2c3d4e', 'short'),
    preview.replace('a1b2c3d4e', 'A1B2C3D4E'), preview.replace('general-', 'event-'),
    'https://arkiv-mcp-general-main-golem.vercel.app/', preview + '\n']) {
    assert.throws(() => builder.validatePreviewUrl(url), /immutable General Preview/, url);
  }
});

test('R9 Preview output is isolated, retains fixed skills and cannot pass release/check/validate/tag gates', async () => {
  assert.equal(typeof builder.generatePreview, 'function');
  const scratch = await mkdtemp(path.join(process.env.ARKIV_TEST_TMP ?? tmpdir(), 'arkiv-preview-test-'));
  try {
    const destination = path.join(scratch, 'preview');
    const before = await readFile(path.join(builder.repositoryRoot, 'plugins/arkiv/.mcp.json'));
    await builder.generatePreview(builder.repositoryRoot, preview, destination);
    assert.deepEqual(await readFile(path.join(builder.repositoryRoot, 'plugins/arkiv/.mcp.json')), before);
    for (const bundle of ['arkiv', 'arkiv-codex']) {
      const file = bundle === 'arkiv' ? '.mcp.json' : 'mcp.json';
      assert.equal(JSON.parse(await readFile(path.join(destination, 'plugins', bundle, file))).mcpServers.arkiv.url, preview);
      assert.deepEqual(await readFile(path.join(destination, 'plugins', bundle, 'skills/arkiv/SKILL.md')),
        await readFile(path.join(builder.repositoryRoot, 'plugins', bundle, 'skills/arkiv/SKILL.md')));
    }
    assert.equal(JSON.parse(await readFile(path.join(destination, 'TEST_ONLY.json'))).publishable, false);
    await assert.rejects(builder.generate(destination), /Test-only/);
    await assert.rejects(builder.generate(destination, true), /Test-only/);
    for (const command of ['check', 'validate', 'tag']) {
      assert.throws(() => execFileSync(process.execPath,
        [path.join(builder.repositoryRoot, 'scripts/release-gate.mjs'), command, destination],
        {encoding: 'utf8', timeout: 3000, windowsHide: true, stdio: 'pipe'}), /Test-only/);
      for (const bundle of ['arkiv', 'arkiv-codex']) {
        assert.throws(() => execFileSync(process.execPath,
          [path.join(builder.repositoryRoot, 'scripts/release-gate.mjs'), command, path.join(destination, 'plugins', bundle)],
          {encoding: 'utf8', timeout: 3000, windowsHide: true, stdio: 'pipe'}), /Test-only/);
      }
    }
    await assert.rejects(builder.generatePreview(builder.repositoryRoot, preview, destination), /EEXIST/);
    await assert.rejects(builder.generatePreview(builder.repositoryRoot, preview, builder.repositoryRoot), /separate/);
  } finally {
    assert.equal(path.dirname(scratch), path.resolve(process.env.ARKIV_TEST_TMP ?? tmpdir()));
    await rm(scratch, {recursive: true});
  }
});

test('R9 canonical skills remain at the required full revision', () => {
  assert.equal(config.skillsSource.commit, 'f4875a91ff5cfd968e2c979b2ac350fe84d1ecc0');
});

test('0.4.1 bundled arkiv-mcp skill describes General, not the ended Devfolio target', async () => {
  for (const bundle of ['arkiv', 'arkiv-codex']) {
    const skill = await readFile(path.join(builder.repositoryRoot, 'plugins', bundle, 'skills/arkiv-mcp/SKILL.md'), 'utf8');
    assert.ok(skill.includes('The Arkiv plugin bundles the **General** profile at `https://mcp.arkiv.network/`'), bundle);
    assert.ok(skill.includes('The Devfolio profile (Arkiv: Global Tour Stop) has ended and is frozen'), bundle);
    assert.ok(!skill.includes('plugin bundles the **Devfolio'), bundle);
  }
});

test('R9 current synthetic MCP status and graders expect General without claiming event rules', async () => {
  const base = path.join(builder.repositoryRoot, 'plugins/arkiv/evals');
  const status = await readFile(path.join(base, 'mocks/arkiv/server_status.md'), 'utf8');
  const body = JSON.parse(status.split(/\r?\n---\r?\n/)[1]);
  assert.equal(body.id, 'general'); assert.equal(body.path, '/'); assert.equal(body.synthetic, true);
  assert.equal(body.campaign, null);
  assert.match(await readFile(path.join(base, 'plugin-mcp-status/graders/criteria.md'), 'utf8'), /CONNECTED general SYNTHETIC/);
  const eventGrader = await readFile(path.join(base, 'plugin-event-profile/graders/criteria.md'), 'utf8');
  assert.match(eventGrader, /does not claim.*event rules/);
  assert.doesNotMatch(eventGrader, /Devfolio|Global Tour Stop/);
});
