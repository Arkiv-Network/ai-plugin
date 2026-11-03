# Changelog

## 0.5.3 — November 3, 2026

- Import canonical skills [`c092c4c0b7c71e9e724d57ecba35637e90a02d7e`](https://github.com/Arkiv-Network/skills/commit/c092c4c0b7c71e9e724d57ecba35637e90a02d7e) ([skills#72](https://github.com/Arkiv-Network/skills/pull/72)) for SDK 1.0.1 on Rabdi. Update plugin-owned guidance, evaluation fixtures and source citations to that revision while retaining SDK compatibility `>=1.0.0 <2`.
- Explain `ExpirationTime.max()` and `MAX_LIFETIME`, pre-send expiry validation, and the SDK default gas/error behavior through the canonical guidance. Keep the explicit gas, fresh-estimate, half-block and authoritative-revert retry safeguards. Both packages retain the Mumbai MCP connection.

## 0.5.2 — November 3, 2026

- Import canonical skills [`2bbf731d80c7d8ab201f35f3236ffa800e0044d7`](https://github.com/Arkiv-Network/skills/commit/2bbf731d80c7d8ab201f35f3236ffa800e0044d7) ([skills#71](https://github.com/Arkiv-Network/skills/pull/71)) for Rabdi's recent log window: `eth_getLogs` can fail with `-32603 golemdb segment_range_of(transactions): NotImplemented` on blocks with logs about 1,000 blocks behind head. Stop a failed watcher, recreate it at head and reconcile current state with a query; do not split or retry the range or promise log backfill. See [arkiv#283](https://github.com/Arkiv-Network/arkiv/issues/283) and [docs#94](https://github.com/Arkiv-Network/arkiv-starlight-docs/issues/94).

## 0.5.1 — November 2, 2026

Breaking changes before 1.0 use the next minor version.

- Target SDK `>=1.0.0 <2` on Rabdi (chain ID 7794095). Local context hooks classify coherent 1.x installations as compatible and older SDKs as out_of_range. Mismatch, absent, not_installed and insufficient-evidence handling remain independent.
- Configure both Claude Code and Codex with `https://mcp.arkiv.network/mumbai` instead of General, intended through November 10, 2026. Confirm the actual Mumbai status and tools before event work; changing back requires a later explicit release.
- Import canonical skills from `9fcbdc3066563ea05d3973eb1a9c73cecc82f9e3`, preserving raw source bytes, licenses and the deprecated-stub exclusion. The canonical MCP skill still describes General; package documentation makes the Mumbai override explicit.
- Use `encryptBytes`/`decryptBytes` with `arkiv-encryption >=1.1.0`; remove the obsolete API-symbol allowances and canonical reference waiver. Every current file and directory name remains checked, with dated evidence explicitly preserved.
- Align writes with the merged safety contract: a fresh nonce at latest, current gasPrice via eth_gasPrice under exclusive signer custody, and a fresh unsigned estimate at latest before every new signature (including the single allowed retry); gas >= max(1_000_000 + 400_000 × (N − 1), 2 × estimate) and gas <= half the latest block gas limit. Allow at most one retry only after an authoritative gas-exhausted reverted receipt (gasUsed === gasLimit), never after SDK success or an uncertain submission. The retry requires at least double the previous cap and both fresh gas bounds, with current nonce/fees and authorized spend.
- Apply the half-block gas check inside canonical executable write helpers before initial sends and retries. Keep the first-write grader explicit about nonce/fee freshness on every signature, with mutation-tested static enforcement.
- Restore the canonical router prerequisite: load `arkiv-security-trust` and, when appropriate, `arkiv-encryption` before storing sensitive data. Preserve the original privacy assertion and SDK hook fact-line text.
- Refresh short project rules for typed schema columns, indexed filtering and named bytes columns. Preserve read-only, local-only context inspection and fixed host/version attribution.

[0.5.1 is released](https://github.com/Arkiv-Network/ai-plugin/releases/tag/v0.5.1), tagged on merge commit [`afe7f2a`](https://github.com/Arkiv-Network/ai-plugin/commit/afe7f2a0158c112058a1b87d3f012a39d3a8731a). Public marketplace installs and actual installed-plugin `server_status` calls passed on Windows with Claude Code 2.1.316 and Codex CLI 0.163.0. Both returned `id: mumbai`, `serverVersion: 2.1.0`, `environment: production`. The ETHGlobal Mumbai profile combines General building guidance with event rules; check its actual status and current sources before event work.

### Known limitation through November 10

The byte-preserved canonical `arkiv-mcp` skill still describes General as the plugin default. This release explicitly selects the ETHGlobal Mumbai event profile. Follow its existing actual-profile discovery path: read `server_status`, confirm `id: mumbai` and its event identity, then consult current event sources. Release checks confirmed Mumbai 2.1.0 in production; use the current connection's response before relying on event guidance. The SDK context hook's fact-line-only output is unchanged.

For the separately reviewed return release, `node scripts/build-plugin.mjs --mcp-profile general` selects exactly the approved General URL in both packages. The [November 10 procedure](README.md#return-to-general-on-november-10) requires a new breaking minor version, regenerated artifacts, checks and isolated installation verification. Selection never publishes or switches an already installed client automatically.

Earlier release history remains in [GitHub releases](https://github.com/Arkiv-Network/ai-plugin/releases).
