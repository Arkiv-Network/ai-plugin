import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cp, mkdir, mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {repositoryRoot} from '../scripts/build-plugin.mjs';
import {checkWriteSignatureRequirement, checkEvalAmendments} from '../scripts/check-static.mjs';

const file = 'plugins/arkiv/evals/arkiv-first-write-trigger/graders/criteria.md';
const required = 'Before every new signature (including the single allowed retry), obtain a fresh nonce at latest and current gasPrice via eth_gasPrice under exclusive signer custody.';
const failure = /Every-signature requirement missing/;

test('first-write grader requires fresh latest nonce and current network gas price on every signature', async () => {
  assert.equal(checkWriteSignatureRequirement(await readFile(path.join(repositoryRoot, file), 'utf8')), true);
});

test('removing signature scope, freshness, methods or custody fails even when retry wording remains', () => {
  const mutations = [
    required.replace('every new signature', 'the retry signature'),
    required.replace(' (including the single allowed retry)', ''),
    required.replace('fresh nonce', 'nonce'),
    required.replace(' at latest', ''),
    required.replace('current gasPrice', 'gasPrice'),
    required.replace(' via eth_gasPrice', ''),
    required.replace(' under exclusive signer custody', ''),
    'Before every new signature, run a fresh exact unsigned estimate at latest; stop on estimation errors.',
    ''
  ];
  for (const mutation of mutations) {
    assert.throws(() => checkWriteSignatureRequirement(mutation + '\nFor that retry refresh nonce and gasPrice under exclusive signer custody.'), failure);
  }
  assert.equal(mutations.length, 9);
});

test('a re-signed amendment cannot erase the initial-signature requirement or move it to retry only', async t => {
  const root = await mkdtemp(path.join(process.env.ARKIV_TEST_TMP ?? tmpdir(), 'arkiv-signature-'));
  t.after(() => rm(root, {recursive: true}));
  const amendment = JSON.parse(await readFile(path.join(repositoryRoot, 'source/evals-sdk1.lock.json')));
  for (const file of ['plugin.config.json', 'source/evals-import.json', 'source/evals-sdk1.lock.json',
    ...amendment.files.map(row => 'plugins/arkiv/' + row.destination)]) {
    await mkdir(path.dirname(path.join(root, file)), {recursive: true});
    await cp(path.join(repositoryRoot, file), path.join(root, file));
  }
  const original = await readFile(path.join(repositoryRoot, file), 'utf8');
  const row = amendment.files.find(row => row.destination === 'evals/arkiv-first-write-trigger/graders/criteria.md');
  for (const replacement of ['', required.replace('Before every new signature', 'For that retry signature'), required.replace(' at latest', '')]) {
    const changed = original.replace(required, replacement);
    assert.notEqual(changed, original, 'Mutation must execute');
    await writeFile(path.join(root, file), changed);
    row.after = {bytes: Buffer.byteLength(changed), sha256: createHash('sha256').update(changed).digest('hex')};
    await writeFile(path.join(root, 'source/evals-sdk1.lock.json'), JSON.stringify(amendment));
    await assert.rejects(checkEvalAmendments(root), failure);
  }
  t.diagnostic('Executed 9 sentence mutations and 3 re-signed amendment mutations.');
});
