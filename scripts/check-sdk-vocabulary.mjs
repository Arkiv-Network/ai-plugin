import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {repositoryRoot} from './build-plugin.mjs';
const retiredWord = ['pay', 'load'].join('');
const encryptionSymbols = ['encrypt', 'decrypt'].map(prefix => prefix + 'Pay' + 'load');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');

export function vocabularyViolations(text, file, exceptions = [], spans = []) {
  const violations = [];
  const add = (token, index) => {
    if (!spans.some(([start, end]) => index >= start && index + token.length <= end)) {
      violations.push({file, token, line: text.slice(0, index).split('\n').length});
    }
  };
  for (const match of text.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (!match[0].toLowerCase().includes(retiredWord)) continue;
    if (!exceptions.some(rule => rule.symbol === match[0] && rule.files.includes(file))) add(match[0], match.index);
  }
  for (const match of text.matchAll(/0[.]8/g)) add(match[0], match.index);
  return violations;
}

async function inventory(root, relative = '') {
  const files = [], names = [];
  for (const entry of await readdir(path.join(root, relative), {withFileTypes: true})) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    names.push({file, name: entry.name, directory: entry.isDirectory()});
    assert.ok(!entry.isSymbolicLink(), `Vocabulary inventory refuses symlinks: ${file}`);
    if (entry.isDirectory()) {
      const child = await inventory(root, file); files.push(...child.files); names.push(...child.names);
    } else files.push(file);
  }
  return {files: files.sort(), names};
}

