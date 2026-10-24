import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {assertReleaseRoot, generate, repositoryRoot} from './build-plugin.mjs';

export async function releaseGate(action, root = repositoryRoot, args = []) {
  if (!['check', 'validate', 'tag'].includes(action)) throw new Error('Expected check, validate or tag');
  await assertReleaseRoot(root);
  await generate(root, true);
  if (action === 'check') return {publishable: true};
  const commands = action === 'validate'
    ? [['plugin', 'validate', '--strict', '.'], ['plugin', 'validate', '--strict', 'plugins/arkiv']]
    : [['plugin', 'tag', 'plugins/arkiv', ...args]];
  for (const command of commands) {
    const result = spawnSync('claude', command, {cwd: root, env: process.env, stdio: 'inherit',
      timeout: 60_000, windowsHide: true});
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Claude ${action} failed: ${result.status ?? result.signal}`);
  }
  return {passed: true};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [action, ...rest] = process.argv.slice(2);
  const root = rest[0] && !rest[0].startsWith('--') ? path.resolve(rest.shift()) : repositoryRoot;
  try { console.log(JSON.stringify(await releaseGate(action, root, rest))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
