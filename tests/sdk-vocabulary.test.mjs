import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readFile, readdir, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {repositoryRoot} from '../scripts/build-plugin.mjs';
import {checkSdkVocabulary, vocabularyViolations} from '../scripts/check-sdk-vocabulary.mjs';

const retired = ['pay', 'load'].join('');
const oldVersion = [0, 8, 1].join('.');
const retiredAliases = ['encrypt', 'decrypt'].map(prefix => prefix + 'Pay' + 'load');
const legacyLink = `[guide](references/sdk-${retired}.md)`;

async function fixture(t) {
  const root = await mkdtemp(path.join(process.env.ARKIV_TEST_TMP ?? tmpdir(), 'arkiv-vocabulary-'));
  t.after(() => rm(root, {recursive: true}));
  for (const entry of await readdir(repositoryRoot)) {
    if (!['.git', 'node_modules'].includes(entry)) await cp(path.join(repositoryRoot, entry), path.join(root, entry), {recursive: true});
  }
  return root;
}

test('every current surface and path passes the SDK 1.0 vocabulary policy', async () => {
  const result = await checkSdkVocabulary();
  assert.equal(result.passed, true);
  assert.ok(result.names > result.files);
  assert.equal(Object.hasOwn(result, 'temporaryCanonical'), false);
  assert.deepEqual(result.exceptions, []);
  assert.equal(result.historicalFiles.length, 11);
});

test('every content, name, link and code mutation is executed and rejected', async t => {
  const root = await fixture(t);
  assert.equal((await checkSdkVocabulary(root)).passed, true);
  const files = [
    'plugins/arkiv/evals/adversarial-untrusted-entity-data/prompt.md',
    'plugins/arkiv/evals/adversarial-untrusted-entity-data/graders/criteria.md', 'plugins/arkiv/evals/catalog.json',
    'plugins/arkiv/skills/arkiv/SKILL.md', 'plugins/arkiv-codex/skills/arkiv/SKILL.md',
    'plugin.config.json', '.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json',
    'plugins/arkiv/.claude-plugin/plugin.json', 'plugins/arkiv-codex/.codex-plugin/plugin.json',
    'plugins/arkiv/.mcp.json', 'plugins/arkiv-codex/mcp.json',
    'plugins/arkiv/hooks/hooks.json', 'plugins/arkiv-codex/hooks/hooks.json',
    'plugins/arkiv/scripts/context/sdk-context.mjs', 'plugins/arkiv-codex/scripts/context/sdk-context.mjs',
    'plugins/arkiv/scripts/client-headers.mjs', 'source/context/sdk-context.mjs',
    'source/context/context-hook.mjs', 'source/always-on.md', 'source/RULE-SOURCES.md',
    'plugins/arkiv/templates/AGENTS.snippet.md', 'plugins/arkiv-codex/templates/AGENTS.snippet.md',
    'plugins/arkiv/AGENTS.md', 'plugins/arkiv-codex/AGENTS.md',
    'README.md', 'AGENTS.md', 'CHANGELOG.md', 'docs/context-preparation.md',
    'tests/build.test.mjs', 'scripts/build-plugin.mjs', 'package.json', 'source/vocabulary-policy.json'
  ];
  const cases = files.flatMap(file => [[file, `\nlegacy${retired.toUpperCase()}s`], [file, `\nSDK${oldVersion}`]]);
  const other = 'plugins/arkiv/skills/arkiv/SKILL.md';
  cases.push([other, '\n' + legacyLink], [other, '\n`' + legacyLink + '`'],
    [other, '\n```js\nconst text = "' + legacyLink + '";\n```'],
    [other, '\n' + retiredAliases[0]], [other, '\n' + retiredAliases[0] + 'Extra']);
  let executed = 0;
  for (const [file, mutation] of cases) {
    const before = await readFile(path.join(root, file));
    let changed = Buffer.concat([before, Buffer.from(mutation)]);
    if (file.endsWith('.json')) {
      const value = JSON.parse(before);
      if (file === 'source/vocabulary-policy.json') value.historicalLines[0].reason += mutation;
      else value.vocabularyMutation = mutation;
      changed = JSON.stringify(value);
    }
    await writeFile(path.join(root, file), changed);
    try { await assert.rejects(checkSdkVocabulary(root), /Obsolete SDK vocabulary/, file); executed++; }
    finally { await writeFile(path.join(root, file), before); }
  }
  for (const [file, directory] of [[`docs/new-${retired}.md`, false], [`tests/${oldVersion}.json`, false],
    [`plugins/arkiv/evals/${retired}`, true], [`source/${retired}`, true],
    [`plugins/arkiv-codex/scripts/${retired}`, true]]) {
    const absolute = path.join(root, file);
    if (directory) await mkdir(absolute); else await writeFile(absolute, 'clean entity data');
    try { await assert.rejects(checkSdkVocabulary(root), /Obsolete SDK vocabulary/, file); executed++; }
    finally { await rm(absolute, {recursive: directory}); }
  }
  t.diagnostic(`Executed ${executed} content/path mutations, including misplaced link, inline code and fenced code.`);
  assert.equal(executed, 76);
  assert.equal((await checkSdkVocabulary(root)).passed, true);
});

