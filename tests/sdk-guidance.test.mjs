import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {repositoryRoot} from '../scripts/build-plugin.mjs';
import {checkSdkGuidance, currentSdkDocuments, sdkGuidanceViolations} from '../scripts/check-sdk-guidance.mjs';

const policies = async () => Promise.all(['source/vocabulary-policy.json', 'source/sdk-guidance-policy.json']
  .map(async file => JSON.parse(await readFile(path.join(repositoryRoot, file)))));
const stale = [1, 0, 0].join('.');

test('current plugin-owned guidance targets the reviewed patch and preserves the compatibility floor', async () => {
  assert.equal((await checkSdkGuidance()).referenceSdk, '1.0.1');
});

test('the guard is red on the frozen raw released-source baseline and green on current files', async t => {
  const fixture = JSON.parse(await readFile(path.join(repositoryRoot, 'tests/fixtures/2026-11-03-sdk-guidance-afd78c4.json')));
  assert.equal(fixture.observedCommit, 'afd78c4ba557bb4e6f5b64465cc1e29834672cdc');
  const violations = sdkGuidanceViolations(new Map(Object.entries(fixture.documents)), await policies());
  for (const file of Object.keys(fixture.documents)) assert.ok(violations.some(row => row.file === file), file);
  assert.ok(violations.length > 0);
  assert.equal((await checkSdkGuidance()).passed, true);
  t.diagnostic(`RED on released afd78c4: ${violations.length} stale claims/metadata findings; GREEN on current tree.`);
});

test('stale SDK prose, installs and source citations fail across plugin-owned surfaces', async t => {
  const documents = await currentSdkDocuments(), policy = await policies();
  const files = ['README.md', 'AGENTS.md', 'source/always-on.md',
    'source/context/sdk-context.mjs', 'plugins/arkiv/scripts/context/sdk-context.mjs',
    'plugins/arkiv-codex/scripts/context/sdk-context.mjs', 'plugins/arkiv-codex/AGENTS.md',
    'plugins/arkiv/evals/arkiv-first-write-trigger/prompt.md',
    'plugins/arkiv/evals/rule-custody-with-block/graders/criteria.md', 'tests/build.test.mjs'];
  const mutations = ['SDK ' + stale, 'npm install @arkiv-network/sdk@' + stale,
    'https://unpkg.com/@arkiv-network/sdk@' + stale + '/src/chains/rabdi.ts'];
  let executed = 0;
  for (const file of files) for (const mutation of mutations) {
    const changed = new Map(documents);changed.set(file, changed.get(file) + '\n' + mutation);
    assert.notEqual(changed.get(file), documents.get(file));
    assert.ok(sdkGuidanceViolations(changed, policy).some(row => row.file === file));executed++;
  }
  assert.equal(executed, files.length * mutations.length);
  for (const file of ['plugin.config.json', 'source/evals-sdk1.lock.json']) {
    const changed = new Map(documents), config = JSON.parse(changed.get(file));config.sdkVersion = stale;
    changed.set(file, JSON.stringify(config));assert.ok(sdkGuidanceViolations(changed, policy).some(row => row.file === file));executed++;
  }
  t.diagnostic(`Executed ${executed} current SDK prose/install/citation/reference-metadata mutations.`);
});

test('dated SDK history stays hash-bound and cannot hide a new current claim', async () => {
  const documents = await currentSdkDocuments(), policy = await policies();
  for (const row of policy[1].historicalSections) {
    const changed = new Map(documents);changed.set(row.file, changed.get(row.file) + '\nSDK ' + stale);
    assert.throws(() => sdkGuidanceViolations(changed, policy), /Historical SDK section changed/);
    const current = new Map(documents);current.set(row.file, 'SDK ' + stale + '\n' + current.get(row.file));
    assert.ok(sdkGuidanceViolations(current, policy).some(v => v.file === row.file));
  }
});

test('the dated README verb context retains its exact reviewed bytes', async () => {
  const lines = (await readFile(path.join(repositoryRoot, 'README.md'), 'utf8')).split('\n');
  const index = lines.findIndex(line => line.includes(['re', 'cords'].join('') + ' public marketplace installations'));
  assert.ok(index >= 2);
  assert.equal(createHash('sha256').update(lines.slice(index - 2, index + 3).join('\n')).digest('hex'),
    'bcec76cf45fe0dd84bb52005b0b6c53245d38c7ca37aa01534e11245224c28f0');
  assert.match(lines.slice(0, index - 2).join('\n'), /Historical README excerpt.*0[.]5[.]2/);
});
