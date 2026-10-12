# Arkiv Claude Code plugin

Arkiv skills, MCP source discovery, and project rules for the Web3 database, packaged for Claude Code. The plugin uses the existing General MCP profile at [mcp.arkiv.network](https://mcp.arkiv.network/). No connection key is required. It does not install the SDK, fund or connect a wallet, sign transactions, or create another backend.

## Install

Verified on Windows with Claude Code **2.1.296**. The package requires Node.js **20 or newer**, on `PATH` for the project-rules hook. This candidate is on the private `feat/claude-plugin-20261012` branch; a default-branch release remains pending. GitHub authentication is required.

```bash
claude plugin marketplace add https://github.com/Arkiv-Network/claude-plugin.git#feat/claude-plugin-20261012
claude plugin install arkiv@arkiv
```

The defaults install for your user account. For one project, add `--scope project` to both commands; `--scope local` keeps the declaration in that project's local settings. Read the [official scope guide](https://code.claude.com/docs/en/discover-plugins). Restart Claude Code after installing, then start an Arkiv task with `/arkiv:arkiv`. Skills are namespaced as `arkiv:<skill>`.

In an existing Claude Code session, the equivalent commands are:

```text
/plugin marketplace add https://github.com/Arkiv-Network/claude-plugin.git#feat/claude-plugin-20261012
/plugin install arkiv@arkiv
```

The SessionStart hook adds a short rules block only when the current project's `package.json` declares `@arkiv-network/sdk` in a dependency field. It reads that manifest and its bundled rules only; it does not edit your project. Missing, invalid or oversized input produces no rules. If Node is unavailable, Claude Code reports a nonblocking hook error and the skills and MCP remain separate components; install Node and restart before relying on the automatic rules.

## Check the installation

```bash
claude plugin list
claude plugin details arkiv
```

Paste this prompt after restarting:

> Use the Arkiv Claude Code plugin. Load the arkiv:arkiv skill and name the skill it recommends for building a typed query. Then call the Arkiv MCP server_status tool and report the profile it returns. Report CONNECTED only after a successful MCP tool call; otherwise report NOT CONNECTED and what to fix. Do not answer from memory, install anything or sign transactions.

Use the bundled MCP connection instead of adding another General connection. If your project already has a manual Arkiv connection, review its configuration before removing anything. Event participants should use the event-specific Devfolio connection from the [Hub MCP section](https://hub.arkiv.network/ai-tools#mcp). General and event profiles have different scopes.

## Begin a project with concrete inputs

Start with the screen or query you need, then decide what can be public. For example:

> I am planning a to-do app on Arkiv. Before writing code, inspect the available SDK version and declarations. Ask me which lists, filters and sort order I need; who may create and update tasks; what is private; how long Arkiv entities should remain queryable; and whether this is a browser wallet or authenticated server app. Do not invent those decisions, install anything or sign transactions.

For an existing application, provide the installed SDK version, a small schema, the expected query result and a sanitized error. Never paste a private key or access credential. The guidance targets SDK `>=0.8.1 <0.9` on Tiramisu; it asks for missing local evidence before producing executable SDK calls. Writes additionally require an authorized signer and spending scope.

## Update or uninstall

```bash
claude plugin marketplace update arkiv
claude plugin update arkiv@arkiv
```

Restart after an update. The plugin manifest's version identifies the installed release; the [skill source receipt](source/skills.lock.json) identifies its canonical skill revision.

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

This loads the plugin for that session. It also connects its hosted MCP during normal use. Maintainer tests must instead use the isolated, synthetic setup described in [AGENTS.md](AGENTS.md) to keep builder telemetry clean.

For standalone skills, keep using [Arkiv-Network/skills](https://github.com/Arkiv-Network/skills#installation):

```bash
npx skills add Arkiv-Network/skills --skill arkiv
```

For MCP-only use, follow the [Hub MCP guide](https://hub.arkiv.network/ai-tools#mcp). That route does not install local skills or project rules.

## Source and verification

Skills are authored in [Arkiv-Network/skills](https://github.com/Arkiv-Network/skills) and imported as real files from the fixed [ce5ee78 revision](https://github.com/Arkiv-Network/skills/tree/ce5ee78ac0fa5afe33ce64c8ff238de2f26d9049). Their original bytes, MIT declarations and cross-skill references are preserved; the deprecated compatibility entrypoint is excluded. Do not edit bundled guidance here. No repository-wide license exists in that source revision; this distribution omits a license claim pending maintainer confirmation.

```bash
node scripts/build-plugin.mjs --check
node scripts/check-static.mjs
node --test --test-concurrency=1 tests/*.test.mjs
claude plugin validate --strict .
claude plugin validate --strict plugins/arkiv
```

The repository has no package dependencies. [Behavioral evals](plugins/arkiv/evals/README.md) compare the plugin with a no-plugin baseline using synthetic MCP tools. Static checks, installation, behavior and live MCP health are separate evidence. The controlled project-rule cases do not replace native hook tests. General production test traffic remains excluded because it cannot currently be classified with the known operator keys.

See [AGENTS.md](AGENTS.md) for exact maintenance commands, version rules, required developer inputs and test isolation.

See [verification scope](docs/verification.md) for installed-cache onboarding, the membership smoke and the full campaign's retained failures. The full campaign reached the membership session limit; outcome and process findings remain open. No behavioral pass or release GO is claimed.
