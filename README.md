# Arkiv plugin for Claude Code and Codex CLI

Arkiv skills, MCP source discovery, and project rules for the Web3 database, packaged separately for Claude Code and Codex CLI with shared identity `arkiv`. Version **0.5.1** targets SDK **>=1.0.0 <2** on **Rabdi** and bundles the [Mumbai MCP profile](https://mcp.arkiv.network/mumbai) through November 10, 2026. No MCP connection key or wallet is required. The plugin does not install the SDK, sign transactions or create another backend.

**Release candidate:** 0.5.1 is pending production Mumbai verification and release approval. Public default-branch commands below continue to install 0.4.1 until this candidate is merged. Local installation checks do not establish remote service health.

**Known limitation through November 10:** the unchanged canonical `arkiv-mcp` skill describes General as the plugin default. This candidate explicitly selects the **ETHGlobal Mumbai event profile** instead. Follow the skill's [Discover the actual profile](plugins/arkiv/skills/arkiv-mcp/SKILL.md#discover-the-actual-profile) sequence: read actual `server_status`, confirm `id: mumbai` and the event identity, then check its current sources. Candidate server instructions and status identify that event; production connection and availability remain unverified.

## Breaking changes in 0.5.1

- The supported SDK range changes to `>=1.0.0 <2`. Older coherent installations report `out_of_range`; coherent 1.x installations report `compatible`. Missing, mismatched and unmeasured evidence keep their separate categories.
- Both bundled connections move from General to `https://mcp.arkiv.network/mumbai`, retaining the name `arkiv`. Read a successful `server_status` reporting `mumbai` and current event sources before trusting event guidance. Tool availability requires actual discovery; no fixed tool count is promised.
- Skills are imported byte for byte from the pinned SDK 1.0.0/Rabdi revision. Use typed schema columns and indexed filters. The short project rules no longer teach older attribute constructors.
- The pinned canonical `arkiv-mcp` skill still describes General as the plugin default. This package explicitly selects Mumbai instead; follow its configured URL and actual status. The imported skill remains unchanged. The Mumbai default is intended through November 10; reverting it requires a later explicit release, with no automatic profile switch.

This repository was named `Arkiv-Network/claude-plugin` until October 27, 2026. GitHub redirects the old name; new installations use `Arkiv-Network/ai-plugin`.

## Claude Code: install

Claude package: `plugins/arkiv`, version **0.5.1**. Local installation and strict validation are checked on Windows with Claude Code **2.1.314**; Node.js **20 or newer** must be on `PATH` to run the project-rules hook and emit the connection header. Earlier missing-Node evidence used Claude Code **2.1.300** and a loopback fixture; automatic project rules are unavailable. After release, install from the public default branch:

```bash
claude plugin marketplace add Arkiv-Network/ai-plugin
claude plugin install arkiv@arkiv
```

**Restart Claude Code or open a new session after installing the plugin, then continue to Step 2.**

The defaults install for your user account. For one project, add `--scope project` to both commands; `--scope local` keeps the declaration in that project's local settings. Read the [official scope guide](https://code.claude.com/docs/en/discover-plugins). Restart Claude Code after installing, then start an Arkiv task with `/arkiv:arkiv`. Skills are namespaced as `arkiv:<skill>`.

In an existing Claude Code session, the equivalent commands are:

```text
/plugin marketplace add Arkiv-Network/ai-plugin
/plugin install arkiv@arkiv
```

The SessionStart hook adds a short rules block only when the current project's `package.json` declares `@arkiv-network/sdk` in a dependency field. It reads that manifest and its bundled rules only; it does not edit your project. Missing, invalid or oversized input produces no rules. If Node is unavailable, Claude Code reports a nonblocking hook error and the skills and MCP remain separate components; install Node and restart before relying on the automatic rules.

### Local SDK context

When a session starts, and again on later prompts only if something changed, a local hook reads your project's `package.json`, `package-lock.json` and the installed `@arkiv-network/sdk` declaration files. It adds a few lines to the agent's context: the version category (`compatible`, `out_of_range`, `not_installed`, `mismatch` or `absent`), the installed version and the plugin-supported range. Missing, unsupported or ambiguous evidence stays **unmeasured** and adds nothing. Claude Code also refreshes after manifest or lockfile changes, directory changes and compaction.

The hook never imports or runs project code, makes no network requests and writes no files or identifiers. Its per-session state lives in memory of a short-lived local process reached over an OS-local named pipe (Windows) or abstract socket (Linux, Node 20.8+); other platforms leave the context unmeasured. If Node is missing or the hook fails, the session and the MCP connection continue normally. `compatible` describes package metadata only; it does not certify your application.

## Check the installation

```bash
claude plugin list
claude plugin details arkiv
```

Paste this prompt after restarting:

> Use the Arkiv Claude Code plugin. Load the arkiv:arkiv skill and name the skill it recommends for building a typed query. Then call the Arkiv MCP server_status tool and report the profile it returns; the expected profile is mumbai. Report CONNECTED only after a successful MCP tool call confirms profile mumbai; otherwise report NOT CONNECTED and what to fix. Do not answer from memory, install anything or sign transactions. Do not connect wallets, submit feedback, mutate files or data, add connections or switch profiles.

The plugin includes one Mumbai connection. Check separately installed Arkiv skills and connections for duplicates. Agents must not remove, add or switch connections on their own. Read actual `server_status` and current profile sources before trusting event rules.

## Codex CLI: install and verify

Codex package: `plugins/arkiv-codex`, with the native `.codex-plugin/plugin.json` manifest, `mcp.json` (`streamable-http`), the local SDK context hook and real skills imported from the same fixed revision as Claude. It has no Claude rules hook. The compatibility target is **0.162.1**; candidate installation is checked on Windows with **0.163.0**; see [verification scope](docs/verification.md) for evidence and limits. Desktop, web and IDE behavior require their own checks.

Step 1 — run in your terminal:

```bash
codex plugin marketplace add Arkiv-Network/ai-plugin
codex plugin add arkiv@arkiv
```

Alternatively, after adding the marketplace, enter `/plugins` **inside Codex CLI**, choose the Arkiv marketplace, inspect Arkiv and install it. This is an action inside Codex, not a shell command. The native command-line installer is `plugin add`.

**Start a new Codex session after installing the plugin, then continue to Step 2.**

Step 2 — inspect the installed version in your terminal:

```bash
codex plugin list --marketplace arkiv --json
```

Paste into the new Codex session:

> Use $arkiv from the installed Arkiv plugin to load the router and name the skill it recommends for building a typed query. Then call server_status on the existing bundled Arkiv connection; the expected profile is mumbai. Report CONNECTED only after a successful MCP tool call confirms profile mumbai; otherwise report NOT CONNECTED and the observed problem. Do not answer from memory, install anything or sign transactions. Do not connect wallets, submit feedback, mutate files or data, add connections or switch profiles.

Codex does not run Claude's rules hook. Codex skips plugin hooks until you review and trust them: run `/hooks` inside Codex CLI and trust the Arkiv context hook. After that, the local SDK context hook described above runs at session start, on prompts when the evidence changed and after compaction (Codex has no file or directory events). Untrusted or failing hooks never block the session. The router carries essential rules even without the SDK. Package-root `AGENTS.md` documents the package; installation does **not** inject it into your project's instructions. Only if you explicitly request project rules, append `plugins/arkiv-codex/templates/AGENTS.snippet.md` to your existing project `AGENTS.md`, preserving its instructions. Installation does not authorize that edit, SDK installation, wallet access, feedback or transactions.

To pick up a later release, refresh the Git marketplace snapshot with `codex plugin marketplace upgrade arkiv`, run `codex plugin add arkiv@arkiv`, confirm the version with the list command above and start a new session. If you have not trusted the Arkiv hooks yet (for example when updating from 0.2.x), run `/hooks` and trust them. To remove an installation you chose, use `codex plugin remove arkiv@arkiv` and optionally `codex plugin marketplace remove arkiv`. Do not remove a consumer's existing resources automatically.

Official formats and client limits: [packaging](https://developers.openai.com/plugins/build/plugins), [Claude migration](https://developers.openai.com/plugins/guides/submit-claude-plugin), [plugin browser](https://learn.chatgpt.com/docs/plugins#plugin-directory-in-codex-cli).

## Privacy and connection attribution

The bundled MCP connection sends a shared package version and host label by default: `X-Arkiv-Client: arkiv-plugin/<version>; host=claude-code` or `host=codex`. The server retains only closed distribution, published-version and host categories. Initialization names are reduced to a closed client family; raw headers and names are discarded. These are client claims, not proof of installation.

No installation or session IDs, project names, paths, working directories, prompts, local file content, SDK state or skill usage are sent by this attribution. Counts measure request attempts, not users, installations or linked conversions. Hooks make no network requests; the SDK context stays on your machine as agent context. Local skill-usage collection and sharing are not enabled.

In Claude Code, set `ARKIV_TELEMETRY=off` in your environment **before starting a new session** to disable the extra package-version and host header. A local Node header helper emits either the fixed package version and Claude host or no attribution header. Other environment values are never transmitted. The helper reads no files, performs no network requests and adds no agent context. Codex sends a static header; this package does not provide an environment-variable opt-out there. Standard MCP initialization names are still reduced to a client family, and normal operation telemetry and hosting logs continue.

For Arkiv's own machines only, set `ARKIV_AUDIENCE=internal` before starting Claude Code to opt in to the fixed `X-Arkiv-Audience: internal` header. Unset, empty and all other values emit no audience header. This is independent of `ARKIV_TELEMETRY=off`, which continues to omit only `X-Arkiv-Client`. Audience is not authentication or verification classification. Codex's bundled connection keeps its static attribution and sends no audience header; see the host limitation in [verification scope](docs/verification.md).

The intended event retention is 90 days, with authorised operator access and verification traffic excluded from live reports. Retention enforcement requires operator review. Read the [MCP privacy notice](https://mcp.arkiv.network/privacy) for existing telemetry, voluntary feedback and infrastructure limits.

## Begin a project with concrete inputs

Start with the screen or query you need, then decide what can be public. For example:

> I am planning a to-do app on Arkiv. Before writing code, inspect the available SDK version and declarations. Ask me which lists, filters and sort order I need; who may create and update tasks; what is private; how long Arkiv entities should remain queryable; and whether this is a browser wallet or authenticated server app. Do not invent those decisions, install anything or sign transactions.

For an existing application, provide the installed SDK version, a small schema, the expected query result and a sanitized error. Never paste a private key or access credential. The guidance targets SDK `>=1.0.0 <2` on Rabdi; it asks for missing local evidence before producing executable SDK calls. Writes additionally require an authorized signer and spending scope.

## Update or uninstall

```bash
claude plugin marketplace update arkiv
claude plugin update arkiv@arkiv
```

After 0.5.1 is released, to update from **0.4.x** or earlier, run both commands above, then restart Claude Code. Confirm `claude plugin list` shows **0.5.1** and the check prompt returns profile **mumbai**. The plugin manifest's version identifies the installed release; the [skill source receipt](source/skills.lock.json) identifies its canonical skill revision.

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

For MCP-only use, connect to [General](https://mcp.arkiv.network/) using the [Hub MCP guide](https://hub.arkiv.network/ai-tools#mcp). That route does not install local skills or project rules.

## Source and verification

Skills are authored in [Arkiv-Network/skills](https://github.com/Arkiv-Network/skills) and imported as real files into both packages from merged revision [`4a4cff5eb1222c811ac2636f6d8b8e17105a4ddc`](https://github.com/Arkiv-Network/skills/commit/4a4cff5eb1222c811ac2636f6d8b8e17105a4ddc) ([Arkiv-Network/skills#68](https://github.com/Arkiv-Network/skills/pull/68)). Both destinations are bound by the shared Git-blob/SHA-256/size lock. Their original bytes, MIT declarations and cross-skill references are preserved; the deprecated compatibility entrypoint is excluded. Do not edit bundled guidance here. Imported skills retain their license declarations; this repository does not declare an overall distribution license.

### Return to General on November 10

Make a separately reviewed release; the date does not switch installed connections automatically. Set `plugin.config.json` to the next breaking minor version (for example, **0.6.0** after 0.5.1), update the release expectations in `tests/general.test.mjs` and `tests/build.test.mjs`, and update this README and CHANGELOG for that release. Preserve the canonical skill bytes and SDK fact-line hook text. Then run:

```bash
node scripts/build-plugin.mjs --mcp-profile general
node scripts/build-plugin.mjs --check --mcp-profile general
node scripts/check-static.mjs
node --test --test-concurrency=1 tests/*.test.mjs
```

The explicit selection persists `mcpUrl: https://mcp.arkiv.network/` in `plugin.config.json`. Expect that exact URL in `plugins/arkiv/.mcp.json` (`http`) and `plugins/arkiv-codex/mcp.json` (`streamable-http`), the new version in both host manifests, and `general` in the Codex package's status instructions and General in its manifest description. Header attribution must carry the new version. No other URL or profile spelling is accepted. `--check` verifies the selection without changing files; omitting `--mcp-profile` preserves the saved selection. To explicitly prepare a Mumbai candidate instead, use `--mcp-profile mumbai`.

Run the checks on the approved build host, strict Claude validations and isolated native installations on both clients, preserving original-user settings hashes. Before publishing, use the existing classified verification workflow to confirm actual General status and tool discovery. After release, verify fresh public-main installs and installed skill-byte parity. Selecting a profile does not bump the version, contact a server, merge, tag or publish anything.

```bash
node scripts/build-plugin.mjs --check
node scripts/check-static.mjs
node --test --test-concurrency=1 tests/*.test.mjs
claude plugin validate --strict .
claude plugin validate --strict plugins/arkiv
```

The repository has no package dependencies. [Behavioral evals](plugins/arkiv/evals/README.md) compare the plugin with a no-plugin baseline using synthetic MCP tools. Current evals use SDK 1.0/Rabdi terminology and source-checked API expectations; historical import digests are preserved with an explicit amendment lock. The synthetic General fixture remains separate from the real Mumbai connection. Changed inputs need fresh behavioral measurements; old scores do not establish this revision's SDK 1.0 or Mumbai behavior. Static checks, installation, behavior and live MCP health are separate evidence. The controlled project-rule cases do not replace native hook tests. Production MCP tests require confirmed verification classification and operator pacing; otherwise use loopback fixtures.

See [AGENTS.md](AGENTS.md) for exact maintenance commands, version rules, required developer inputs and test isolation.

See [verification scope](docs/verification.md) for the 0.5.1 candidate, historical coverage, native limits and retained failures. The [release notes](https://github.com/Arkiv-Network/ai-plugin/releases) record public installation. The [Hub guide](https://hub.arkiv.network/ai-tools#arkiv-ai-plugin) covers both clients.

[SDK context and skill-usage preparation](docs/context-preparation.md) documents the context hooks, the installed-import check, host limits and the disabled skill-usage source. The [October 16 context-only ablation](docs/evaluations/2026-10-16-context-ablation.md) is the 0.3.0 release gate, with per-skill trigger, negative and outcome results.
