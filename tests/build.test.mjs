import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {repositoryRoot, buildArtifacts, renderRules, validateConfig, generate} from '../scripts/build-plugin.mjs';
const config = JSON.parse(await readFile(path.join(repositoryRoot, 'plugin.config.json'), 'utf8'));
const source = await readFile(path.join(repositoryRoot, 'source/always-on.md'), 'utf8');
test('marketplace points to nested plugin and version exists only on plugin manifest', () => {
  const output = buildArtifacts(config, source);
  const marketplace = JSON.parse(output.get('.claude-plugin/marketplace.json'));
  const manifest = JSON.parse(output.get('plugins/arkiv/.claude-plugin/plugin.json'));
  assert.equal(marketplace.plugins[0].source, './plugins/arkiv');
  assert.equal(marketplace.plugins[0].version, undefined); assert.equal(manifest.version, config.version);
  assert.equal(manifest.license, undefined);
});
test('generated MCP is hosted HTTP without secrets', () => {
  const mcp = JSON.parse(buildArtifacts(config, source).get('plugins/arkiv/.mcp.json'));
  assert.deepEqual(mcp, {mcpServers: {arkiv: {type: 'http', url: 'https://mcp.arkiv.network/',
    headersHelper:'node "${CLAUDE_PLUGIN_ROOT}/scripts/client-headers.mjs"'}}});
});

