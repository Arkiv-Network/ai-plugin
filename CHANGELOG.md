# Changelog

## 0.5.1 — unreleased

Breaking changes before 1.0 use the next minor version.

- Target SDK `>=1.0.0 <2` on Rabdi (chain ID 7794095). Local context hooks classify coherent 1.x installations as compatible and older SDKs as out_of_range. Mismatch, absent, not_installed and insufficient-evidence handling remain independent.
- Configure both Claude Code and Codex with `https://mcp.arkiv.network/mumbai` instead of General, intended through November 10, 2026. Confirm the actual Mumbai status and tools before event work; changing back requires a later explicit release.
- Import canonical skills from `4a4cff5eb1222c811ac2636f6d8b8e17105a4ddc`, preserving raw source bytes, licenses and the deprecated-stub exclusion. The canonical MCP skill still describes General; package documentation makes the Mumbai override explicit.
- Restore the canonical router prerequisite: load `arkiv-security-trust` and, when appropriate, `arkiv-encryption` before storing sensitive data. Preserve the original privacy assertion and SDK hook fact-line text.
- Refresh short project rules for typed schema columns, indexed filtering and named bytes columns. Preserve read-only, local-only context inspection and fixed host/version attribution.

This candidate is not published. Merge, tag, release, public-main installation, native Mumbai connection, profile status and tool discovery await production availability and explicit release authorization.

### Known limitation through November 10

The byte-preserved canonical `arkiv-mcp` skill still describes General as the plugin default. This candidate explicitly selects the ETHGlobal Mumbai event profile. Follow its existing actual-profile discovery path: read `server_status`, confirm `mumbai` and its event identity, then consult current event sources. Candidate server instructions/status supply that identity; they do not prove production availability. The SDK context hook's fact-line-only output is unchanged.

For the separately reviewed return release, `node scripts/build-plugin.mjs --mcp-profile general` selects exactly the approved General URL in both packages. The [November 10 procedure](README.md#return-to-general-on-november-10) requires a new breaking minor version, regenerated artifacts, checks and isolated installation verification. Selection never publishes or switches an already installed client automatically.

Earlier release history remains in [GitHub releases](https://github.com/Arkiv-Network/ai-plugin/releases).
