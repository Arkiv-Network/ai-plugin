# Changelog

## 0.5.0 — unreleased

Breaking changes before 1.0 use the next minor version.

- Target SDK `>=1.0.0 <2` on Rabdi (chain ID 7794095). Local context hooks classify coherent 1.x installations as compatible and older SDKs as out_of_range. Mismatch, absent, not_installed and insufficient-evidence handling remain independent.
- Configure both Claude Code and Codex with `https://mcp.arkiv.network/mumbai` instead of General, intended through November 10, 2026. Confirm the actual Mumbai status and tools before event work; changing back requires a later explicit release.
- Import canonical skills from `c88b7a9bfc84c134909226f111a4beaffa8bdafc`, preserving raw source bytes, licenses and the deprecated-stub exclusion. The canonical MCP skill still describes General; package documentation makes the Mumbai override explicit.
- Refresh short project rules for typed schema columns, indexed filtering and named bytes columns. Preserve read-only, local-only context inspection and fixed host/version attribution.

This candidate is not published. Merge, tag, release, public-main installation, native Mumbai connection, profile status and tool discovery await production availability and explicit release authorization.

Earlier release history remains in [GitHub releases](https://github.com/Arkiv-Network/ai-plugin/releases).
