import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {repositoryRoot, generate, validateConfig} from './build-plugin.mjs';
import {diskFiles} from './sync-skills.mjs';
import {checkSkillReferences} from './check-skill-references.mjs';
import {checkSdkVocabulary} from './check-sdk-vocabulary.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
function frontmatter(text) {
  const match = /^---\r?\n([\s\S]+?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) throw new Error('Missing Markdown frontmatter');
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const row = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!row) continue;
    const [, key, value] = row;
    if (Object.hasOwn(values, key)) throw new Error(`Duplicate frontmatter key: ${key}`);
    values[key] = value;
  }
  return values;
}

export function checkProcessExpectation(item, markdown) {
  assert.ok(/^arkiv(?:-[a-z0-9]+)*$/.test(item.processSkill ?? ''), `Invalid process skill: ${item.id}`);
  assert.ok(Array.isArray(item.rationaleSources), `Missing process rationale sources: ${item.id}`);
  assert.equal(new Set(item.rationaleSources).size, item.rationaleSources.length, `Duplicate process rationale source: ${item.id}`);
  for (const source of item.rationaleSources) {
    assert.ok(/^skills\/[a-z0-9-]+\/SKILL\.md$/.test(source), `Invalid process rationale source: ${item.id}`);
  }
  assert.ok(item.rationaleSources.includes('skills/arkiv/SKILL.md'), `Missing canonical router rationale: ${item.id}`);
  assert.ok(item.rationaleSources.includes(`skills/${item.processSkill}/SKILL.md`), `Missing target skill rationale: ${item.id}`);
  const process = frontmatter(markdown);
  const pattern = `"skill"\\s*:\\s*"(?:arkiv:)?${item.processSkill}"`;
  assert.equal(process.type, 'tool_used', `Invalid process grader type: ${item.id}`);
  assert.equal(process.tool, 'Skill', `Invalid process tool: ${item.id}`);
  assert.equal(process.arm, 'with-only', `Invalid process arm: ${item.id}`);
  assert.equal(process.weight, '1', `Invalid process weight: ${item.id}`);
  assert.equal(process.min, '1', `Invalid process minimum: ${item.id}`);
  assert.equal(process.input_match, JSON.stringify(pattern), `Process skill expectation drift: ${item.id}`);
  return {skill: item.processSkill, pattern};
}

export async function checkSkillImport(root = repositoryRoot) {
  const config = validateConfig(await json(path.join(root, 'plugin.config.json')));
  const lock = await json(path.join(root, 'source/skills.lock.json'));
  assert.equal(lock.commit, config.skillsSource.commit, 'Skills source commit drift');
  assert.equal(lock.repository, config.skillsSource.repository, 'Skills source repository drift');
  assert.deepEqual(lock.excludedSkills, config.skillsSource.excludedSkills);
  const actual = await diskFiles(root, 'plugins/arkiv/skills');
  const expected = lock.files.filter(file => file.destination.startsWith('plugins/arkiv/skills/')).map(file => file.destination).sort();
  assert.deepEqual(actual, expected, 'Unexpected or omitted bundled skill files');
  const codexActual = await diskFiles(root, 'plugins/arkiv-codex/skills');
  const codexExpected = lock.files.filter(file => file.destination.startsWith('plugins/arkiv-codex/skills/')).map(file => file.destination).sort();
  assert.deepEqual(codexActual, codexExpected, 'Unexpected or omitted Codex skill files');
  assert.deepEqual(codexActual.map(file => file.replace('arkiv-codex/', 'arkiv/')), actual, 'Host skill inventories differ');
  for (const file of expected) {
    assert.deepEqual(await readFile(path.join(root, file)), await readFile(path.join(root, file.replace('plugins/arkiv/', 'plugins/arkiv-codex/'))), `Source bytes changed: host skill parity ${file}`);
  }
  for (const file of lock.files) {
    assert.ok(/^[0-9a-f]{40}$/.test(file.gitBlob), 'Invalid Git blob identity');
    assert.ok(!file.source.includes('..') && !file.destination.includes('..'), 'Invalid source path');
    const bytes = await readFile(path.join(root, file.destination));
    assert.equal(bytes.length, file.bytes, `Source length changed: ${file.destination}`);
    assert.equal(digest(bytes), file.sha256, `Source bytes changed: ${file.destination}`);
  }
  const skills = actual.filter(file => /\/SKILL\.md$/.test(file));
  assert.ok(skills.length > 0);
  assert.ok(!actual.some(file => file.includes('/arkiv-best-practices/')), 'Deprecated entrypoint must be absent');
  const refs = await checkSkillReferences(path.join(root, 'plugins/arkiv'));
  assert.equal(refs.passed, true, JSON.stringify(refs.failures));
  const codexRefs = await checkSkillReferences(path.join(root, 'plugins/arkiv-codex'));
  assert.equal(codexRefs.passed, true, JSON.stringify(codexRefs.failures));
  return {skills: skills.length, importedFiles: lock.files.length, references: refs.references};
}

