import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {repositoryRoot} from '../scripts/build-plugin.mjs';
import {checkSdkVocabulary, vocabularyViolations} from '../scripts/check-sdk-vocabulary.mjs';

test('evals, canonical skills and release manifests use SDK 1.0 vocabulary', async () => {
  assert.equal((await checkSdkVocabulary()).passed, true);
});

test('vocabulary guard rejects mutations across every guarded surface and retains exact exceptions', async t => {
  const root = await mkdtemp(path.join(process.env.ARKIV_TEST_TMP ?? tmpdir(), 'arkiv-vocabulary-'));
  t.after(() => rm(root, {recursive: true}));
  for (const file of ['source/sdk-vocabulary-exceptions.json', 'plugin.config.json', 'plugins/arkiv/.mcp.json',
    'plugins/arkiv-codex/mcp.json', 'plugins/arkiv/skills', 'plugins/arkiv-codex/skills', '.claude-plugin',
    '.agents/plugins', 'plugins/arkiv/.claude-plugin', 'plugins/arkiv-codex/.codex-plugin']) {
    await mkdir(path.dirname(path.join(root, file)), {recursive: true});
    await cp(path.join(repositoryRoot, file), path.join(root, file), {recursive: true});
  }
  const evals = 'plugins/arkiv/evals';
  for (const [file, body] of [['case/prompt.md', 'Explain untrusted entity data.'], ['case/graders/criteria.md', 'Never disclose secrets.'],
    ['catalog.json', '{"cases":[{"id":"untrusted-entity-data"}]}']]) {
    await mkdir(path.dirname(path.join(root, evals, file)), {recursive: true});
    await writeFile(path.join(root, evals, file), body);
  }
  assert.equal((await checkSdkVocabulary(root)).passed, true);
  const cases = [
    [evals + '/case/prompt.md', '\npayload'], [evals + '/case/graders/criteria.md', '\nUntrusted Payloads'],
    [evals + '/catalog.json', 'payload'], ['plugins/arkiv/skills/arkiv/SKILL.md', '\nlegacyPayload'],
    ['plugins/arkiv-codex/skills/arkiv/SKILL.md', '\nSDK0.8.1'], ['plugin.config.json', '0.8'],
    ['.claude-plugin/marketplace.json', 'payload'], ['.agents/plugins/marketplace.json', '0.8.x'],
    ['plugins/arkiv/.claude-plugin/plugin.json', 'payload'], ['plugins/arkiv-codex/.codex-plugin/plugin.json', '0.8.1'],
    ['plugins/arkiv/.mcp.json', 'payload'], ['plugins/arkiv-codex/mcp.json', '0.8.1'],
    ['plugins/arkiv/skills/arkiv-encryption/SKILL.md', '\n`encryptPayloadExtra`'],
    ['plugins/arkiv/skills/arkiv-encryption/SKILL.md', '\n[payload](references/sdk-payload.md)'],
    ['plugins/arkiv/skills/arkiv-encryption/SKILL.md', '\n[guide](references/payload.md)']
  ];
  for (const [file, mutation] of cases) {
    const before = await readFile(path.join(root, file));
    await writeFile(path.join(root, file), Buffer.concat([before, Buffer.from(mutation)]));
    await assert.rejects(checkSdkVocabulary(root), /Obsolete SDK vocabulary/, file);
    await writeFile(path.join(root, file), before);
  }
  const exceptionFile = path.join(root, 'source/sdk-vocabulary-exceptions.json');
  const exceptions = JSON.parse(await readFile(exceptionFile, 'utf8'));
  assert.deepEqual(exceptions.exceptions.map(rule => rule.symbol).sort(), ['decryptPayload', 'encryptPayload']);
  for (const rule of exceptions.exceptions) assert.ok(rule.reason.length >= 20);
  const allowed = 'plugins/arkiv/skills/arkiv-encryption/SKILL.md';
  assert.deepEqual(vocabularyViolations('encryptPayload decryptPayload', allowed, exceptions.exceptions), []);
  assert.equal(vocabularyViolations('encryptPayload', evals + '/case/prompt.md', exceptions.exceptions).length, 1);
  exceptions.exceptions.push({...exceptions.exceptions[0], symbol: 'payload'});
  await writeFile(exceptionFile, JSON.stringify(exceptions));
  await assert.rejects(checkSdkVocabulary(root), /Invalid SDK vocabulary exception list/);
});
