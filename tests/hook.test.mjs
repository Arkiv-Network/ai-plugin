import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp, mkdir, writeFile, rm, readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {rulesForProject, rulesForInput} from '../plugins/arkiv/hooks/arkiv-rules.mjs';
import {repositoryRoot} from '../scripts/build-plugin.mjs';

const scratchRoot = process.env.ARKIV_TEST_TMP ?? tmpdir();
const hook = path.join(repositoryRoot, 'plugins/arkiv/hooks/arkiv-rules.mjs');
const snippet = await readFile(path.join(repositoryRoot, 'plugins/arkiv/templates/AGENTS.snippet.md'), 'utf8');
async function project(text, run, options = {}) {
  await mkdir(scratchRoot, {recursive: true});
  const directory = await mkdtemp(path.join(scratchRoot, 'arkiv-hook-test with spaces-'));
  try {
    if (!options.missing) await writeFile(path.join(directory, 'package.json'), text);
    return await run(directory);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(scratchRoot));
    assert.ok(path.basename(directory).startsWith('arkiv-hook-test with spaces-'));
    await rm(directory, {recursive: true});
  }
}

for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
  test(`SDK in ${field} injects exact rules`, () => project(JSON.stringify({[field]: {'@arkiv-network/sdk': '^1.0.0'}}),
    async directory => {
      assert.equal(await rulesForProject(directory), snippet);
      const result = spawnSync(process.execPath, [hook], {input: JSON.stringify({cwd: directory}), encoding: 'utf8', timeout: 2000});
      assert.equal(result.status, 0); assert.equal(result.stderr, ''); assert.equal(result.stdout, snippet);
      assert.ok(Buffer.byteLength(result.stdout) <= 1024);
    }));
}

for (const [name, text] of Object.entries({absent: '{}', malformed: '{oops', null: 'null', array: '[]',
  emptyVersion: '{"dependencies":{"@arkiv-network/sdk":""}}', wrongType: '{"dependencies":{"@arkiv-network/sdk":1}}',
  inheritedName: '{"dependencies":{"toString":"^1.0.0"}}',
  oversized: JSON.stringify({dependencies: {'@arkiv-network/sdk': '^1.0.0'}, padding: 'x'.repeat(262144)})})) {
  test(`${name} package is silent`, () => project(text, async directory => assert.equal(await rulesForProject(directory), '')));
}
test('missing package is silent', () => project('', async directory => assert.equal(await rulesForProject(directory), ''), {missing: true}));
test('relative cwd never falls back to another project', async () => {
  assert.equal(await rulesForProject('.'), '');
  assert.equal(await rulesForInput('{"cwd":"."}'), '');
});
test('malformed and unbounded hook inputs exit successfully without output', () => project('{"dependencies":{"@arkiv-network/sdk":"^1.0.0"}}', async directory => {
  for (const input of ['', '{bad', '[]', 'null', '{}', '{"cwd":false}', 'x'.repeat(16385)]) {
    const result = spawnSync(process.execPath, [hook], {cwd: directory, input, encoding: 'utf8', timeout: 2000});
    assert.equal(result.status, 0); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
  }
}));
test('missing and oversized bundled rules are silent', () => project('{"dependencies":{"@arkiv-network/sdk":"^1.0.0"}}', async directory => {
  const root = path.join(directory, 'plugin');
  assert.equal(await rulesForProject(directory, root), '');
  await mkdir(path.join(root, 'templates'), {recursive: true});
  await writeFile(path.join(root, 'templates/AGENTS.snippet.md'), 'x'.repeat(1025));
  assert.equal(await rulesForProject(directory, root), '');
}));
test('bounded hook startup p95 stays below 200 ms', () => project('{"dependencies":{"@arkiv-network/sdk":"^1.0.0"}}', async directory => {
  const timings = [];
  for (let index = 0; index < 20; index++) {
    const start = performance.now();
    const result = spawnSync(process.execPath, [hook], {input: JSON.stringify({cwd: directory}), encoding: 'utf8', timeout: 2000});
    assert.equal(result.status, 0); assert.equal(result.stdout, snippet);
    timings.push(performance.now() - start);
  }
  timings.sort((a, b) => a - b);
  const p95 = timings[Math.ceil(timings.length * .95) - 1];
  console.log(JSON.stringify({hookTiming: {samples: timings.length, p95Ms: p95, maximumMs: timings.at(-1)}}));
  assert.ok(p95 < 200, `Hook p95 ${p95.toFixed(1)} ms exceeds 200 ms`);
}));