test('a single retired encryption alias fails in every former use site, code and metadata', async t => {
  const root = await fixture(t);
  const files = ['arkiv', 'arkiv-codex'].flatMap(host => [
    'plugins/' + host + '/skills/arkiv-encryption/SKILL.md',
    'plugins/' + host + '/skills/arkiv-security-trust/references/privacy.md']);
  files.push('README.md', 'AGENTS.md', 'source/sdk-vocabulary-exceptions.json', 'source/skills.lock.json');
  let executed = 0;
  for (const file of files) for (const alias of retiredAliases) {
    const absolute = path.join(root, file), before = await readFile(absolute);
    const changed = file.endsWith('.json') ? JSON.stringify({...JSON.parse(before), mutation: alias})
      : Buffer.concat([before, Buffer.from('\n' + alias)]);
    await writeFile(absolute, changed);
    await assert.rejects(checkSdkVocabulary(root), /Obsolete SDK vocabulary|deep-equal/);
    await writeFile(absolute, before); executed++;
  }
  const file = 'plugins/arkiv/skills/arkiv-encryption/SKILL.md';
  for (const body of [legacyLink, '\x60' + legacyLink + '\x60', '\x60\x60\x60js\n"' + legacyLink + '"\n\x60\x60\x60']) {
    const absolute = path.join(root, file), before = await readFile(absolute);
    await writeFile(absolute, Buffer.concat([before, Buffer.from('\n' + body)]));
    await assert.rejects(checkSdkVocabulary(root), /Obsolete SDK vocabulary/);
    await writeFile(absolute, before); executed++;
  }
  const policyFile = path.join(root, 'source/vocabulary-policy.json'), before = await readFile(policyFile);
  await writeFile(policyFile, JSON.stringify({...JSON.parse(before), temporaryCanonical: {}}));
  await assert.rejects(checkSdkVocabulary(root), /deep-equal/); executed++;
  await writeFile(policyFile, before);
  assert.equal(executed, 20);
  t.diagnostic('Executed 16 single-alias mutations, 3 link/code mutations and rejection of a restored waiver.');
});

test('historical receipts are explicitly frozen and cannot absorb new current guidance', async t => {
  const root = await fixture(t);
  const policy = JSON.parse(await readFile(path.join(root, 'source/vocabulary-policy.json')));
  for (const row of policy.historicalFiles) {
    const file = path.join(root, row.file), before = await readFile(file);
    await writeFile(file, Buffer.concat([before, Buffer.from('\n' + retired)]));
    await assert.rejects(checkSdkVocabulary(root), /Historical receipt changed/);
    await writeFile(file, before);
  }
  const file = path.join(root, 'docs/verification.md'), before = await readFile(file, 'utf8');
  await writeFile(file, before.replace('# Verification scope', '# Verification scope\n' + retired));
  await assert.rejects(checkSdkVocabulary(root), /Obsolete SDK vocabulary/);
  await writeFile(file, before + '\n' + retired);
  await assert.rejects(checkSdkVocabulary(root), /Historical section changed/);
  await writeFile(file, before);
  t.diagnostic('Executed all 11 frozen-file mutations and both mixed-document current/history mutations.');
});

test('semantic exception list stays empty and both current encryption names remain valid', async t => {
  const root = await fixture(t);
  const filename = path.join(root, 'source/sdk-vocabulary-exceptions.json');
  const before = await readFile(filename), config = JSON.parse(before);
  assert.deepEqual(config.exceptions, []);
  assert.deepEqual(vocabularyViolations('encryptBytes decryptBytes', 'tests/example.mjs'), []);
  assert.equal(vocabularyViolations(oldVersion, 'tests/example.mjs').length, 1);
  for (const alias of retiredAliases) {
    assert.equal(vocabularyViolations(alias, 'plugins/arkiv/skills/arkiv-encryption/SKILL.md').length, 1);
    const value = JSON.parse(before); value.exceptions.push({symbol: alias, files: ['README.md']});
    await writeFile(filename, JSON.stringify(value));
    await assert.rejects(checkSdkVocabulary(root), /SDK vocabulary exceptions must remain empty/);
    await writeFile(filename, before);
  }
});
