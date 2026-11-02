import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, copyFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {repositoryRoot} from '../scripts/build-plugin.mjs';
import {checkSkillImport} from '../scripts/check-static.mjs';

const revision = '2bbf731d80c7d8ab201f35f3236ffa800e0044d7';
// SHA-256 of the existing importer output, verified against raw Git blobs at
// the reviewed revision. Re-signing a local lock cannot redefine that source.
const lockDigest = '9c5b022e2d7367dc74a0a45c4301d202f4529407035f9c771774fea89b70bc13';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const rowFiles = ['arkiv', 'arkiv-codex'].flatMap(host => [
  `plugins/${host}/skills/arkiv-troubleshooting/SKILL.md`,
  `plugins/${host}/skills/arkiv-troubleshooting/references/error-catalog.md`
]);

function logWindowRow(markdown, file) {
  const row = markdown.split('\n').find(line => line.startsWith('| `golemdb segment_range_of(transactions): NotImplemented`'));
  assert.ok(row, `Rabdi log-window troubleshooting row missing: ${file}`);
  for (const required of [/-32603 on `eth_getLogs`/, /about 1,000 blocks .*behind head/,
    /Do not split or retry the range/, /A live tail at head works/,
    /recreate the watcher at head/, /reconcile current state with an `arkiv_query` or SDK query/,
    /No log backfill or catch-up is available across that gap/,
    /per-transaction `eth_getTransactionReceipt`/, /Arkiv-Network\/arkiv\/issues\/283/]) {
    assert.match(row, required, `Rabdi log-window correction weakened: ${file}`);
  }
  return row;
}

async function checkPinnedLogGuidance(root = repositoryRoot) {
  const config = JSON.parse(await readFile(path.join(root, 'plugin.config.json')));
  const lockBytes = await readFile(path.join(root, 'source/skills.lock.json'));
  const lock = JSON.parse(lockBytes);
  assert.equal(config.skillsSource.commit, revision, 'Reviewed skills revision changed');
  assert.equal(lock.commit, revision, 'Reviewed skills lock revision changed');
  for (const file of rowFiles) logWindowRow(await readFile(path.join(root, file), 'utf8'), file);
  assert.equal(digest(lockBytes), lockDigest, 'Reviewed raw-Git import manifest changed');
  return checkSkillImport(root);
}

async function fixture(t) {
  const root = await mkdtemp(path.join(process.env.ARKIV_TEST_TMP ?? tmpdir(), 'arkiv-log-window-'));
  t.after(() => rm(root, {recursive: true}));
  const lock = JSON.parse(await readFile(path.join(repositoryRoot, 'source/skills.lock.json')));
  for (const file of ['plugin.config.json', 'source/skills.lock.json', ...lock.files.map(row => row.destination)]) {
    await mkdir(path.dirname(path.join(root, file)), {recursive: true});
    await copyFile(path.join(repositoryRoot, file), path.join(root, file));
  }
  return {root, lock};
}

test('both hosts match the reviewed log-window skills source and retain both troubleshooting rows', async () => {
  assert.ok((await checkPinnedLogGuidance()).importedFiles > 0);
});

test('every imported destination rejects a one-byte change against the reviewed source', async t => {
  const {root, lock} = await fixture(t);
  await checkPinnedLogGuidance(root);
  let executed = 0;
  for (const row of lock.files) {
    const file = path.join(root, row.destination), before = await readFile(file);
    await writeFile(file, Buffer.concat([before, Buffer.from('\n')]));
    try {
      await assert.rejects(checkPinnedLogGuidance(root), /Source (?:length|bytes) changed/, row.destination);
      executed++;
    } finally { await writeFile(file, before); }
  }
  assert.equal(executed, lock.files.length);
  t.diagnostic(`Executed ${executed} raw-source byte mutations across every imported destination.`);
});

test('removing or weakening either troubleshooting row fails independently of its byte receipt', async t => {
  let executed = 0;
  for (const file of rowFiles) {
    const original = await readFile(path.join(repositoryRoot, file), 'utf8');
    const row = logWindowRow(original, file);
    const mutations = ['', row.replace('-32603', '-32000'), row.replace('eth_getLogs', 'other_method'),
      row.replace('about 1,000 blocks (~30 min) behind head', 'older blocks'),
      row.replace('Do not split or retry the range.', 'Retry smaller ranges.'),
      row.replace('A live tail at head works;', ''), row.replace('recreate the watcher at head', 'keep the old watcher'),
      row.replace('reconcile current state with an `arkiv_query` or SDK query', 'wait for events'),
      row.replace('No log backfill or catch-up is available across that gap.', 'Backfill the gap.'),
      row.replace('per-transaction `eth_getTransactionReceipt`', 'a range request'),
      row.replace('Arkiv-Network/arkiv/issues/283', 'example.invalid')];
    for (const mutation of mutations) {
      const changed = original.replace(row, mutation);
      assert.notEqual(changed, original, 'Mutation must execute');
      assert.throws(() => logWindowRow(changed, file), /Rabdi log-window/); executed++;
    }
  }
  assert.equal(executed, rowFiles.length * 11);
  t.diagnostic(`Executed ${executed} missing-row and weakened-recovery mutations on both hosts.`);
});

test('re-signing host bytes and the lock cannot hide source or troubleshooting regressions', async t => {
  const {root, lock} = await fixture(t);
  const originalLock = await readFile(path.join(root, 'source/skills.lock.json'));
  for (const relative of ['skills/arkiv/SKILL.md', 'skills/arkiv-troubleshooting/references/error-catalog.md']) {
    const originals = [];
    for (const host of ['arkiv', 'arkiv-codex']) {
      const destination = `plugins/${host}/${relative}`, file = path.join(root, destination);
      const before = await readFile(file), text = before.toString('utf8'); originals.push({file, before});
      const changed = relative.endsWith('error-catalog.md') ? text.replace(logWindowRow(text, file) + '\n', '') : text + '\nChanged canonical guidance.\n';
      assert.notEqual(changed, text, 'Re-signed mutation must execute');
      await writeFile(file, changed);
      const row = lock.files.find(row => row.destination === destination);
      row.bytes = Buffer.byteLength(changed); row.sha256 = digest(changed);
      row.gitBlob = createHash('sha1').update(Buffer.from(`blob ${row.bytes}\0`)).update(changed).digest('hex');
    }
    await writeFile(path.join(root, 'source/skills.lock.json'), JSON.stringify(lock, null, 2) + '\n');
    await assert.rejects(checkPinnedLogGuidance(root), /Reviewed raw-Git import manifest changed|Rabdi log-window/);
    for (const {file, before} of originals) await writeFile(file, before);
    Object.assign(lock, JSON.parse(originalLock));
    await writeFile(path.join(root, 'source/skills.lock.json'), originalLock);
  }
  await checkPinnedLogGuidance(root);
  t.diagnostic('Executed 2 re-signed two-host/lock regressions; canonical source and row guards rejected both.');
});
