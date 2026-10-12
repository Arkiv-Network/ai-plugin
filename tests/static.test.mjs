import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp, mkdir, readFile, writeFile, copyFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {repositoryRoot} from '../scripts/build-plugin.mjs';
import {checkSkillImport, checkEvalSuite} from '../scripts/check-static.mjs';

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
