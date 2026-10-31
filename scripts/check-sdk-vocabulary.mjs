import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {repositoryRoot} from './build-plugin.mjs';
import {diskFiles} from './sync-skills.mjs';

export function vocabularyViolations(text, file, exceptions = []) {
  // The canonical Markdown destination is a byte-locked filename, not rendered
  // SDK terminology. Keep its source bytes; inspect link labels and all code.
  const rendered = file.includes('/skills/') && file.endsWith('.md')
    ? text.replace(/\]\(references\/sdk-payload\.md\)/g, value => value.replace(/[^\]\(\)]/g, ' ')) : text;
  const violations = [];
  const add = (token, index) => violations.push({file, token, line: rendered.slice(0, index).split('\n').length});
  for (const match of rendered.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (!/payload/i.test(match[0])) continue;
    if (!exceptions.some(rule => rule.symbol === match[0] && rule.files.includes(file))) add(match[0], match.index);
  }
  for (const match of rendered.matchAll(/0\.8/g)) add(match[0], match.index);
  return violations;
}

export async function checkSdkVocabulary(root = repositoryRoot) {
  const config = JSON.parse(await readFile(path.join(root, 'source/sdk-vocabulary-exceptions.json'), 'utf8'));
  if (config.schemaVersion !== 1 || !Array.isArray(config.exceptions)
    || config.exceptions.length !== 2 || new Set(config.exceptions.map(rule => rule.symbol)).size !== 2
    || config.exceptions.some(rule => !['encryptPayload', 'decryptPayload'].includes(rule.symbol)
      || rule.package !== 'arkiv-encryption' || rule.version !== '1.0.0'
      || typeof rule.reason !== 'string' || rule.reason.length < 20
      || !Array.isArray(rule.files) || !rule.files.length
      || rule.files.some(file => !/^plugins\/arkiv(?:-codex)?\/skills\/[a-z-]+\/(?:references\/)?[A-Za-z.-]+\.md$/.test(file)))) {
    throw new Error('Invalid SDK vocabulary exception list');
  }
  const roots = ['plugins/arkiv/evals', 'plugins/arkiv/skills', 'plugins/arkiv-codex/skills',
    '.claude-plugin', '.agents/plugins', 'plugins/arkiv/.claude-plugin', 'plugins/arkiv-codex/.codex-plugin'];
  const files = [...new Set(['plugin.config.json', 'plugins/arkiv/.mcp.json', 'plugins/arkiv-codex/mcp.json',
    ...(await Promise.all(roots.map(relative => diskFiles(root, relative)))).flat()])].sort();
  const violations = [];
  for (const file of files) violations.push(...vocabularyViolations(await readFile(path.join(root, file), 'utf8'), file, config.exceptions));
  if (violations.length) throw new Error('Obsolete SDK vocabulary: ' + violations.map(v => `${v.file}:${v.line} (${v.token})`).join(', '));
  return {files: files.length, exceptions: config.exceptions.map(({symbol, reason}) => ({symbol, reason})), passed: true};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await checkSdkVocabulary())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
