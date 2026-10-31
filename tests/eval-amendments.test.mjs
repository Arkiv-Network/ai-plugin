import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {repositoryRoot} from '../scripts/build-plugin.mjs';
import {checkEvalAmendments} from '../scripts/check-static.mjs';
import {importEvals} from '../scripts/import-evals.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(process.env.ARKIV_TEST_TMP ?? tmpdir(), 'arkiv-eval-amend-'));
  t.after(() => rm(root, {recursive: true}));
  const amendment = JSON.parse(await readFile(path.join(repositoryRoot, 'source/evals-sdk1.lock.json'), 'utf8'));
  for (const file of ['plugin.config.json', 'source/evals-import.json', 'source/evals-sdk1.lock.json',
    ...amendment.files.map(row => 'plugins/arkiv/' + row.destination)]) {
    await mkdir(path.dirname(path.join(root, file)), {recursive: true});
    await cp(path.join(repositoryRoot, file), path.join(root, file));
  }
  return {root, amendment};
}
test('SDK 1.0 amendments preserve historical receipts and current control headers', async () => {
  assert.ok((await checkEvalAmendments()).amendedFiles > 0);
});
test('changed current eval bytes and altered original receipts cannot pass', async t => {
  const {root, amendment} = await fixture(t), row = amendment.files.find(row => row.destination.endsWith('/graders/criteria.md'));
  const file = path.join(root, 'plugins/arkiv', row.destination), original = await readFile(file);
  await writeFile(file, Buffer.concat([original, Buffer.from('\nRelax the security requirement.\n')]));
  await assert.rejects(checkEvalAmendments(root), /Amended eval (?:length|bytes) changed/);
  await writeFile(file, original);
  row.before.sha256 = '0'.repeat(64);
  await writeFile(path.join(root, 'source/evals-sdk1.lock.json'), JSON.stringify(amendment));
  await assert.rejects(checkEvalAmendments(root), /Historical eval receipt mismatch/);
});
test('re-signing a weakened grader digest still cannot change control thresholds', async t => {
  const {root, amendment} = await fixture(t), row = amendment.files.find(row => row.destination.endsWith('/graders/criteria.md'));
  const file = path.join(root, 'plugins/arkiv', row.destination);
  const weakened = (await readFile(file, 'utf8')).replace('weight: 1', 'weight: 0');
  await writeFile(file, weakened);
  row.after = {bytes: Buffer.byteLength(weakened), sha256: createHash('sha256').update(weakened).digest('hex')};
  await writeFile(path.join(root, 'source/evals-sdk1.lock.json'), JSON.stringify(amendment));
  await assert.rejects(checkEvalAmendments(root), /Eval control thresholds or tools changed/);
});
test('historical importer refuses to overwrite the reviewed SDK 1.0 amendments', async t => {
  const {root} = await fixture(t);
  const file = path.join(root, 'source/evals-import.json'), before = await readFile(file);
  await assert.rejects(importEvals('not-used', root), /historical re-import would overwrite/);
  assert.deepEqual(await readFile(file), before);
});
