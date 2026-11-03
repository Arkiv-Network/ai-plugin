import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {repositoryRoot} from './build-plugin.mjs';
import {diskFiles} from './sync-skills.mjs';

const digest = text => createHash('sha256').update(text).digest('hex');
const oldVersion = [1, 0, 0].join('[.]');
const stalePatterns = [new RegExp('\\bSDK[\\s*`_]*' + oldVersion + '\\b', 'gi'),
  new RegExp('@arkiv-network/sdk(?:@|[\\s*`_]+)' + oldVersion + '\\b', 'gi')];

export function sdkGuidanceViolations(documents, policies) {
  const spans = new Map();
  const allow = (file, start, end) => {const rows = spans.get(file) ?? []; rows.push([start, end]); spans.set(file, rows);};
  for (const policy of policies) {
    for (const row of policy.historicalFiles ?? []) {
      if (!documents.has(row.file)) continue;
      const text = documents.get(row.file);
      assert.equal(digest(text), row.sha256, `Historical SDK receipt changed: ${row.file}`);
      allow(row.file, 0, text.length);
    }
    for (const row of policy.historicalSections ?? []) {
      if (!documents.has(row.file)) continue;
      const text = documents.get(row.file), start = text.indexOf(row.heading);
      assert.ok(start >= 0 && text.lastIndexOf(row.heading) === start, 'Historical SDK boundary is missing or ambiguous');
      assert.equal(digest(text.slice(start)), row.sha256, `Historical SDK section changed: ${row.file}`);
      allow(row.file, start, text.length);
    }
  }
  const violations = [];
  for (const [file, text] of documents) {
    for (const pattern of stalePatterns) for (const match of text.matchAll(pattern)) {
      if ((spans.get(file) ?? []).some(([start, end]) => match.index >= start && match.index + match[0].length <= end)) continue;
      violations.push({file, line: text.slice(0, match.index).split('\n').length, claim: match[0]});
    }
    if (['plugin.config.json', 'source/evals-sdk1.lock.json'].includes(file)) {
      const config = JSON.parse(text);
      if (config.sdkVersion !== '1.0.1') violations.push({file, line: 1, claim: 'Reference SDK metadata must be 1.0.1'});
      if (file === 'plugin.config.json' && config.sdkRange !== '>=1.0.0 <2') {
        violations.push({file, line: 1, claim: 'Independent SDK compatibility range changed'});
      }
    }
  }
  return violations;
}

export async function currentSdkDocuments(root = repositoryRoot) {
  const files = (await diskFiles(root, '')).filter(file => !file.startsWith('.git/') && file !== '.git'
    && !file.startsWith('node_modules/') && !/^plugins\/arkiv(?:-codex)?\/skills\//.test(file));
  return new Map(await Promise.all(files.map(async file => [file, await readFile(path.join(root, file), 'utf8')])));
}

export async function checkSdkGuidance(root = repositoryRoot) {
  const documents = await currentSdkDocuments(root);
  const policies = ['source/vocabulary-policy.json', 'source/sdk-guidance-policy.json'].map(file => JSON.parse(documents.get(file)));
  for (const policy of policies) {
    assert.equal(policy.schemaVersion, 1);
    for (const row of [...policy.historicalFiles, ...policy.historicalSections]) assert.ok(documents.has(row.file), 'Historical SDK surface missing');
  }
  const violations = sdkGuidanceViolations(documents, policies);
  assert.deepEqual(violations, [], 'Stale current SDK guidance: ' + JSON.stringify(violations));
  return {passed: true, files: documents.size, referenceSdk: '1.0.1', compatibility: '>=1.0.0 <2'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {console.log(JSON.stringify(await checkSdkGuidance()));}
  catch (error) {console.error(error.message); process.exitCode = 1;}
}
