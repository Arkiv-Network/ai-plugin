# Arkiv plugin for Claude Code and Codex CLI

Arkiv skills, MCP source discovery, and project rules for the Web3 database, packaged separately for Claude Code and Codex CLI with shared identity `arkiv`. The plugin uses the existing Devfolio (Arkiv: Global Tour Stop) MCP profile at [mcp.arkiv.network/devfolio](https://mcp.arkiv.network/devfolio). No connection key is required. It does not install the SDK, fund or connect a wallet, sign transactions, or create another backend.

Version **0.2.1** adds anonymous connection attribution to both packages. Skills and agent context are unchanged. Both install from this repository's public default branch.

## Claude Code: install

Claude package: `plugins/arkiv`, version **0.2.1**. Tested on Windows with Claude Code **2.1.299**; Node.js **20 or newer** must be on `PATH` to run the project-rules hook and emit the connection header. With Node absent, the MCP still connects without that header on tested Claude Code **2.1.300**; automatic project rules are unavailable. Install from the public default branch:

```bash
claude plugin marketplace add Arkiv-Network/claude-plugin
claude plugin install arkiv@arkiv
```

**Restart Claude Code or open a new session after installing the plugin, then continue to Step 2.**

The defaults install for your user account. For one project, add `--scope project` to both commands; `--scope local` keeps the declaration in that project's local settings. Read the [official scope guide](https://code.claude.com/docs/en/discover-plugins). Restart Claude Code after installing, then start an Arkiv task with `/arkiv:arkiv`. Skills are namespaced as `arkiv:<skill>`.

In an existing Claude Code session, the equivalent commands are:

```text
/plugin marketplace add Arkiv-Network/claude-plugin
/plugin install arkiv@arkiv
```

The SessionStart hook adds a short rules block only when the current project's `package.json` declares `@arkiv-network/sdk` in a dependency field. It reads that manifest and its bundled rules only; it does not edit your project. Missing, invalid or oversized input produces no rules. If Node is unavailable, Claude Code reports a nonblocking hook error and the skills and MCP remain separate components; install Node and restart before relying on the automatic rules.

## Check the installation

```bash
claude plugin list
claude plugin details arkiv
```

Paste this prompt after restarting:

> Use the Arkiv Claude Code plugin. Load the arkiv:arkiv skill and name the skill it recommends for building a typed query. Then call the Arkiv MCP server_status tool and report the profile it returns; the expected profile is devfolio (Arkiv: Global Tour Stop). Report CONNECTED only after a successful MCP tool call confirms profile devfolio; otherwise report NOT CONNECTED and what to fix. Do not answer from memory, install anything or sign transactions. Do not connect wallets, submit feedback, mutate files or data, add connections or switch profiles.

The plugin already includes the Devfolio connection, Arkiv building guidance and the Global Tour Stop event sources. In the client where you install the plugin, check separately installed Arkiv skills and Devfolio connections and resolve duplicates before proceeding. Agents must not remove or switch connections on their own. Read the actual `server_status` and current sources before trusting event rules.

## Codex CLI: install and verify

Codex package: `plugins/arkiv-codex`, with portable `plugin.json`, `mcp.json` (`streamable-http`) and real skills imported from the same fixed revision as Claude. Its directory has no Claude hooks. The Windows CLI target is **0.162.1**; see [verification scope](docs/verification.md) for evidence and limits. Desktop, web and IDE behavior require their own checks.

Step 1 — run in your terminal:

```bash
codex plugin marketplace add Arkiv-Network/claude-plugin
codex plugin add arkiv@arkiv
```

Alternatively, after adding the marketplace, enter `/plugins` **inside Codex CLI**, choose the Arkiv marketplace, inspect Arkiv and install it. This is an action inside Codex, not a shell command. The native command-line installer is `plugin add`.

**Start a new Codex session after installing the plugin, then continue to Step 2.**

Step 2 — inspect the installed version in your terminal:

```bash
codex plugin list --marketplace arkiv --json
```

Paste into the new Codex session:

> Use $arkiv from the installed Arkiv plugin to load the router and name the skill it recommends for building a typed query. Then call server_status on the existing bundled Arkiv connection; the expected profile is devfolio (Arkiv: Global Tour Stop). Report CONNECTED only after a successful MCP tool call confirms that profile; otherwise report NOT CONNECTED and the observed problem. Do not answer from memory, install anything or sign transactions. Do not connect wallets, submit feedback, mutate files or data, add connections or switch profiles.

Codex does not rely on Claude's SessionStart hook. The router carries essential rules even without the SDK. Package-root `AGENTS.md` documents the package; installation does **not** inject it into your project's instructions. Only if you explicitly request project rules, append `plugins/arkiv-codex/templates/AGENTS.snippet.md` to your existing project `AGENTS.md`, preserving its instructions. Installation does not authorize that edit, SDK installation, wallet access, feedback or transactions.

To pick up a later release, refresh the Git marketplace snapshot with `codex plugin marketplace upgrade arkiv`, run `codex plugin add arkiv@arkiv`, confirm the version with the list command above and start a new session; no published Codex update has been exercised yet. To remove an installation you chose, use `codex plugin remove arkiv@arkiv` and optionally `codex plugin marketplace remove arkiv`. Do not remove a consumer's existing resources automatically.

Official formats and client limits: [packaging](https://developers.openai.com/plugins/build/plugins), [Claude migration](https://developers.openai.com/plugins/guides/submit-claude-plugin), [plugin browser](https://learn.chatgpt.com/docs/plugins#plugin-directory-in-codex-cli).

## Privacy and connection attribution

The bundled MCP connection sends a shared package version and host label by default: `X-Arkiv-Client: arkiv-plugin/<version>; host=claude-code` or `host=codex`. The server retains only closed distribution, published-version and host categories. Initialization names are reduced to a closed client family; raw headers and names are discarded. These are client claims, not proof of installation.

No installation or session IDs, project names, paths, working directories, prompts, local file content, SDK state or skill usage are sent by this attribution. Counts measure request attempts, not users, installations or linked conversions. Hooks make no network requests. Local skill-usage collection and sharing are not enabled.

In Claude Code, set `ARKIV_TELEMETRY=off` in your environment **before starting a new session** to disable the extra package-version and host header. A local Node header helper emits either the fixed package version and Claude host or no attribution header. Other environment values are never transmitted. The helper reads no files, performs no network requests and adds no agent context. Codex sends a static header; this package does not provide an environment-variable opt-out there. Standard MCP initialization names are still reduced to a client family, and normal operation telemetry and hosting logs continue.

The intended event retention is 90 days, with authorised operator access and verification traffic excluded from live reports. Retention enforcement requires operator review. Read the [MCP privacy notice](https://mcp.arkiv.network/devfolio/privacy) for existing telemetry, voluntary feedback and infrastructure limits. Agent context and canonical skills are unchanged in this release.

## Begin a project with concrete inputs

Start with the screen or query you need, then decide what can be public. For example:

> I am planning a to-do app on Arkiv. Before writing code, inspect the available SDK version and declarations. Ask me which lists, filters and sort order I need; who may create and update tasks; what is private; how long Arkiv entities should remain queryable; and whether this is a browser wallet or authenticated server app. Do not invent those decisions, install anything or sign transactions.

For an existing application, provide the installed SDK version, a small schema, the expected query result and a sanitized error. Never paste a private key or access credential. The guidance targets SDK `>=0.8.1 <0.9` on Tiramisu; it asks for missing local evidence before producing executable SDK calls. Writes additionally require an authorized signer and spending scope.

## Update or uninstall

```bash
claude plugin marketplace update arkiv
claude plugin update arkiv@arkiv
```

To update from **0.1.6** or **0.2.0**, run both commands above, then restart Claude Code. Confirm `claude plugin list` shows **0.2.1** and the check prompt returns profile **devfolio**. The plugin manifest's version identifies the installed release; the [skill source receipt](source/skills.lock.json) identifies its canonical skill revision.

```bash
claude plugin uninstall arkiv@arkiv
```

If you chose a project or local scope, use that same scope when uninstalling. Remove the marketplace only if you no longer want it:

```bash
claude plugin marketplace remove arkiv
```

## Try a checkout without installing it

From this repository:

```bash
claude --plugin-dir ./plugins/arkiv
```

This loads the plugin for that session. It also connects its hosted MCP during normal use. To test the marketplaces from a checkout, use `claude plugin marketplace add ./` or `codex plugin marketplace add .` in an isolated profile. Maintainer tests must use the isolated, synthetic setup described in [AGENTS.md](AGENTS.md) to keep builder telemetry clean.

For standalone skills, keep using [Arkiv-Network/skills](https://github.com/Arkiv-Network/skills#installation):

```bash
npx skills add Arkiv-Network/skills --skill arkiv
```

For MCP-only use, connect to [the Devfolio profile](https://mcp.arkiv.network/devfolio) using the [Hub MCP guide](https://hub.arkiv.network/ai-tools#mcp). That route does not install local skills or project rules.

## Source and verification

Skills are authored in [Arkiv-Network/skills](https://github.com/Arkiv-Network/skills) and imported as real files into both packages from merged revision [`f87c2f5e0eadabcc9fe654205fcd51e88a6a1efe`](https://github.com/Arkiv-Network/skills/commit/f87c2f5e0eadabcc9fe654205fcd51e88a6a1efe) ([Arkiv-Network/skills#57](https://github.com/Arkiv-Network/skills/pull/57)). Both destinations are bound by the shared Git-blob/SHA-256/size lock. Their original bytes, MIT declarations and cross-skill references are preserved; the deprecated compatibility entrypoint is excluded. Do not edit bundled guidance here. Imported skills retain their license declarations; this repository does not declare an overall distribution license.

```bash
node scripts/build-plugin.mjs --check
node scripts/check-static.mjs
node --test --test-concurrency=1 tests/*.test.mjs
claude plugin validate --strict .
claude plugin validate --strict plugins/arkiv
```

The repository has no package dependencies. [Behavioral evals](plugins/arkiv/evals/README.md) compare the plugin with a no-plugin baseline using synthetic MCP tools. Static checks, installation, behavior and live MCP health are separate evidence. The controlled project-rule cases do not replace native hook tests. Production MCP tests require confirmed verification classification and operator pacing; otherwise use loopback fixtures.

See [AGENTS.md](AGENTS.md) for exact maintenance commands, version rules, required developer inputs and test isolation.

See [verification scope](docs/verification.md) for 0.2.1 and earlier acceptance records, qualified native coverage and retained failures. The [release notes](https://github.com/Arkiv-Network/claude-plugin/releases) record public installation. The [Hub guide](https://hub.arkiv.network/ai-tools#arkiv-ai-plugin) covers both clients.

[Unreleased context and consent preparation](docs/context-preparation.md) documents the experimental source, native host limits and publication gates. It does not change either public 0.2.1 package.