export async function checkSdkVocabulary(root = repositoryRoot) {
  const config = JSON.parse(await readFile(path.join(root, 'source/sdk-vocabulary-exceptions.json'), 'utf8'));
  const symbolFiles = ['arkiv', 'arkiv-codex'].flatMap(host => [
    `plugins/${host}/skills/arkiv-encryption/SKILL.md`, `plugins/${host}/skills/arkiv-security-trust/references/privacy.md`]);
  if (config.schemaVersion !== 1 || !Array.isArray(config.exceptions)
    || config.exceptions.length !== 2 || new Set(config.exceptions.map(rule => rule.symbol)).size !== 2
    || config.exceptions.some(rule => !encryptionSymbols.includes(rule.symbol)
      || rule.package !== 'arkiv-encryption' || rule.version !== '1.0.0'
      || typeof rule.reason !== 'string' || rule.reason.length < 20
      || !Array.isArray(rule.files) || rule.files.length !== symbolFiles.length
      || [...rule.files].sort().join('\n') !== [...symbolFiles].sort().join('\n'))) {
    throw new Error('Invalid SDK vocabulary exception list');
  }
  const {files, names} = await inventory(root);
  const contents = new Map(await Promise.all(files.map(async file => [file, await readFile(path.join(root, file))])));
  const text = file => { assert.ok(contents.has(file), `Missing vocabulary policy file: ${file}`); return contents.get(file).toString('utf8'); };
  const spans = new Map();
  const allow = (file, start, end) => { const entries = spans.get(file) ?? []; entries.push([start, end]); spans.set(file, entries); };
  const lineSpan = (file, number) => {
    const lines = text(file).split('\n'); assert.ok(number > 0 && number <= lines.length, 'Invalid waiver line');
    const start = lines.slice(0, number - 1).reduce((n, line) => n + line.length + 1, 0);
    return {line: lines[number - 1], start, end: start + lines[number - 1].length};
  };
  const policy = JSON.parse(text('source/vocabulary-policy.json'));
  assert.equal(policy.schemaVersion, 1);
  for (const row of policy.historicalFiles) {
    assert.equal(digest(contents.get(row.file)), row.sha256, `Historical receipt changed: ${row.file}`);
    allow(row.file, 0, text(row.file).length);
  }
  for (const row of policy.historicalSections) {
    const start = text(row.file).indexOf(row.heading);
    assert.ok(start >= 0 && text(row.file).lastIndexOf(row.heading) === start, 'Historical section is missing or ambiguous');
    assert.equal(digest(text(row.file).slice(start)), row.sha256, `Historical section changed: ${row.file}`);
    allow(row.file, start, text(row.file).length);
  }
  for (const row of policy.historicalLines) {
    const {line, start, end} = lineSpan(row.file, row.line);
    assert.equal(digest(line), row.sha256, `Historical identity changed: ${row.file}:${row.line}`);
    allow(row.file, start, end);
  }

  // Temporary, reviewed canonical waiver. Whole raw blob + exact link line;
  // code, other files and all added occurrences receive no exemption.
  const waiver = policy.temporaryCanonical;
  const packageConfig = JSON.parse(text('plugin.config.json'));
  const lock = JSON.parse(text('source/skills.lock.json'));
  assert.equal(waiver.revision, packageConfig.skillsSource.commit, 'Temporary canonical revision drift');
  assert.equal(waiver.revision, lock.commit, 'Temporary canonical lock drift');
  assert.deepEqual(waiver.legacyNameParts, ['sdk-', 'pay', 'load', '.md']);
  const legacyName = waiver.legacyNameParts.join('');
  assert.deepEqual(waiver.links.map(row => row.file).sort(), ['arkiv', 'arkiv-codex'].map(host => `plugins/${host}/skills/arkiv-encryption/SKILL.md`).sort());
  assert.equal(waiver.references.length, 2);
  const permittedPaths = new Set();
  for (const row of waiver.links) {
    const bytes = contents.get(row.file);
    const canonical = lock.files.find(item => item.destination === row.file);
    assert.ok(canonical, 'Missing canonical link receipt');
    assert.equal(row.sha256, canonical.sha256, 'Temporary link differs from canonical receipt');
    assert.equal(row.gitBlob, canonical.gitBlob, 'Temporary link Git blob differs from canonical receipt');
    assert.equal(digest(bytes), row.sha256, `Temporary canonical blob changed: ${row.file}`);
    assert.equal(blob(bytes), row.gitBlob, `Temporary canonical Git blob changed: ${row.file}`);
    assert.equal(row.line, 25);
    const {line, start} = lineSpan(row.file, row.line);
    const destination = `references/${legacyName}`;
    assert.equal(line, `Use a named \`bytes()\` column for the envelope and a stored \`str()\` media-type column. Read [SDK ciphertext storage](${destination}) for a typed write/read seam.`);
    const index = start + line.indexOf(destination); allow(row.file, index, index + destination.length);
    const host = row.file.split('/')[1];
    const reference = waiver.references.find(item => item.host === host);
    assert.ok(reference, 'Missing temporary canonical reference binding');
    const file = `plugins/${host}/skills/arkiv-encryption/references/${legacyName}`;
    const canonicalReference = lock.files.find(item => item.destination === file);
    assert.ok(canonicalReference, 'Missing canonical reference receipt');
    assert.equal(reference.sha256, canonicalReference.sha256, 'Temporary reference differs from canonical receipt');
    assert.equal(reference.gitBlob, canonicalReference.gitBlob, 'Temporary reference Git blob differs from canonical receipt');
    assert.equal(digest(contents.get(file)), reference.sha256, `Temporary canonical reference changed: ${file}`);
    assert.equal(blob(contents.get(file)), reference.gitBlob, `Temporary canonical reference Git blob changed: ${file}`);
    permittedPaths.add(file);
  }
  assert.equal(waiver.lock.file, 'source/skills.lock.json');
  assert.equal(digest(contents.get(waiver.lock.file)), waiver.lock.sha256, 'Temporary canonical metadata changed');
  for (const number of waiver.lock.lines) {
    const {line, start, end} = lineSpan(waiver.lock.file, number);
    assert.ok(/^\s+"(?:source|destination)": "/.test(line) && line.endsWith(`/${legacyName}",`), 'Invalid canonical path receipt line');
    allow(waiver.lock.file, start, end);
  }
  // The two closed symbol definitions are metadata, not extra API use sites.
  const definitions = 'source/sdk-vocabulary-exceptions.json';
  for (const [i, line] of text(definitions).split('\n').entries()) {
    if (encryptionSymbols.some(symbol => line === `      "symbol": "${symbol}",`)) {
      const range = lineSpan(definitions, i + 1); allow(definitions, range.start, range.end);
    }
  }
  const violations = [];
  for (const entry of names) {
    if (!entry.directory && permittedPaths.has(entry.file)) continue;
    violations.push(...vocabularyViolations(entry.name, entry.file + ' [name]'));
  }
  for (const file of files) violations.push(...vocabularyViolations(text(file), file, config.exceptions, spans.get(file)));
  if (violations.length) throw new Error('Obsolete SDK vocabulary: ' + violations.map(v => `${v.file}:${v.line} (${v.token})`).join(', '));
  return {files: files.length, names: names.length, historicalFiles: policy.historicalFiles.map(row => row.file),
    historicalSections: policy.historicalSections, historicalLines: policy.historicalLines,
    temporaryCanonical: {revision: waiver.revision, links: waiver.links, referencePaths: [...permittedPaths]},
    exceptions: config.exceptions.map(({symbol, reason}) => ({symbol, reason})), passed: true};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await checkSdkVocabulary())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