export function evalControlDigest(text) {
  const match = /^---\r?\n([\s\S]+?)\r?\n---(?:\r?\n|$)/.exec(text);
  return match ? digest(match[1].replace(/\r\n/g, '\n').replace(/^append_system_prompt:.*(?:\n|$)/m, '')) : null;
}

export async function checkEvalAmendments(root = repositoryRoot) {
  const originalBytes = await readFile(path.join(root, 'source/evals-import.json'));
  const imported = JSON.parse(originalBytes);
  const amendment = await json(path.join(root, 'source/evals-sdk1.lock.json'));
  const config = await json(path.join(root, 'plugin.config.json'));
  assert.equal(amendment.schemaVersion, 1);
  assert.equal(amendment.sourceReceiptSha256, digest(originalBytes), 'Historical eval receipt changed');
  assert.equal(amendment.sourceCommit, imported.commit);
  assert.equal(amendment.activeSkillsCommit, config.skillsSource.commit);
  assert.equal(amendment.sdkVersion, '1.0.0'); assert.equal(amendment.network, 'rabdi');
  assert.ok(Array.isArray(amendment.files) && amendment.files.length > 0);
  const sources = new Map(), destinations = new Set();
  for (const row of amendment.files) {
    for (const field of ['source', 'destination']) assert.ok(row[field].startsWith('evals/') && !row[field].includes('..'), 'Invalid amended eval path');
    assert.ok(!sources.has(row.source) && !destinations.has(row.destination), 'Duplicate amended eval');
    sources.set(row.source, row); destinations.add(row.destination);
    assert.ok(typeof row.reason === 'string' && row.reason.length >= 12);
    assert.match(row.before.sha256, /^[a-f0-9]{64}$/); assert.ok(row.before.bytes > 0);
    const original = imported.imported.find(file => file.source === row.source);
    if (original) {
      assert.equal(row.before.sha256, original.sha256, 'Historical eval receipt mismatch');
      assert.equal(row.before.bytes, original.bytes, 'Historical eval receipt mismatch');
    }
    const bytes = await readFile(path.join(root, 'plugins/arkiv', row.destination));
    assert.equal(bytes.length, row.after.bytes, `Amended eval length changed: ${row.destination}`);
    assert.equal(digest(bytes), row.after.sha256, `Amended eval bytes changed: ${row.destination}`);
    assert.equal(evalControlDigest(bytes.toString('utf8')), row.before.controlsSha256,
      `Eval control thresholds or tools changed: ${row.destination}`);
  }
  return {imported, sources, amendedFiles: amendment.files.length};
}

