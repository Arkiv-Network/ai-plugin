import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {repositoryRoot} from '../scripts/build-plugin.mjs';

// Test-only gate: dated receipts retain their original claims; current consumer
// documentation must describe the published release without prerelease status.
async function currentDocumentation() {
  const policy = JSON.parse(await readFile(path.join(repositoryRoot, 'source/vocabulary-policy.json')));
  const historical = new Set(policy.historicalFiles.map(row => row.file));
  const files = ['README.md', 'AGENTS.md', 'CHANGELOG.md', 'source/always-on.md'];
  async function visit(relative) {
    for (const entry of await readdir(path.join(repositoryRoot, relative), {withFileTypes: true})) {
      const file = relative + '/' + entry.name;
      if (historical.has(file) || /\/skills\//.test(file) || /\/evals\/(?!README\.md$)/.test(file)) continue;
      if (entry.isDirectory()) await visit(file);
      else if (entry.name.endsWith('.md')) files.push(file);
    }
  }
  await visit('docs');
  await visit('plugins');
  const documents = new Map();
  for (const file of files) {
    let text = await readFile(path.join(repositoryRoot, file), 'utf8');
    for (const row of policy.historicalSections.filter(row => row.file === file)) {
      const start = text.indexOf(row.heading);
      assert.ok(start >= 0, 'Dated history boundary must exist');
      text = text.slice(0, start);
    }
    documents.set(file, text);
  }
  for (const file of ['plugin.config.json', '.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json',
    'plugins/arkiv/.claude-plugin/plugin.json', 'plugins/arkiv-codex/.codex-plugin/plugin.json']) {
    const descriptions = [];
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      for (const [key, entry] of Object.entries(value)) {
        if (/^(?:description|shortDescription)$/.test(key)) descriptions.push(entry);
        else visit(entry);
      }
    };
    visit(JSON.parse(await readFile(path.join(repositoryRoot, file))));
    documents.set(file + '#descriptions', descriptions.join('\n'));
  }
  return documents;
}

function assertReleasedDocumentation(documents) {
  const obsolete = [
    /\b(?:candidate|unreleased|pending|unverified)\b/i,
    /\b(?:after|once|until|when)\s+[*`]*0[.]5[.]1[*`]*\s+(?:(?:is|has been)\s+)?(?:released|merged)\b/i,
    /\bproduction (?:availability|connection|verification) (?:has not|have not|is not yet|remains? unchecked)\b/i,
    /\bpublic(?:-main| default-branch)? install(?:ation)?s? (?:remain|remains|await|awaits|continue to install 0[.]4[.]1)\b/i,
    /\bdeferred until Mumbai is live\b/i,
    /\bnot (?:yet )?published\b/i
  ];
  for (const [file, text] of documents) {
    for (const pattern of obsolete) assert.doesNotMatch(text, pattern, `Stale 0.5.1 release state: ${file}`);
  }
}

test('current docs and manifest descriptions reflect the published 0.5.1 release', async () => {
  assertReleasedDocumentation(await currentDocumentation());
});

test('every stale-release mutation is executed against each current release document', async t => {
  const documents = await currentDocumentation();
  assertReleasedDocumentation(documents);
  const mutations = [
    '**Release candidate:** 0.5.1',
    '0.5.1 is pending production verification.',
    '## 0.5.1 — unreleased',
    'Production connection is unverified.',
    'After 0.5.1 is released, install it.',
    'Production availability has not been checked.',
    'Public default-branch installs continue to install 0.4.1.',
    'Deferred until Mumbai is live: public installation.',
    '0.5.1 is not published.'
  ];
  const targets = ['README.md', 'docs/verification.md', 'CHANGELOG.md', 'AGENTS.md',
    'plugins/arkiv/.claude-plugin/plugin.json#descriptions',
    'plugins/arkiv-codex/.codex-plugin/plugin.json#descriptions'];
  let executed = 0;
  for (const file of targets) for (const mutation of mutations) {
    const changed = new Map(documents);
    changed.set(file, documents.get(file) + '\n' + mutation);
    assert.notEqual(changed.get(file), documents.get(file), 'Mutation must change its actual current surface');
    assert.throws(() => assertReleasedDocumentation(changed), /Stale 0.5.1 release state/, file + ': ' + mutation);
    executed++;
  }
  assert.equal(executed, targets.length * mutations.length);
  t.diagnostic(`Executed ${executed} stale-release mutations across current docs and both manifest descriptions.`);
});

test('dated release history remains separate from current release assertions', async () => {
  const documents = await currentDocumentation();
  const original = await readFile(path.join(repositoryRoot, 'docs/verification.md'), 'utf8');
  assert.match(original, /## Corrected candidate 0[.]1[.]2/);
  assert.doesNotMatch(documents.get('docs/verification.md'), /## 0[.]4[.]1:/);
  assert.equal(documents.has('docs/evaluations/2026-10-16-context-ablation.md'), false);
});
