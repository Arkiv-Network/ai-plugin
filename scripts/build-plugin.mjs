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
  if (config.mcpUrl !== 'https://mcp.arkiv.network/devfolio' || endpoint.username || endpoint.password) throw new Error('Unexpected MCP URL');
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

// Local SDK context hooks: read-only package inspection and session-scoped OS-local IPC, no network.
// The broker starts asynchronously; the synchronous adapter fails open when Node or the broker is absent.
export function contextHooks(host) {
  const command = broker => 'if command -v node >/dev/null 2>&1; then node "$CLAUDE_PLUGIN_ROOT/scripts/context/context-hook.mjs" ' + host + (broker ? ' --broker' : '') + ' 2>/dev/null; fi; exit 0';
  const windows = broker => "if (Get-Command node -ErrorAction SilentlyContinue) { & node (Join-Path $env:CLAUDE_PLUGIN_ROOT 'scripts/context/context-hook.mjs') " + host + (broker ? ' --broker' : '') + " 2>$null }; exit 0";
  const handler = broker => ({type: 'command', command: command(broker), ...(host === 'codex' ? {commandWindows: windows(broker)} : {}), timeout: broker ? 600 : 3, ...(broker ? {async: true} : {})});
  const events = host === 'codex' ? ['SessionStart', 'UserPromptSubmit', 'PostCompact', 'SessionEnd']
    : ['SessionStart', 'UserPromptSubmit', 'FileChanged', 'CwdChanged', 'PostCompact', 'SessionEnd'];
  return Object.fromEntries(events.map(event => [event, [{hooks: ['SessionStart', 'UserPromptSubmit'].includes(event) ? [handler(true), handler(false)] : [handler(false)]}]]));
}
export function rulesHooks() {
  return {SessionStart: [{matcher: 'startup|resume|clear|compact',
    hooks: [{type: 'command', command: 'node', args: ['${CLAUDE_PLUGIN_ROOT}/hooks/arkiv-rules.mjs'], timeout: 2,
      onFailure: 'continue'}]}]};
}
function claudeHooks() {
  const context = contextHooks('claude-code');
  return {...context, SessionStart: [...rulesHooks().SessionStart, ...context.SessionStart]};
}
export const contextSources = ['context-hook.mjs', 'sdk-context.mjs'];
export const contextBundles = ['arkiv', 'arkiv-codex'];

export function buildArtifacts(config, source) {
  validateConfig(config);
  const identity = {name: config.name, displayName: config.displayName, version: config.version,
    description: config.description, author: config.author, homepage: config.homepage, repository: config.repository,
    keywords: ['arkiv', 'web3 database', 'ethereum-aligned', 'skills', 'mcp']};
  return new Map([
    ['plugins/arkiv/.claude-plugin/plugin.json', json(identity)],
    ['.claude-plugin/marketplace.json', json({name: config.name, owner: config.author,
      description: config.description, plugins: [{name: config.name, source: './plugins/arkiv', description: config.description}]})],
    ['plugins/arkiv/.mcp.json', json({mcpServers: {arkiv: {type: 'http', url: config.mcpUrl,
      headersHelper: 'node "${CLAUDE_PLUGIN_ROOT}/scripts/client-headers.mjs"'}}})],
    ['plugins/arkiv/scripts/client-headers.mjs', `// Generated connection metadata only: no files, network or agent context.\nprocess.stdout.write(JSON.stringify(process.env.ARKIV_TELEMETRY === 'off' ? {} : {'X-Arkiv-Client': 'arkiv-plugin/${config.version}; host=claude-code'}) + '\\n');\n`],
    ['plugins/arkiv/hooks/hooks.json', json({hooks: claudeHooks()})],
    ['plugins/arkiv/templates/AGENTS.snippet.md', renderRules(config, source)],
    ['.agents/plugins/marketplace.json', json({name: config.name, interface: {displayName: config.displayName},
      plugins: [{name: config.name, source: {source: 'local', path: './plugins/arkiv-codex'},
        policy: {installation: 'AVAILABLE', authentication: 'ON_INSTALL'}, category: 'Developer Tools'}]})],
    // Codex 0.162.1 skips hooks for portable AgentPlugin manifests (root plugin.json) and gives that
    // format precedence, so the package uses the native .codex-plugin manifest to run its context hook.
    ['plugins/arkiv-codex/.codex-plugin/plugin.json', json({name: config.name, version: config.version,
      description: config.description, skills: './skills', mcpServers: './mcp.json', hooks: './hooks/hooks.json',
      interface: {displayName: config.displayName, shortDescription: 'Arkiv skills and the Devfolio MCP connection.'}})],
    ['plugins/arkiv-codex/hooks/hooks.json', json({hooks: contextHooks('codex')})],
    ['plugins/arkiv-codex/mcp.json', json({$schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
      mcpServers: {arkiv: {type: 'streamable-http', url: config.mcpUrl,
        headers: {'X-Arkiv-Client': 'arkiv-plugin/'+config.version+'; host=codex'}}}})],
    ['plugins/arkiv-codex/templates/AGENTS.snippet.md', renderRules(config, source).replace('arkiv:arkiv', '$arkiv')],
    ['plugins/arkiv-codex/AGENTS.md', `# Arkiv plugin for Codex CLI\n\nThis package contains Arkiv skills and one Devfolio (Arkiv: Global Tour Stop) MCP connection at ${config.mcpUrl}. Start a new Codex session after installing, then invoke the Arkiv router with $arkiv. Load only the task skill it selects. The router carries the essential safety rules even when the SDK is absent.\n\nCodex does not run the Claude rules hook. After you review and trust the package hooks, a read-only local hook reports the installed SDK version category at session start and on prompts when it changes; it makes no network requests, stores nothing on disk and never blocks the session. This AGENTS.md is package documentation; installing the plugin does not inject it into the consumer project's instructions. Only add templates/AGENTS.snippet.md to a project's AGENTS.md when the developer explicitly requests it, preserving their existing instructions.\n\nBefore executable SDK code, inspect the manifest, lockfile and installed declarations for SDK ${config.sdkRange} on ${config.networkLabel}; ask for missing evidence. Ask for the query, filters, sort, expected cardinality, stable IDs, trusted creator, public/private fields, permissions, retention, architecture and signer custody. Installation authorizes no SDK installation, wallet connection, signing, feedback or transaction. Before writes obtain explicit operation, network, authorized signer and spending scope. Never request signing keys in chat.\n\nRead the existing connection's actual server_status and confirm profile devfolio before saying CONNECTED. Otherwise report NOT CONNECTED. Do not add a duplicate connection or switch profiles. Synthetic fixtures do not establish live service health.\n\nSkills are real files imported from one fixed canonical Git revision; never edit imported files. See the distribution README for installation, client evidence and maintenance commands. Desktop, IDE and other clients need their own tests; CLI evidence does not certify them.\n`]
  ]);
}

export async function generate(root = repositoryRoot, check = false) {
  const config = JSON.parse(await readFile(path.join(root, 'plugin.config.json'), 'utf8'));
  const source = await readFile(path.join(root, 'source/always-on.md'), 'utf8');
  const artifacts = buildArtifacts(config, source), changed = [];
  for (const name of contextSources) {
    const bytes = await readFile(path.join(root, 'source/context', name), 'utf8');
    for (const bundle of contextBundles) artifacts.set(`plugins/${bundle}/scripts/context/${name}`, bytes);
  }
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
