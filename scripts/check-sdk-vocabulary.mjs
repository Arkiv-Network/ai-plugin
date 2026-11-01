import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {repositoryRoot} from './build-plugin.mjs';
const retiredWord = ['pay', 'load'].join('');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export function vocabularyViolations(text, file, spans = []) {
  const violations = [];
  const add = (token, index) => {
    if (!spans.some(([start, end]) => index >= start && index + token.length <= end)) {
      violations.push({file, token, line: text.slice(0, index).split('\n').length});
    }
  };
  for (const match of text.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (!match[0].toLowerCase().includes(retiredWord)) continue;
    add(match[0], match.index);
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
  assert.deepEqual(Object.keys(config).sort(), ['exceptions', 'schemaVersion']);
  assert.equal(config.schemaVersion, 1);
  assert.deepEqual(config.exceptions, [], 'SDK vocabulary exceptions must remain empty');
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
  assert.deepEqual(Object.keys(policy).sort(), ['historicalFiles', 'historicalLines', 'historicalSections', 'schemaVersion']);
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

  const violations = [];
  for (const entry of names) {
    violations.push(...vocabularyViolations(entry.name, entry.file + ' [name]'));
  }
  for (const file of files) violations.push(...vocabularyViolations(text(file), file, spans.get(file)));
  if (violations.length) throw new Error('Obsolete SDK vocabulary: ' + violations.map(v => `${v.file}:${v.line} (${v.token})`).join(', '));
  return {files: files.length, names: names.length, historicalFiles: policy.historicalFiles.map(row => row.file),
    historicalSections: policy.historicalSections, historicalLines: policy.historicalLines,
    exceptions: [], passed: true};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await checkSdkVocabulary())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
