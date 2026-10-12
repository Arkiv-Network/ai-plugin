import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {repositoryRoot, generate, validateConfig} from './build-plugin.mjs';
import {diskFiles} from './sync-skills.mjs';
import {checkSkillReferences} from './check-skill-references.mjs';

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
  return {skills: skills.length, importedFiles: lock.files.length, references: refs.references};
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
  const imported = await json(path.join(root, 'source/evals-import.json'));
  for (const file of imported.imported) {
    const bytes = await readFile(path.join(root, 'plugins/arkiv', file.source));
    assert.equal(bytes.length, file.bytes); assert.equal(digest(bytes), file.sha256, `Imported evaluation changed: ${file.source}`);
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
  return {cases: ids.length, negatives: negative, mockedCases: mocked, originalFiles: imported.imported.length};
}

export async function checkStatic(root = repositoryRoot) {
  await generate(root, true);
  const skills = await checkSkillImport(root), evals = await checkEvalSuite(root);
  const plugin = path.join(root, 'plugins/arkiv');
  await assert.rejects(readFile(path.join(plugin, 'CLAUDE.md')), {code: 'ENOENT'});
  const rootPointer = await readFile(path.join(root, 'CLAUDE.md'), 'utf8');
  assert.equal(rootPointer.trim(), '@AGENTS.md', 'Preserve the repository Claude pointer');
  return {passed: true, skills, evals};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 2) throw new Error('Usage: node scripts/check-static.mjs');
    console.log(JSON.stringify(await checkStatic()));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
