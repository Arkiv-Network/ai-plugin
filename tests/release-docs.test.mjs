import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {repositoryRoot} from '../scripts/build-plugin.mjs';

// Test-only gate: dated receipts retain their original claims; current consumer
// documentation must describe the published release without prerelease status.
const manifestFiles = ['plugins/arkiv/.claude-plugin/plugin.json', 'plugins/arkiv-codex/.codex-plugin/plugin.json'];
function agreedVersion(configVersion, manifests) {
  const version = manifests[0].version;
  assert.match(version, /^\d+\.\d+\.\d+$/, 'Invalid host manifest version');
  for (const manifest of manifests) assert.equal(manifest.version, version, 'Host manifest versions disagree');
  assert.equal(configVersion, version, 'Configuration and manifest versions disagree');
  return version;
}
async function configuredVersion() {
  const manifests = await Promise.all(manifestFiles.map(async file => JSON.parse(await readFile(path.join(repositoryRoot, file)))));
  const config = JSON.parse(await readFile(path.join(repositoryRoot, 'plugin.config.json')));
  return agreedVersion(config.version, manifests);
}
const nextMajor = version => `${Number(version.split('.')[0]) + 1}.0.0`;
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

function assertReleasedDocumentation(documents, version) {
  const escapedVersion = version.replaceAll('.', '[.]');
  const obsolete = [
    /\b(?:candidate|unreleased|pending|unverified)\b/i,
    new RegExp('\\b(?:after|once|until|when)\\s+[*`]*' + escapedVersion + '[*`]*\\s+(?:(?:is|has been)\\s+)?(?:released|merged)\\b', 'i'),
    /\b(?:submitted|sent|proposed)\s+for\s+(?:review|approval)\b/i,
    /\b(?:awaiting|waiting\s+(?:for|on))\s+(?:(?:release|production|owner|final)\s+)?(?:approval|authorization|review)\b/i,
    /\b(?:requires?|needs?)\s+(?:a\s+)?(?:separate\s+)?release\s+(?:authorization|approval)\b/i,
    /\buntil\s+(?:a\s+)?(?:separate\s+)?release\s+is\s+(?:authorized|approved)\b/i,
    /\bpublic\s+installation\s+commands\s+still\s+target\b/i,
    /\bproduction (?:availability|connection|verification) (?:has not|have not|is not yet|remains? unchecked)\b/i,
    /\bpublic(?:-main| default-branch)? install(?:ation)?s? (?:remain|remains|await|awaits|continue to install)\b/i,
    /\bdeferred until Mumbai is live\b/i,
    /\bnot (?:yet )?published\b/i
  ];
  for (const [file, text] of documents) {
    for (const pattern of obsolete) assert.doesNotMatch(text, pattern, `Stale ${version} release state: ${file}`);
  }
  const readme = documents.get('README.md');
  assert.equal(/^\*\*Current version: (\d+\.\d+\.\d+)\.\*\*/m.exec(readme)?.[1], version,
    `Stale ${version} release state: README.md current version`);
  assert.equal(/Confirm `claude plugin list` shows \*\*(\d+\.\d+\.\d+)\*\*/.exec(readme)?.[1], version,
    `Stale ${version} release state: README.md update target`);
}

test('current docs and manifest descriptions reflect the configured host-manifest version', async () => {
  assertReleasedDocumentation(await currentDocumentation(), await configuredVersion());
});

