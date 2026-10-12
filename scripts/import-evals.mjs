import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {repositoryRoot} from './build-plugin.mjs';
import {git} from './sync-skills.mjs';

const revision = 'a806871335b5afa28297b55c5a12c525b003792e';
const retired = ['arkiv-best-practices-trigger', 'arkiv-best-practices-negative', 'arkiv-best-practices-outcome'];
const additions = [
  {id: 'plugin-mcp-status', category: 'mcp', sources: ['skills/arkiv-mcp/SKILL.md']},
  {id: 'plugin-mcp-read-guidance', category: 'mcp', sources: ['skills/arkiv-query/SKILL.md', 'skills/arkiv-mcp/SKILL.md']},
  {id: 'plugin-event-profile', category: 'mcp', sources: ['skills/arkiv-mcp/SKILL.md']},
  {id: 'plugin-project-intake', category: 'intake', sources: ['skills/arkiv/SKILL.md', 'skills/arkiv-data-modeling/SKILL.md']}
];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';

export async function importEvals(source, root = repositoryRoot) {
  if (git(source, ['rev-parse', `${revision}^{commit}`]).toString('utf8').trim() !== revision) throw new Error('Unexpected evaluation source');
  const original = JSON.parse(git(source, ['show', `${revision}:evals/catalog.json`]).toString('utf8'));
  const importedCases = original.cases.filter(item => !retired.includes(item.id));
  const cases = [...importedCases, ...additions];
  const imported = [];
  for (const item of importedCases) {
    for (const file of ['prompt.md', 'graders/criteria.md', 'sources.json']) {
      const relative = `evals/${item.id}/${file}`;
      const bytes = git(source, ['show', `${revision}:${relative}`]);
      const destination = path.join(root, 'plugins/arkiv', relative);
      await mkdir(path.dirname(destination), {recursive: true});
      await writeFile(destination, bytes);
      imported.push({source: relative, sha256: digest(bytes), bytes: bytes.length});
    }
    const process = item.category === 'negative'
      ? '---\ntype: tool_used\nweight: 1\narm: both\ntool: Skill\ninput_match: "arkiv"\nmin: 0\nmax: 0\n---\nNo Arkiv skill may load for this unrelated task.\n'
      : item.category === 'always-on'
        ? '---\ntype: tool_used\nweight: 1\narm: both\ntool: Bash\nmin: 0\nmax: 0\n---\nThis rule-only evaluation must remain explanation-only.\n'
        : `---\ntype: tool_used\nweight: 1\narm: with-only\ntool: Skill\ninput_match: ${JSON.stringify(item.skill ?? (item.skills ?? ['arkiv']).join('|'))}\nmin: 1\n---\nLoad the task guidance instead of answering only from prior knowledge.\n`;
    await writeFile(path.join(root, 'plugins/arkiv/evals', item.id, 'graders/process.md'), process);
  }
  for (const item of additions) {
    await writeFile(path.join(root, 'plugins/arkiv/evals', item.id, 'sources.json'), json({sources: item.sources}));
  }
  const current = JSON.parse(await readFile(path.join(root, 'plugin.config.json'), 'utf8'));
  const metadata = {schemaVersion: 1, sourceRepository: 'https://github.com/SantiagoDevRel/skills', commit: revision,
    activeSkillsCommit: current.skillsSource.commit,
    retired: retired.map(id => ({id, reason: 'Deprecated compatibility skill is excluded from the plugin; canonical active skills are unchanged.'})),
    changes: [{scope: 'all imported cases', reason: 'Add explicit process graders; outcome prompts and criteria remain byte-identical.'},
      {scope: additions.map(item => item.id), reason: 'Add actual mocked MCP calls and concrete new-project intake checks; no production requests.'}],
    imported};
  await writeFile(path.join(root, 'source/evals-import.json'), json(metadata));
  await writeFile(path.join(root, 'plugins/arkiv/evals/catalog.json'), json({schemaVersion: 1, cases}));
  return {commit: revision, cases: cases.length, importedCases: importedCases.length, newCases: additions.length,
    retired: retired.length, originalFiles: imported.length};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/import-evals.mjs <local-historical-skills-repository>');
    console.log(JSON.stringify(await importEvals(path.resolve(process.argv[2]))));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
