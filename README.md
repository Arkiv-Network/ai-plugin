# Arkiv Claude Code plugin

Repository bootstrap for the Arkiv integration for Claude Code.

**Status:** the repository is prepared; no installable plugin release is available yet.

## Intended package

The plugin will install Arkiv guidance and a connection to the existing hosted MCP as one versioned unit. It is a distribution layer, with no separate MCP backend.

- Skills source: [Arkiv-Network/skills](https://github.com/Arkiv-Network/skills).
- Initially reviewed skills baseline: [ce5ee78ac0fa5afe33ce64c8ff238de2f26d9049](https://github.com/Arkiv-Network/skills/tree/ce5ee78ac0fa5afe33ce64c8ff238de2f26d9049).
- Existing organization MCP repository: [Arkiv-Network/arkiv-mcp](https://github.com/Arkiv-Network/arkiv-mcp), currently private. Its relationship to the maintained hosted gateway must be reconciled before implementation is imported or advertised.
- Plugin format: [official Claude Code documentation](https://code.claude.com/docs/en/plugins).

Skills remain canonical in their own repository. A future build should import a fixed, reviewed revision and preserve its license and references. Generated bundled files must match that source; changes to guidance belong upstream in the skills repository.

## Before a release

1. Confirm ownership, distribution policy, and the current hosted MCP endpoint and authentication contract with the service owner.
2. Add and validate the plugin and marketplace manifests using the current Claude Code specification.
3. Build the skill bundle from an explicit revision, preserving cross-skill references and excluding deprecated entrypoints from recommended installation.
4. Test actual marketplace installation, skill discovery, MCP connection, updates, and duplicate configuration handling in an isolated Claude Code profile.
5. Publish verified installation commands and tested versions. Repository creation alone does not establish plugin availability or service correctness.

## Current usage

Use the [official skills installation guide](https://github.com/Arkiv-Network/skills#installation) for standalone skills. This repository currently contains documentation only; it has no package dependencies, runtime, or build command.

For the current tracked files:

~~~bash
git ls-files
git diff --check
~~~

See [AGENTS.md](AGENTS.md) for implementation boundaries and required developer inputs.