test('every stale-release mutation is executed against each current release document', async t => {
  const documents = await currentDocumentation();
  const version = await configuredVersion();
  assertReleasedDocumentation(documents, version);
  const mutations = [
    `**Release candidate:** ${version}`,
    `${version} is pending production verification.`,
    `## ${version} — unreleased`,
    'Production connection is unverified.',
    `After ${version} is released, install it.`,
    'Production availability has not been checked.',
    'Public default-branch installs continue to install an older version.',
    'Deferred until Mumbai is live: public installation.',
    `${version} is not published.`,
    `${version} is submitted for review.`,
    'Source update submitted for review; installation uses an earlier version.',
    `${version} is awaiting approval.`,
    `${version} is awaiting release approval.`,
    `${version} is waiting for authorization.`,
    `${version} requires separate release authorization.`,
    'Install the older version until a separate release is authorized.',
    'Public installation commands still target an older version.',
    `${version} is sent for approval.`,
    `${version} is waiting on owner review.`,
    `${version} is proposed for review.`
  ];
  const targets = ['README.md', 'docs/verification.md', 'CHANGELOG.md', 'AGENTS.md',
    'plugins/arkiv/.claude-plugin/plugin.json#descriptions',
    'plugins/arkiv-codex/.codex-plugin/plugin.json#descriptions'];
  let executed = 0;
  for (const file of targets) for (const mutation of mutations) {
    const changed = new Map(documents);
    changed.set(file, documents.get(file) + '\n' + mutation);
    assert.notEqual(changed.get(file), documents.get(file), 'Mutation must change its actual current surface');
    assert.throws(() => assertReleasedDocumentation(changed, version), /Stale .* release state/, file + ': ' + mutation);
    executed++;
  }
  assert.equal(executed, targets.length * mutations.length);
  t.diagnostic(`Executed ${executed} stale-release mutations across current docs and both manifest descriptions.`);
});

test('version agreement rejects configuration or either host-manifest drift', async t => {
  const version = await configuredVersion();
  const other = nextMajor(version);
  const manifests = manifestFiles.map(() => ({version}));
  for (const index of [0, 1]) {
    const changed = manifests.map((m, i) => ({version: i === index ? other : m.version}));
    assert.throws(() => agreedVersion(version, changed), /versions disagree/);
  }
  assert.throws(() => agreedVersion(other, manifests), /versions disagree/);
  assert.throws(() => agreedVersion('invalid', [{version: 'invalid'}, {version: 'invalid'}]), /Invalid host manifest version/);
  t.diagnostic('Executed 4 configuration/manifest-version mutations.');
});

test('the guard follows a future host-manifest version without a frozen release number', async t => {
  const version = await configuredVersion();
  const future = agreedVersion(nextMajor(version), manifestFiles.map(() => ({version: nextMajor(version)})));
  const documents = new Map([...await currentDocumentation()].map(([file, text]) => [file, text.replaceAll(version, future)]));
  assertReleasedDocumentation(documents, future);
  for (const mutation of [`After ${future} is released, install it.`, `${future} is submitted for review.`, `${future} is awaiting approval.`]) {
    const changed = new Map(documents);
    changed.set('README.md', changed.get('README.md') + '\n' + mutation);
    assert.throws(() => assertReleasedDocumentation(changed, future), new RegExp('Stale ' + future.replaceAll('.', '[.]') + ' release state'));
  }
  t.diagnostic('Executed 3 future-version release-state mutations.');
});

test('missing or stale current-version and update instructions fail', async t => {
  const version = await configuredVersion(), documents = await currentDocumentation();
  const readme = documents.get('README.md');
  const mutations = [readme.replace(`Current version: ${version}.`, 'Current version: 0.0.0.'),
    readme.replace(`**Current version: ${version}.**`, ''),
    readme.replace(`shows **${version}**`, 'shows **0.0.0**'),
    readme.replace(`Confirm \`claude plugin list\` shows **${version}**`, '')];
  for (const mutation of mutations) {
    assert.notEqual(mutation, readme, 'Instruction mutation must execute');
    const changed = new Map(documents); changed.set('README.md', mutation);
    assert.throws(() => assertReleasedDocumentation(changed, version), /Stale .* release state/);
  }
  t.diagnostic('Executed 4 current-version/update-target mutations.');
});

test('dated release history remains separate from current release assertions', async () => {
  const documents = await currentDocumentation();
  const original = await readFile(path.join(repositoryRoot, 'docs/verification.md'), 'utf8');
  assert.match(original, /## Corrected candidate 0[.]1[.]2/);
  assert.doesNotMatch(documents.get('docs/verification.md'), /## 0[.]4[.]1:/);
  assert.equal(documents.has('docs/evaluations/2026-10-16-context-ablation.md'), false);
});
