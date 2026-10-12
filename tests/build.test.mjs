import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {repositoryRoot, buildArtifacts, renderRules, validateConfig, generate} from '../scripts/build-plugin.mjs';
const config = JSON.parse(await readFile(path.join(repositoryRoot, 'plugin.config.json'), 'utf8'));
const source = await readFile(path.join(repositoryRoot, 'source/always-on.md'), 'utf8');
test('marketplace points to nested plugin and version exists only on plugin manifest', () => {
  const output = buildArtifacts(config, source);
  const marketplace = JSON.parse(output.get('.claude-plugin/marketplace.json'));
  const manifest = JSON.parse(output.get('plugins/arkiv/.claude-plugin/plugin.json'));
  assert.equal(marketplace.plugins[0].source, './plugins/arkiv');
  assert.equal(marketplace.plugins[0].version, undefined); assert.equal(manifest.version, '0.1.0');
  assert.equal(manifest.license, undefined);
});
test('generated MCP is hosted HTTP without secrets', () => {
  const mcp = JSON.parse(buildArtifacts(config, source).get('plugins/arkiv/.mcp.json'));
  assert.deepEqual(mcp, {mcpServers: {arkiv: {type: 'http', url: 'https://mcp.arkiv.network/'}}});
});
test('hook uses nonblocking exec form and one argument with the complete path', () => {
  const hooks = JSON.parse(buildArtifacts(config, source).get('plugins/arkiv/hooks/hooks.json'));
  assert.deepEqual(hooks.hooks.SessionStart[0].hooks[0], {type: 'command', command: 'node',
    args: ['${CLAUDE_PLUGIN_ROOT}/hooks/arkiv-rules.mjs'], timeout: 2, onFailure: 'continue'});
});
test('unexpected endpoint, range, source revision or fields fail configuration', () => {
  for (const update of [{mcpUrl: 'https://mcp.arkiv.network/?key=redacted'}, {sdkRange: '>=0.7'}, {chainId: 1},
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
