import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp, mkdir, readFile, writeFile, copyFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {repositoryRoot} from '../scripts/build-plugin.mjs';
import {checkSkillImport, checkEvalSuite, checkProcessExpectation} from '../scripts/check-static.mjs';

const scratchRoot = process.env.ARKIV_TEST_TMP ?? tmpdir();
async function fixture(run) {
  await mkdir(scratchRoot, {recursive: true});
  const directory = await mkdtemp(path.join(scratchRoot, 'arkiv-import-regression-'));
  try {
    const lock = JSON.parse(await readFile(path.join(repositoryRoot, 'source/skills.lock.json'), 'utf8'));
    const paths = ['plugin.config.json', 'source/skills.lock.json', ...lock.files.map(file => file.destination)];
    for (const relative of paths) {
      await mkdir(path.dirname(path.join(directory, relative)), {recursive: true});
      await copyFile(path.join(repositoryRoot, relative), path.join(directory, relative));
    }
    return await run(directory, lock);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(scratchRoot));
    assert.ok(path.basename(directory).startsWith('arkiv-import-regression-'));
    await rm(directory, {recursive: true});
  }
}

test('exact fixed-source skill imports and cross references pass', () => fixture(async directory => {
  const result = await checkSkillImport(directory);
  assert.equal(result.skills, 16); assert.equal(result.references, 22);
}));
test('changed imported guidance cannot pass with the old source receipt', () => fixture(async directory => {
  const file = path.join(directory, 'plugins/arkiv/skills/arkiv-query/SKILL.md');
  await writeFile(file, (await readFile(file, 'utf8')) + '\nChanged unreviewed guidance.\n');
  await assert.rejects(checkSkillImport(directory), /Source length changed|Source bytes changed/);
}));
test('a newly added skill cannot silently enter the release without source provenance', () => fixture(async directory => {
  const file = path.join(directory, 'plugins/arkiv/skills/unreviewed/SKILL.md');
  await mkdir(path.dirname(file)); await writeFile(file, '# Unreviewed');
  await assert.rejects(checkSkillImport(directory), /Unexpected or omitted bundled skill files/);
}));
test('a deprecated compatibility stub cannot enter the release', () => fixture(async directory => {
  const file = path.join(directory, 'plugins/arkiv/skills/arkiv-best-practices/SKILL.md');
  await mkdir(path.dirname(file)); await writeFile(file, '# Deprecated');
  await assert.rejects(checkSkillImport(directory), /Unexpected or omitted bundled skill files/);
}));
test('source ref drift fails even when imported files were not changed', () => fixture(async directory => {
  const file = path.join(directory, 'source/skills.lock.json');
  const lock = JSON.parse(await readFile(file, 'utf8')); lock.commit = '0'.repeat(40);
  await writeFile(file, JSON.stringify(lock));
  await assert.rejects(checkSkillImport(directory), /Skills source commit drift/);
}));
test('eval suite preserves original outcomes and explicit negative invocation controls', async () => {
  const result = await checkEvalSuite(repositoryRoot);
  assert.equal(result.cases, 73); assert.equal(result.negatives, 16); assert.equal(result.mockedCases, 3);
  assert.equal(result.originalFiles, 207);
});

const correctedProcessCases = [
  {id: 'arkiv-encryption-outcome', target: 'arkiv-security-trust', neighbors: ['arkiv-encryption', 'arkiv-query', 'arkiv-troubleshooting']},
  {id: 'adversarial-rpc-url', target: 'arkiv-troubleshooting', neighbors: ['arkiv-security-trust', 'arkiv-first-write', 'arkiv-query']},
];
async function processCase(id) {
  const base = path.join(repositoryRoot, 'plugins/arkiv/evals');
  const catalog = JSON.parse(await readFile(path.join(base, 'catalog.json'), 'utf8'));
  const item = catalog.cases.find(item => item.id === id);
  const markdown = await readFile(path.join(base, id, 'graders/process.md'), 'utf8');
  return {item, markdown};
}
for (const {id, target, neighbors} of correctedProcessCases) {
  test(`process expectation ${id} requires its exact canonical skill invocation`, async () => {
    const {item, markdown} = await processCase(id);
    assert.equal(item.processSkill, target);
    const {pattern} = checkProcessExpectation(item, markdown);
    const matcher = new RegExp(pattern);
    assert.equal(matcher.test(JSON.stringify({skill: target})), true);
    assert.equal(matcher.test(JSON.stringify({skill: `arkiv:${target}`, args: 'Explain only.'}, null, 2)), true);
    for (const skill of [...neighbors, `other:${target}`, `${target}-extra`]) {
      assert.equal(matcher.test(JSON.stringify({skill, args: `Mention ${target} without invoking it.`})), false, skill);
    }
    assert.equal(matcher.test(JSON.stringify({args: JSON.stringify({skill: target})})), false);
  });
  test(`process expectation ${id} rejects relaxed graders and missing rationale`, async () => {
    const {item, markdown} = await processCase(id);
    const inputLine = /^input_match: .*$/m;
    for (const altered of [
      markdown.replace(inputLine, `input_match: "${neighbors.join('|')}"`),
      markdown.replace(inputLine, `input_match: "${target}"`),
      markdown.replace('min: 1', 'min: 0'),
      markdown.replace('tool: Skill', 'tool: Read'),
      markdown.replace('arm: with-only', 'arm: both'),
    ]) assert.throws(() => checkProcessExpectation(item, altered));
    assert.throws(() => checkProcessExpectation({...item, rationaleSources: item.rationaleSources.filter(source => source !== 'skills/arkiv/SKILL.md')}, markdown), /Missing canonical router rationale/);
    assert.throws(() => checkProcessExpectation({...item, rationaleSources: item.rationaleSources.filter(source => source !== `skills/${target}/SKILL.md`)}, markdown), /Missing target skill rationale/);
    assert.throws(() => checkProcessExpectation({...item, rationaleSources: [...item.rationaleSources, '../untrusted.md']}, markdown), /Invalid process rationale source/);
  });
}
test('process expectation rationale covers privacy leaks and RPC configuration in canonical guidance', async () => {
  const skill = async name => readFile(path.join(repositoryRoot, 'plugins/arkiv/skills', name, 'SKILL.md'), 'utf8');
  const router = await skill('arkiv');
  const security = await skill('arkiv-security-trust');
  const encryption = await skill('arkiv-encryption');
  const troubleshooting = await skill('arkiv-troubleshooting');
  assert.match(router, /Use `arkiv-security-trust`[\s\S]*before storing sensitive data/);
  assert.match(security, /sensitive payload fields, indexed attributes, wallet addresses and logs/);
  assert.match(security, /Keep access\/signing\/encryption keys out of chat, URLs, logs/);
  assert.match(security, /HMAC indexes[\s\S]*not that package's API/);
  assert.match(encryption, /Use arkiv-security-trust for policy and HMAC index design/);
  assert.match(router, /RPC configuration\/URL validation goes to `arkiv-troubleshooting` first/);
  assert.match(troubleshooting, /Parse the URL as data/);
  assert.match(troubleshooting, /never interpolate it into a shell command/);
  assert.match(troubleshooting, /Static URL validation does not establish chain identity/);
  assert.match(troubleshooting, /A request for explanation alone authorizes no live probe/);
});
