import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = value => JSON.stringify(value, null, 2) + '\n';
export function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid plugin configuration');
  const required = ['name', 'displayName', 'version', 'description', 'author', 'repository', 'homepage', 'mcpUrl',
    'sdkVersion', 'sdkRange', 'network', 'networkLabel', 'chainId', 'minimumClaudeCode', 'skillsSource'];
  if (Object.keys(config).some(key => !required.includes(key)) || required.some(key => !(key in config))) {
    throw new Error('Unexpected or missing plugin configuration field');
  }
  if (config.name !== 'arkiv' || config.displayName !== 'Arkiv') throw new Error('Unexpected plugin identity');
  for (const field of ['version', 'sdkVersion', 'minimumClaudeCode']) {
    if (!/^\d+\.\d+\.\d+$/.test(config[field])) throw new Error(`Invalid ${field}`);
  }
  for (const field of ['description', 'networkLabel']) {
    if (typeof config[field] !== 'string' || !config[field].trim() || /[\r\n]/.test(config[field])) throw new Error(`Invalid ${field}`);
  }
  if (!config.author || config.author.name !== 'Arkiv Network' || Object.keys(config.author).length !== 1) throw new Error('Invalid author');
  if (config.network !== 'tiramisu' || config.chainId !== 7738577) throw new Error('Unexpected network');
  if (config.sdkVersion !== '0.8.1' || config.sdkRange !== '>=0.8.1 <0.9') throw new Error('Unexpected SDK compatibility');
  if (config.repository !== 'https://github.com/Arkiv-Network/claude-plugin') throw new Error('Unexpected repository');
  const endpoint = new URL(config.mcpUrl);
  if (endpoint.href !== 'https://mcp.arkiv.network/' || endpoint.username || endpoint.password) throw new Error('Unexpected MCP URL');
  const homepage = new URL(config.homepage);
  if (homepage.protocol !== 'https:' || homepage.username || homepage.password || homepage.search) throw new Error('Invalid homepage');
  const source = config.skillsSource;
  if (!source || source.repository !== 'https://github.com/Arkiv-Network/skills' || !/^[0-9a-f]{40}$/.test(source.commit)
    || JSON.stringify(source.excludedSkills) !== '["arkiv-best-practices"]'
    || Object.keys(source).some(key => !['repository', 'commit', 'excludedSkills'].includes(key))) throw new Error('Invalid skills source');
  return config;
}

export function renderRules(config, source) {
  const rules = source.replace(/\r\n/g, '\n').trim().replace(/\{\{([a-zA-Z]+)\}\}/g, (_, key) => {
    if (!['sdkRange', 'networkLabel'].includes(key)) throw new Error(`Unknown rule placeholder: ${key}`);
    return config[key];
  }) + '\n';
  if (Buffer.byteLength(rules) > 1024 || rules.trim().split('\n').length !== 6
    || !rules.startsWith('## Arkiv rules for this project\n') || /\{\{|\}\}/.test(rules)
    || !rules.trim().endsWith('Load the arkiv:arkiv router for Arkiv work.')) throw new Error('Unexpected project rules');
  return rules;
}

export function buildArtifacts(config, source) {
  validateConfig(config);
  const identity = {name: config.name, displayName: config.displayName, version: config.version,
    description: config.description, author: config.author, homepage: config.homepage, repository: config.repository,
    keywords: ['arkiv', 'web3 database', 'ethereum-aligned', 'skills', 'mcp']};
  return new Map([
    ['plugins/arkiv/.claude-plugin/plugin.json', json(identity)],
    ['.claude-plugin/marketplace.json', json({name: config.name, owner: config.author,
      description: config.description, plugins: [{name: config.name, source: './plugins/arkiv', description: config.description}]})],
    ['plugins/arkiv/.mcp.json', json({mcpServers: {arkiv: {type: 'http', url: config.mcpUrl}}})],
    ['plugins/arkiv/hooks/hooks.json', json({hooks: {SessionStart: [{matcher: 'startup|resume|clear|compact',
      hooks: [{type: 'command', command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/hooks/arkiv-rules.mjs'], timeout: 2,
        onFailure: 'continue'}]}]}})],
    ['plugins/arkiv/templates/AGENTS.snippet.md', renderRules(config, source)]
  ]);
}

export async function generate(root = repositoryRoot, check = false) {
  const config = JSON.parse(await readFile(path.join(root, 'plugin.config.json'), 'utf8'));
  const source = await readFile(path.join(root, 'source/always-on.md'), 'utf8');
  const artifacts = buildArtifacts(config, source), changed = [];
  for (const [relative, expected] of artifacts) {
    const file = path.join(root, relative);
    let current;
    try { current = await readFile(file, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (current === expected) continue;
    changed.push(relative);
    if (!check) { await mkdir(path.dirname(file), {recursive: true}); await writeFile(file, expected); }
  }
  if (check && changed.length) throw new Error(`Generated files are stale: ${changed.join(', ')}`);
  return {files: [...artifacts.keys()], changed, checked: check};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build-plugin.mjs [--check]');
    console.log(JSON.stringify(await generate(repositoryRoot, process.argv.includes('--check'))));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
