import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {repositoryRoot, validateConfig} from './build-plugin.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
export function git(source, args) {
  return execFileSync('git', ['-C', source, ...args], {maxBuffer: 8 * 1024 * 1024, timeout: 30_000});
}
export async function diskFiles(root, relative) {
  const output = [];
  let entries;
  try { entries = await readdir(path.join(root, relative), {withFileTypes: true}); }
  catch (error) { if (error.code === 'ENOENT') return output; throw error; }
  for (const entry of entries) {
    const file = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not supported: ${file}`);
    if (entry.isDirectory()) output.push(...await diskFiles(root, file));
    else if (entry.isFile()) output.push(file);
    else throw new Error(`Unexpected file type: ${file}`);
  }
  return output.sort();
}

export async function syncSkills(source, check = false, root = repositoryRoot) {
  const config = validateConfig(JSON.parse(await readFile(path.join(root, 'plugin.config.json'), 'utf8')));
  const revision = config.skillsSource.commit;
  const actualRevision = git(source, ['rev-parse', `${revision}^{commit}`]).toString('utf8').trim();
  if (actualRevision !== revision) throw new Error('Skills revision must be the exact full commit');
  const rows = git(source, ['ls-tree', '-r', revision, '--', 'skills']).toString('utf8').trim().split('\n');
  const files = [], bytesByFile = new Map();
  for (const row of rows) {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t(skills\/([^/]+)\/.+)$/.exec(row);
    if (!match) throw new Error(`Unsupported source tree entry: ${row}`);
    const [, , gitBlob, relative, skill] = match;
    if (config.skillsSource.excludedSkills.includes(skill)) continue;
    if (relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid source path');
    const bytes = git(source, ['show', `${revision}:${relative}`]);
    for (const bundle of ['arkiv', 'arkiv-codex']) {
      const destination = `plugins/${bundle}/${relative}`;
      files.push({source: relative, destination, gitBlob, sha256: digest(bytes), bytes: bytes.length});
      bytesByFile.set(destination, bytes);
    }
  }
  const referenceChecker = 'scripts/check-skill-references.mjs';
  const checkerBytes = git(source, ['show', `${revision}:${referenceChecker}`]);
  files.push({source: referenceChecker, destination: referenceChecker,
    gitBlob: git(source, ['rev-parse', `${revision}:${referenceChecker}`]).toString('utf8').trim(),
    sha256: digest(checkerBytes), bytes: checkerBytes.length});
  bytesByFile.set(referenceChecker, checkerBytes);
  files.sort((a, b) => a.source.localeCompare(b.source, 'en') || a.destination.localeCompare(b.destination, 'en'));
  const lock = {schemaVersion: 2, repository: config.skillsSource.repository, commit: revision,
    excludedSkills: config.skillsSource.excludedSkills, files};
  const expectedPaths = [...bytesByFile.keys()].sort();
  const actualPaths = (await Promise.all(['arkiv', 'arkiv-codex'].map(bundle => diskFiles(root, `plugins/${bundle}/skills`)))).flat();
  const extras = actualPaths.filter(file => !expectedPaths.includes(file));
  if (extras.length) throw new Error(`Unexpected bundled files; review before retiring: ${extras.join(', ')}`);
  const changed = [];
  for (const [relative, expected] of bytesByFile) {
    const file = path.join(root, relative);
    let current;
    try { current = await readFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (current?.equals(expected)) continue;
    changed.push(relative);
    if (!check) { await mkdir(path.dirname(file), {recursive: true}); await writeFile(file, expected); }
  }
  const lockFile = path.join(root, 'source/skills.lock.json'), expectedLock = json(lock);
  let oldLock;
  try { oldLock = await readFile(lockFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (oldLock !== expectedLock) {
    changed.push('source/skills.lock.json');
    if (!check) { await mkdir(path.dirname(lockFile), {recursive: true}); await writeFile(lockFile, expectedLock); }
  }
  if (check && changed.length) throw new Error(`Imported skills differ from fixed source: ${changed.join(', ')}`);
  return {commit: revision, files: files.length, skills: files.filter(file => file.source.endsWith('/SKILL.md')).length,
    changed: changed.length, checked: check};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || !['--write', '--check'].includes(args[1])) {
      throw new Error('Usage: node scripts/sync-skills.mjs <local-canonical-skills-repository> --write|--check');
    }
    console.log(JSON.stringify(await syncSkills(path.resolve(args[0]), args[1] === '--check')));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