export async function checkEvalSuite(root = repositoryRoot) {
  const base = path.join(root, 'plugins/arkiv/evals');
  const catalog = await json(path.join(base, 'catalog.json'));
  const ids = catalog.cases.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length, 'Duplicate evaluation IDs');
  const directories = (await readdir(base, {withFileTypes: true})).filter(entry => entry.isDirectory() && !['mocks', 'results'].includes(entry.name)).map(entry => entry.name).sort();
  assert.deepEqual(directories, [...ids].sort(), 'Unindexed or missing evaluation');
  let negative = 0, mocked = 0;
  for (const item of catalog.cases) {
    const prompt = await readFile(path.join(base, item.id, 'prompt.md'), 'utf8');
    const promptFields = frontmatter(prompt);
    assert.ok(Number(promptFields.timeout_seconds) > 0 && Number(promptFields.timeout_seconds) <= 180, 'Unbounded evaluation');
    assert.ok(!/\b(?:Bash|Write|Edit|WebFetch)\b/.test(promptFields.allowed_tools), `Unsafe tool grant: ${item.id}`);
    const outcome = frontmatter(await readFile(path.join(base, item.id, 'graders/criteria.md'), 'utf8'));
    const processMarkdown = await readFile(path.join(base, item.id, 'graders/process.md'), 'utf8');
    const process = frontmatter(processMarkdown);
    assert.ok(['llm', 'regex'].includes(outcome.type), `Missing answer outcome: ${item.id}`);
    assert.equal(process.type, 'tool_used', `Missing tool-use process grader: ${item.id}`);
    if (item.category === 'negative') {
      negative++; assert.equal(process.arm, 'both'); assert.equal(process.tool, 'Skill');
      assert.equal(process.min, '0'); assert.equal(process.max, '0'); assert.equal(process.input_match, '"arkiv"');
    }
    if (item.category === 'trigger') {
      assert.equal(process.tool, 'Skill'); assert.equal(process.min, '1'); assert.equal(process.arm, 'with-only');
      assert.ok(process.input_match.includes(item.skill));
    }
    if (item.category === 'mcp') {
      mocked++; assert.ok(process.tool.startsWith('mcp__plugin_arkiv_arkiv__'));
      assert.equal(process.arm, 'with-only'); assert.ok(process.input_match);
    }
    if (Object.hasOwn(item, 'processSkill') || Object.hasOwn(item, 'rationaleSources')) {
      checkProcessExpectation(item, processMarkdown);
      for (const source of item.rationaleSources) await readFile(path.join(root, 'plugins/arkiv', source));
    }
    const sources = await json(path.join(base, item.id, 'sources.json'));
    assert.deepEqual(sources.sources, item.sources);
    for (const source of sources.sources) {
      assert.ok(source.startsWith('skills/') && !source.includes('..'));
      await readFile(path.join(root, 'plugins/arkiv', source));
    }
  }
  const {imported, sources: amendments, amendedFiles} = await checkEvalAmendments(root);
  for (const file of imported.imported) {
    const amendment = amendments.get(file.source);
    const destination = amendment?.destination ?? file.source;
    const expected = amendment?.after ?? file;
    const bytes = await readFile(path.join(root, 'plugins/arkiv', destination));
    assert.equal(bytes.length, expected.bytes); assert.equal(digest(bytes), expected.sha256, `Imported evaluation changed: ${file.source}`);
  }
  const tools = await json(path.join(base, 'mocks/arkiv/_tools.json'));
  assert.deepEqual(tools.tools.map(tool => tool.name).sort(), ['read_knowledge', 'server_status']);
  for (const tool of tools.tools) {
    const mock = await readFile(path.join(base, 'mocks/arkiv', `${tool.name}.md`), 'utf8');
    assert.equal(frontmatter(mock).type, 'fixed');
    const body = JSON.parse(mock.split(/\r?\n---\r?\n/)[1]);
    assert.equal(body.synthetic, true, 'Every fixture must identify synthetic evidence');
    assert.equal(tool.inputSchema.type, 'object');
  }
  return {cases: ids.length, negatives: negative, mockedCases: mocked, originalFiles: imported.imported.length, amendedFiles};
}

export async function checkStatic(root = repositoryRoot) {
  await generate(root, true);
  const skills = await checkSkillImport(root), evals = await checkEvalSuite(root), vocabulary = await checkSdkVocabulary(root);
  const plugin = path.join(root, 'plugins/arkiv');
  await assert.rejects(readFile(path.join(plugin, 'CLAUDE.md')), {code: 'ENOENT'});
  const rootPointer = await readFile(path.join(root, 'CLAUDE.md'), 'utf8');
  const codex = path.join(root, 'plugins/arkiv-codex');
  const codexFiles = await diskFiles(root, 'plugins/arkiv-codex');
  assert.ok(!codexFiles.some(file => /\/\.claude-plugin\//.test(file) || file.endsWith('/.mcp.json')
    || file.endsWith('/plugin.json') && !file.endsWith('/.codex-plugin/plugin.json')), 'Codex must not discover Claude configuration or a portable manifest that disables hooks');
  assert.deepEqual(codexFiles.filter(file => /\/hooks\//.test(file)), ['plugins/arkiv-codex/hooks/hooks.json'], 'Codex carries only its own context hook document');
  const codexHooks = JSON.stringify(JSON.parse(await readFile(path.join(codex, 'hooks/hooks.json'), 'utf8')));
  assert.ok(codexHooks.includes('context-hook.mjs') && codexHooks.includes(' codex') && !codexHooks.includes('arkiv-rules')
    && !codexHooks.includes('claude-code'), 'Codex hooks are the Codex context adapter only');
  await assert.rejects(readFile(path.join(codex, 'CLAUDE.md')), {code: 'ENOENT'});
  assert.equal(rootPointer.trim(), '@AGENTS.md', 'Preserve the repository Claude pointer');
  return {passed: true, skills, evals, vocabulary};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 2) throw new Error('Usage: node scripts/check-static.mjs');
    console.log(JSON.stringify(await checkStatic()));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