test('Claude opt-out omits attribution and never transmits an environment value', () => {
  for (const value of [undefined, 'off', 'on', 'private-project-canary']) {
    const env = {...process.env}; delete env.ARKIV_TELEMETRY; delete env.ARKIV_AUDIENCE;
    if (value !== undefined) env.ARKIV_TELEMETRY = value;
    const raw = execFileSync(process.execPath, [path.join(repositoryRoot, 'plugins/arkiv/scripts/client-headers.mjs')],
      {env, encoding:'utf8', timeout:2000, windowsHide:true});
    assert.deepEqual(JSON.parse(raw), value === 'off' ? {} : {'X-Arkiv-Client':'arkiv-plugin/'+config.version+'; host=claude-code'});
    assert.ok(!raw.includes('private-project-canary'));
  }
});
test('Codex uses its native manifest, shared identity/version, its own package and only the Codex context hook', () => {
  const output = buildArtifacts(config, source);
  const marketplace = JSON.parse(output.get('.agents/plugins/marketplace.json'));
  const manifest = JSON.parse(output.get('plugins/arkiv-codex/.codex-plugin/plugin.json'));
  const mcp = JSON.parse(output.get('plugins/arkiv-codex/mcp.json'));
  const hooks = JSON.parse(output.get('plugins/arkiv-codex/hooks/hooks.json')).hooks;
  assert.equal(marketplace.name, 'arkiv');
  assert.deepEqual(marketplace.plugins[0].source, {source: 'local', path: './plugins/arkiv-codex'});
  assert.equal(output.has('plugins/arkiv-codex/plugin.json'), false, 'a portable root manifest takes precedence and disables hooks');
  assert.equal(manifest.name, config.name); assert.equal(manifest.version, config.version);
  assert.equal(manifest.license, undefined); assert.equal(manifest.hooks, './hooks/hooks.json');
  assert.deepEqual(manifest.keywords, JSON.parse(output.get('plugins/arkiv/.claude-plugin/plugin.json')).keywords, 'Codex reads keywords for plugin search');
  assert.deepEqual(mcp.mcpServers, {arkiv: {type: 'streamable-http', url: config.mcpUrl,
    headers:{'X-Arkiv-Client':'arkiv-plugin/'+config.version+'; host=codex'}}});
  assert.deepEqual(Object.keys(hooks), ['SessionStart', 'UserPromptSubmit', 'PostCompact', 'SessionEnd']);
  for (const h of Object.values(hooks).flatMap(groups => groups.flatMap(g => g.hooks))) {
    assert.match(h.command, /context-hook\.mjs" codex/); assert.match(h.commandWindows, /context-hook\.mjs'\) codex/);
    assert.match(h.command, /exit 0$/); assert.ok(!/curl|https?:/.test(h.command + h.commandWindows));
  }
});
test('Claude hooks keep the rules hook first and add only the fail-open context adapter', () => {
  const hooks = JSON.parse(buildArtifacts(config, source).get('plugins/arkiv/hooks/hooks.json')).hooks;
  assert.deepEqual(Object.keys(hooks), ['SessionStart', 'UserPromptSubmit', 'FileChanged', 'CwdChanged', 'PostCompact', 'SessionEnd']);
  const context = Object.values(hooks).flatMap(groups => groups.flatMap(g => g.hooks)).filter(h => h.command !== 'node');
  assert.ok(context.length > 0);
  for (const h of context) {
    assert.match(h.command, /context-hook\.mjs" claude-code/); assert.match(h.command, /exit 0$/);
    assert.ok(!/curl|https?:/.test(h.command));
  }
  assert.ok(context.filter(h => h.async).every(h => /--broker/.test(h.command)));
});
test('Codex onboarding is explicit and rules do not depend on SDK presence', () => {
  const output = buildArtifacts(config, source);
  const guide = output.get('plugins/arkiv-codex/AGENTS.md');
  const rules = output.get('plugins/arkiv-codex/templates/AGENTS.snippet.md');
  assert.match(guide, /does not inject/); assert.match(guide, /explicitly requests/);
  assert.match(guide, /even when the SDK is absent/); assert.match(guide, /start a new Codex session/i);
  assert.match(rules, /inspect installed version\/declarations/); assert.match(rules, /\$arkiv/);
  assert.ok(!rules.includes('arkiv:arkiv'));
});
test('hook uses nonblocking exec form and one argument with the complete path', () => {
  const hooks = JSON.parse(buildArtifacts(config, source).get('plugins/arkiv/hooks/hooks.json'));
  assert.deepEqual(hooks.hooks.SessionStart[0].hooks[0], {type: 'command', command: 'node',
    args: ['${CLAUDE_PLUGIN_ROOT}/hooks/arkiv-rules.mjs'], timeout: 2, onFailure: 'continue'});
});
test('unexpected endpoint, range, source revision or fields fail configuration', () => {
  for (const mcpUrl of ['https://mcp.arkiv.network/devfolio', 'https://mcp.arkiv.network/other',
    'https://mcp.arkiv.network/devfolio/', 'https://mcp.arkiv.network/devfolio?key=redacted',
    'https://mcp.arkiv.network/devfolio#rules',
    'http://mcp.arkiv.network/devfolio', 'https://mcp.arkiv.network:443/devfolio']) {
    assert.throws(() => validateConfig({...config, mcpUrl}), /Unexpected MCP URL/);
  }
  const credentialEndpoint = new URL(config.mcpUrl);
  credentialEndpoint.username = 'fixture';
  credentialEndpoint.password = 'fixture';
  assert.throws(() => validateConfig({...config, mcpUrl: credentialEndpoint.href}), /Unexpected MCP URL/);
  for (const update of [{sdkRange: '>=0.7'}, {chainId: 1},
    {unexpected: true}, {skillsSource: {...config.skillsSource, commit: 'main'}}]) {
    assert.throws(() => validateConfig({...config, ...update}));
  }
});
test('rule generation rejects unknown tokens, excessive context and missing router', () => {
  assert.throws(() => renderRules(config, source + '\n{{password}}'));
  assert.throws(() => renderRules(config, source + 'x'.repeat(1024)));
  assert.throws(() => renderRules(config, source.replace('arkiv:arkiv router', 'other guidance')));
  assert.ok(Buffer.byteLength(renderRules(config, source)) <= 1024);
});
test('committed generated artifacts have no drift', async () => {
  assert.deepEqual((await generate(repositoryRoot, true)).changed, []);
});
