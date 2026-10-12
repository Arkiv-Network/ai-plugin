import {open} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageLimit = 256 * 1024;
const inputLimit = 16 * 1024;
const ruleLimit = 1024;
const dependencyFields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

async function readBounded(file, limit) {
  let handle;
  try {
    handle = await open(file, 'r');
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > limit) return null;
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const {bytesRead} = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    return length <= limit ? buffer.subarray(0, length).toString('utf8') : null;
  } catch { return null; }
  finally { await handle?.close().catch(() => {}); }
}

export async function rulesForProject(projectDir, root = pluginRoot) {
  if (typeof projectDir !== 'string' || !path.isAbsolute(projectDir)) return '';
  try {
    const text = await readBounded(path.join(projectDir, 'package.json'), packageLimit);
    if (text === null) return '';
    const pkg = JSON.parse(text);
    if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) return '';
    const declared = dependencyFields.some(field => {
      const dependencies = pkg[field];
      return dependencies && typeof dependencies === 'object' && !Array.isArray(dependencies)
        && Object.hasOwn(dependencies, '@arkiv-network/sdk')
        && typeof dependencies['@arkiv-network/sdk'] === 'string'
        && dependencies['@arkiv-network/sdk'].trim().length > 0;
    });
    if (!declared) return '';
    return await readBounded(path.join(root, 'templates/AGENTS.snippet.md'), ruleLimit) ?? '';
  } catch { return ''; }
}

export async function rulesForInput(input, root = pluginRoot) {
  if (typeof input !== 'string' || Buffer.byteLength(input) > inputLimit || !input.trim()) return '';
  try {
    const context = JSON.parse(input);
    if (!context || typeof context !== 'object' || Array.isArray(context)) return '';
    return await rulesForProject(context.cwd, root);
  } catch { return ''; }
}

async function main() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += Buffer.byteLength(chunk);
    if (size > inputLimit) return;
    chunks.push(chunk);
  }
  const rules = await rulesForInput(Buffer.concat(chunks).toString('utf8'));
  if (rules) process.stdout.write(rules);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => { process.exitCode = 0; });
}
