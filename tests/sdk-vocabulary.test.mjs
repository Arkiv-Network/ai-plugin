import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readFile, readdir, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {repositoryRoot} from '../scripts/build-plugin.mjs';
import {checkSdkVocabulary, vocabularyViolations} from '../scripts/check-sdk-vocabulary.mjs';

const retired = ['pay', 'load'].join('');
const oldVersion = [0, 8, 1].join('.');
const symbols = ['encrypt', 'decrypt'].map(prefix => prefix + 'Pay' + 'load');
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
  assert.equal(result.temporaryCanonical.links.length, 2);
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
    [other, '\n' + symbols[0]], [other, '\n' + symbols[0] + 'Extra']);
  let executed = 0;
  for (const [file, mutation] of cases) {
    const before = await readFile(path.join(root, file));
    const changed = file.endsWith('.json')
      ? JSON.stringify({...JSON.parse(before), vocabularyMutation: mutation})
      : Buffer.concat([before, Buffer.from(mutation)]);
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

test('temporary canonical waiver binds exact files, line and raw blob; code remains checked', async t => {
  const root = await fixture(t);
  const file = 'plugins/arkiv/skills/arkiv-encryption/SKILL.md';
  const before = await readFile(path.join(root, file));
  for (const replacement of ['\n' + legacyLink, '\n`' + legacyLink + '`', '\n```js\n"' + legacyLink + '"\n```']) {
    await writeFile(path.join(root, file), Buffer.concat([before, Buffer.from(replacement)]));
    await assert.rejects(checkSdkVocabulary(root), /Temporary canonical blob changed/);
    await writeFile(path.join(root, file), before);
  }
  for (const code of [legacyLink, '`' + legacyLink + '`', '```\n' + legacyLink + '\n```']) {
    assert.ok(vocabularyViolations(code, file).length, 'Unbound raw text always fails, including code');
  }
  const policyFile = path.join(root, 'source/vocabulary-policy.json');
  const original = await readFile(policyFile);
  for (const change of [policy => { policy.temporaryCanonical.links[0].line++; },
    policy => { policy.temporaryCanonical.links[0].sha256 = '0'.repeat(64); },
    policy => { policy.temporaryCanonical.links[0].gitBlob = '0'.repeat(40); },
    policy => { policy.temporaryCanonical.links[0].file = 'plugins/arkiv/skills/arkiv/SKILL.md'; },
    policy => { policy.temporaryCanonical.revision = '0'.repeat(40); }]) {
    const policy = JSON.parse(original); change(policy); await writeFile(policyFile, JSON.stringify(policy));
    await assert.rejects(checkSdkVocabulary(root));
    await writeFile(policyFile, original);
  }
  t.diagnostic('Executed 3 canonical-file text mutations, 3 raw link/code checks and 5 waiver-binding mutations.');
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

test('exact published symbols are scoped; gate source and negative fixtures contain no literal old terms', async t => {
  const root = await fixture(t);
  const filename = path.join(root, 'source/sdk-vocabulary-exceptions.json');
  const before = await readFile(filename), config = JSON.parse(before);
  assert.deepEqual(config.exceptions.map(row => row.symbol).sort(), [...symbols].sort());
  for (const rule of config.exceptions) assert.ok(rule.reason.length >= 20);
  assert.deepEqual(vocabularyViolations(symbols.join(' '), 'plugins/arkiv/skills/arkiv-encryption/SKILL.md', config.exceptions), []);
  assert.equal(vocabularyViolations(symbols[0], 'tests/example.mjs', config.exceptions).length, 1);
  assert.equal(vocabularyViolations(oldVersion, 'tests/example.mjs').length, 1);
  for (const change of [value => value.exceptions.push({...value.exceptions[0], symbol: retired}),
    value => value.exceptions[0].files.push('tests/example.mjs'),
    value => { value.exceptions[0].symbol += 'Extra'; }]) {
    const value = JSON.parse(before); change(value); await writeFile(filename, JSON.stringify(value));
    await assert.rejects(checkSdkVocabulary(root), /Invalid SDK vocabulary exception list/);
    await writeFile(filename, before);
  }
});
