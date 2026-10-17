# Verification scope

## 0.3.1: hardened context hook and import check, October 17

Canonical skills: [`Arkiv-Network/skills@cd8bb37`](https://github.com/Arkiv-Network/skills/commit/cd8bb375a5eec9977c55f47461eef0542080f3bb) ([PR #63](https://github.com/Arkiv-Network/skills/pull/63)). Every fix below began as a failing test.

Findings from reviews of 0.3.0, all reproduced and fixed:

- A process answering on the session's IPC name could inject arbitrary text. The adapter now injects only text made entirely of its own fact lines, and ignores a relative or oversized workspace in the reply.
- An installed version with very long numbers was quoted into the context. Versions are now measured only up to six digits per part.
- The import check quoted unusual SDK import text back to the agent, and nested `export *` chains could take exponential time. It now reports such imports as unmeasured, and reads each declaration file once, at most 128 per check.
- A request whose reply was lost was applied twice on retry, so the change it carried was never delivered. The process now replays recent replies by request ID.
- A declaration-only change did not re-state the declaration count.
- A workspaces root without its own SDK dependency was reported as `absent`.
- An SDK found above the lockfile's folder could be confirmed by a lock that does not describe it.
- The Codex manifest lacked the shared `keywords`.

Tests: 88/88 on Linux ARM64 (Node 24) and 87/88 on Windows, where one Linux-only crash test is skipped. Static and reference checks pass. A no-network test fails when a hook opens a TCP connection or calls `fetch`.

Across 320 comparisons of 0.3.0 and 0.3.1 on ordinary inputs, the injected text is identical:

- Both hosts, with and without the broker.
- Six SDK fixtures, each through a 16-step event sequence (installs, removals, compaction, `/clear`, cwd change, session end).
- Eight ordinary import-check files.

The only differences in that set are two watch lists: projects whose manifest does not declare the SDK now also watch `pnpm-workspace.yaml` and `lerna.json`. The October 16 ablation therefore still applies to these inputs.

## 0.3.0: local SDK context hooks, October 16

Tag `arkiv--v0.3.0` points to main `89c1945ddd4d8682e73581cc9cf37aa408e28177`. Its canonical skills are [`Arkiv-Network/skills@49c0e06`](https://github.com/Arkiv-Network/skills/commit/49c0e0695d0abc66325aab7e9f3d469ce0b694c5).

The release gate is the [context-only ablation](evaluations/2026-10-16-context-ablation.md). It ran 73 cases with 3 repetitions per arm, in workspaces with the SDK installed:

- Claude Code: 218/219 with context and 211/219 without. No pair got worse.
- Codex CLI: 207/219 with context and 204/219 without. Two pairs got worse; neither is attributable to the context text.

Tests: 78/78 on Linux ARM64 and 77/77 on Windows. Both strict Claude validations, the static and reference checks, the staged-secret scan and the change guard pass.

Public installation was checked in isolated Windows profiles:

- A fresh install from main matches the repository packages: 49 Claude files and 47 Codex files. The only difference is Claude's `.in_use` host marker.
- Updating from 0.2.1 works on both hosts, including Codex's switch to `.codex-plugin/plugin.json`.

Native sessions from those installed packages were checked with Claude Code 2.1.302 and Codex CLI 0.162.1:

- With an SDK 0.8.1 fixture, the agent quoted `compatible` and the supported range on both hosts.
- With an SDK 0.6.8 fixture, it quoted `out_of_range` on both hosts.

These sessions sent no production traffic: Claude ran with no MCP servers, and Codex used a local stdio mock that was restored afterwards. Codex ran with `--dangerously-bypass-hook-trust` in place of the one-time `/hooks` review. The interactive trust dialog, desktop, IDE, web hosts and macOS remain unverified. See the [native receipt](0.3.0-native.json).

The Devfolio MCP is unchanged. It still counts plugin attribution only for published versions up to 0.2.1, so until the service allowlist is updated, 0.3.0 connections show as an unlisted version. Skill-usage collection remains disabled.

## 0.2.1: missing-Node connection check, October 14

Native Claude Code 2.1.300 on Windows connects the released 0.2.1 package in an isolated profile with no Node executable on PATH. The loopback fixture receives initialize and tools/list without the attribution header. With Node restored, the same package emits its fixed header. Only the MCP URL is overridden; user configurations are unchanged and no model is called. The conditional 0.2.2 fix is unnecessary. See the [bounded native receipt](0.2.1-no-node.json). Other hosts and failure modes remain unverified.

## 0.2.1: anonymous connection attribution, October 14

Main/tag `019a690dfb623c03b148a2fb40066e222a7c0ebc` is published. Claude Code 2.1.299 and Codex CLI 0.162.1 public-main installs in fresh profiles match all 343 Claude and 42 Codex package files. The final bounded operation records unchanged required Claude plugin configurations and Codex config. An earlier long window captured an official marketplace cache refresh and global Claude metadata change; original hash failures remain and no user file was restored.

All 39 serial package tests, generated/static/import/reference checks and both strict Claude validations pass. Native connections to a loopback fixture verify the default Claude header, its absence with `ARKIV_TELEMETRY=off`, and the Codex static header. No prompt was submitted or model evaluation started for those connections. Public installation and native fixture behavior are separate evidence; desktop, IDE, web and other operating systems remain unverified.

The supported tag command created the correct local tag, but its push timed out because the test environment disabled Git credential helpers for anonymous downloads. The verified existing tag was pushed normally without force. The original timeout and premature missing-tag release attempt remain in operator evidence.

The companion Devfolio MCP is published from `237f0bad2af06aa6e39a9dc5d250c7d6e1601cb8`, retaining 1.1.23/2026-10-13.1 responses and canonical content. Worker Preview and Production each pass 21 classified calls and exact 125-file source parity; Gateway Preview and the public domain each pass seven classified calls. Public privacy passes 390/768/1440, both themes and actual native 200%, and 36 anonymous sensitive-file probes return 404. Five alias IDs and four legacy pins are preserved. Owner SQL verifies nullable columns and unchanged dashboard SELECT privileges, closed metadata and verification exclusion. Persistence is best-effort; accepted operations are not guaranteed rows.

The rules, context hook, canonical skills and original eval inputs are unchanged. No fresh complete context-hook ablation, production skill-use collection or private dashboard implementation is claimed. Those changes remain separate pending work. GitHub CI is not configured; these are executed local and deployed checks. See the [release](https://github.com/Arkiv-Network/claude-plugin/releases/tag/arkiv--v0.2.1) and README privacy section.

## 0.2.0: Claude Code and Codex CLI packages

Published from `main` as `arkiv--v0.2.0`; the release notes record the public installation check. Both packages share identity/version and canonical revision `f87c2f5e0eadabcc9fe654205fcd51e88a6a1efe`, merged in [Arkiv-Network/skills#57](https://github.com/Arkiv-Network/skills/pull/57). The canonical change replaces the Claude-specific connection sentence before importing both packages. The source lock binds both real-file destinations and their original blob/digest/size; licenses are preserved. No public directory submission is part of this release. The evidence below was gathered on the pre-publication candidate from local marketplaces.

| Windows evidence | Result |
| --- | --- |
| Generated artifacts, fixed-source import, integrity, references and serial Node tests | Pass; both bundles, version parity, portable MCP transport and no Codex hooks |
| Claude Code 2.1.296 strict marketplace and package validation | Pass |
| Codex portable plugin and MCP manifests | Pass against the schemas declared by current official documentation; native CLI installer accepts them |
| Fresh local Claude and Codex CLI 0.162.1 installations | Both install version 0.2.0 in owned isolated profiles; installed MCP fixture URL verified before sessions |
| Claude 0.1.6 to 0.2.0 update | Actual old install, marketplace refresh, plugin update and version inspection pass; test registrations removed |
| New sessions, router, query selection, server_status | Claude invokes `arkiv:arkiv`; native Codex invokes `$arkiv`. Both select `arkiv-query` and make an actual read-only loopback MCP call confirming synthetic Devfolio |
| Claude SDK present/absent | SessionStart injects the exact six-line rules only with SDK dependency declaration; absent SDK yields no hook rules |
| Codex SDK absent | Router inspects the empty manifest, missing lockfile/declarations and asks for evidence before executable code; no hook dependency |
| Unrelated request | Both answer the arithmetic control without skill/tool activation |
| Missing connection | Both load the router and report NOT CONNECTED when server_status is unavailable, without adding or switching a connection |
| Claude MCP override | Actual native init has zero MCPs under strict empty config; reports NO_MCP |
| Codex plugin browser | Native `/plugins` lists the Arkiv marketplace and installed Arkiv; command-line `plugin add` is tested |

The hook startup's first full serial run passed p95 **131.12 ms**, 20 samples, below the unchanged 200 ms requirement. Full-page screenshots at native 200% can be cropped by the browser automation capture; the Hub verification uses CDP viewport captures with observed DPR 2 and CSS viewport 707 px rather than treating those crops as page overflow.

Native Codex sessions used the supported `--no-daemon` flag: the long isolated Windows profile path exceeded the background daemon's Unix socket path limit. The original daemon failure is retained. This verifies the native CLI chat and plugin browser without replacing their interface; it does not certify that daemon path. Desktop, IDE, web, macOS and Linux x86-64 are unverified.

An initial brief Codex menu launch happened before loopback replacement. It failed to ready its daemon before any prompt was sent; no tool call was made, but an automatic connection attempt cannot be excluded. That failed isolation attempt is preserved, not claimed as a safe test. All subsequent native sessions used checked loopback source and installed configurations. No direct public MCP health check was performed. Live connectivity is unverified, and fixture CONNECTED is never a production health result.

Habitual settings and installation registries were hashed before and after. The plugin registries and settings remained unchanged. The user's `.claude.json` changed in cached feature flags and usage metadata during concurrently active native Claude sessions; a matching pre-test backup was compared in memory without copying secrets. Its shared Arkiv usage timestamp differs from the isolated profile's timestamp. These differences were preserved and never restored; not every global metadata byte is claimed unchanged.

Linux ARM64 has separately installed official Codex 0.162.1 and Claude 2.1.296 binaries, verified as aarch64 ELF. Existing older launchers were preserved. On Node 24.18.0, the transferred candidate's source/archive hashes, build/import/static checks, 38 serial tests and strict Claude validation passed. First ARM64 hook timing was p95 30.67 ms over 20 samples. Fresh installations of both packages, version 0.2.0, configured endpoint and test-created registration cleanup passed; original remote settings hashes stayed unchanged. No model session or MCP connection was opened on the DGX. Those authenticated native behaviors remain unverified there.

The first Linux Claude marketplace install rejected bare `.`; `./` passes on Linux and Windows and is the README form for local checkouts. Windows also accepts the bare form, so that historical test is retained rather than relabelled as cross-platform installation evidence.

The existing 73 Claude eval cases, imported prompts, outcome rubrics, original failures and historical qualification remain unchanged. Native smoke tests supplement those records; they are not a new complete ablation or Codex eval certification.

## 0.1.6: Devfolio connection

The bundled endpoint is exactly `https://mcp.arkiv.network/devfolio`, the Devfolio (Arkiv: Global Tour Stop) profile. Configuration rejects credentials, query strings, fragments, alternate paths and URL spelling variants. Canonical skills come from merged revision [`6c27e1d852a313abe1014460362a59c937321b4e`](https://github.com/Arkiv-Network/skills/tree/6c27e1d852a313abe1014460362a59c937321b4e), including the corrected MCP recipe and the reference CLI's nested-plugin layout support. Guidance requires actual status and current sources before trusting event rules; agents may not add or switch connections on their own.

Build/import/static/reference checks, both strict validations and all 34 serial package tests pass on this candidate with Claude Code 2.1.296 on Windows. Hook startup p95 measured 127.33 ms in this run. Original intermediate configuration and imported-utility failures were corrected; their outputs remain in operator evidence.

Six affected MCP/profile cases were freshly evaluated with three observations per arm, `--mocks record --no-publish`. All 18 WITH observations made the required skill/tool calls and had no unmocked calls. Raw outcomes are 17/18 WITH and 3/18 WITHOUT. One WITH read-guidance answer received three FAIL votes despite explicitly satisfying every original clause: exact marker, synthetic provenance, matching constructors, pinned block, reassigned `page.next()` and creator/project/type scope. Root accepts that answer after checking its full response and successful mock call; the raw failure, unchanged rubric and judge votes are retained. This qualified acceptance is not a perfect raw score or a fresh whole-suite evaluation. Historical 0.1.5 evidence remains below.

Installation and the actual 0.1.5-to-0.1.6 update are separate publication checks, recorded in the release notes after execution. Native sessions must use isolated profiles and classified operator traffic or loopback fixtures. No production MCP health, signing, live-chain correctness, macOS/Linux behavior or Hub deployment is established by these synthetic evaluations. The Hub guide is verified locally only.

## 0.1.5: accepted source

Candidate [`516c397d5ba2a14b8a0481fb7787d86dd0c9791f`](https://github.com/Arkiv-Network/claude-plugin/commit/516c397d5ba2a14b8a0481fb7787d86dd0c9791f), plugin tree `5113e8278b57eefaa8df90669445bd954cb4ae1f`; canonical skills [`ee22841ab156c852c5ba19300ffc0f7af3d16db1`](https://github.com/Arkiv-Network/skills/tree/ee22841ab156c852c5ba19300ffc0f7af3d16db1).

Root accepts 73 cases with 219 usable selected WITH observations and 219 complete WITHOUT observations. 21 cases were tested on this source; 52 cases retain observations whose consumed guidance and inputs are byte-identical. Baselines comprise 0 fresh and 73 exact-input historical cases. This is qualified evidence across revisions, not a fresh whole-bundle causal ablation. Native votes, raw results, original criteria and separate Root adjudications remain intact.

Final-source import, build, static metadata, both strict manifests and package checks pass; the bundle contains 342 matched files. The 34 deterministic tests and 31 SDK checks executed on their recorded earlier source are retained through exact oracle, executable-fence and dependency equivalence. They were not rerun on 0.1.5. No final-version upgrade result is inferred from older upgrades.

Public default-branch installation and the two installed-cache onboarding observations are recorded in the [release notes](https://github.com/Arkiv-Network/claude-plugin/releases). Observed platform: Windows, Claude Code 2.1.296 and claude-opus-5-5. Synthetic loopback MCP checks do not establish General production health or live-chain correctness. No funded signing, public-chain transaction certification, macOS/Linux execution or Hub deployment is claimed. The Hub remains localhost only.

## Preserved candidate-stage evidence

The following source-specific history predates this release decision and is retained verbatim. Earlier failures and provider interruptions remain historical failures.

# Verification scope - October 13, 2026

## First-write evidence candidate 0.1.5

The candidate imports canonical revision `ee22841ab156c852c5ba19300ffc0f7af3d16db1`. First-write guidance requires the observed installed SDK version and its declarations before executable SDK code; an "unverified" label does not bypass that gate. It recommends SDK `0.8.1` exactly or the literal range `>=0.8.1 <0.9`, requires upgrade approval for SDK `0.8.0`, and reports only inspected files. The 0.1.4 large-file clarification is retained.

Source/import/build/static checks, both strict manifests and packaging are verified for this source. The 34 deterministic tests and 31 SDK checks were executed on 0.1.4 and are retained with exact oracle, runtime-code and executable-fence equivalence; they were not repeated on 0.1.5. No new native-model observation, default-branch installation or release GO is claimed for this candidate. No Hub deployment.

## Precision candidate 0.1.4

The candidate imports canonical revision `c270159d2b31672b907f0e5b887b12622447c26f`. The large-file package gate recommends SDK `0.8.1` exactly or states the published peer range literally as `>=0.8.1 <0.9`; `0.8.x` is not a compatibility guarantee. A project using SDK `0.8.0` must stop integration until the developer approves upgrading, without forcing or bypassing peers. Live npm metadata on October 13 confirms the unchanged package pins: chunking 0.1.1 and images 0.1.2. Executable examples remain unchanged.

Local validation passes 34 deterministic tests and both strict manifests with zero warnings. The existing 31 SDK checks execute freshly against this candidate with SDK 0.8.1; the unchanged LargeFiles TypeScript fence also compiles strictly. These controlled checks make no model, network or signing calls. The 0.1.3 collection remains frozen; no new native-model observation, default-branch installation or release GO is claimed for 0.1.4. No Hub deployment.

## Corrected candidate 0.1.3

The candidate imports canonical revision `8367b95b557ffaf9fcaf5a5eb91eef3f84360f08`. The write-safety recipe separates durable receipt confirmation from field verification: save prepared intent before the wallet call, capture signed bytes/hash before forwarding, save authenticated `receipt_confirmed` before readback, and save `verified` before admitting the next batch. Recovery authenticates the original hash and repairs verification without resending. Journal version 2 refuses older combined-confirmation journals and retains their files.

The exact JavaScript example passes 16 focused SDK 0.8.1 regressions without public RPC or funds; the previous example fails both concrete mechanism regressions. Ten existing reference tests also pass. These checks establish the controlled example's behavior, not a fresh native-model pass.

The preserved 0.1.2 diagnostic follow-up completed 24 cases, with 72 usable WITH observations and 42 fresh usable WITHOUT observations, then stopped on the membership limit during case 25. That partial case contains one additional usable WITH observation and five provider-limit failures. The write-safety trigger exposed a genuine guide failure; all three answers remain failures under Root's unchanged criterion, including one native false positive. Original scores, votes and traces remain intact. The final continuation reuses only complete observations with unchanged guidance, inputs and observed dependencies; it reruns changed guidance and missing coverage. No release GO or fully usable final ablation is claimed.

## Corrected candidate 0.1.2

The candidate imports canonical revision `6d7c54cc11ca34644cdb95c34efe9a0278ce3ebe`. The MCP recipe now identifies Devfolio as the Global Tour Stop event profile and keeps the bundled General connection distinct. Providing an event URL requires no automatic installation or profile switch. The mapping is checked against the released registry and public canonical event repository, without a live MCP test call.

The finite 0.1.1 follow-up completed ten cases with three usable runs per arm before stopping on this real event-guidance failure. Its first seven formerly failing cases passed. One grounded-read native verdict was a false negative against the unchanged rubric; Root's exact-response adjudication is recorded separately, with the original votes intact. One event-profile native verdict was a false positive; all three answers misstated the event mapping and remain failures. The 0.1.2 full-suite follow-up and public default-branch installation remain pending. No release GO is claimed.

## Corrected candidate 0.1.1

The candidate imports canonical revision `5042e133e1d4cbf3f5baafb9fc47f6b6027b2f5a`. Corrections require complete ordered batch validation, retain readonly originals without separate deletion authorization, explain transfer provenance, preserve unverifiable index history and explicitly route untrusted payloads. Two plugin-authored invocation expectations now follow the canonical privacy and RPC recipes; original answer rubrics, prompts and results remain unchanged.

Both changed TypeScript examples compile strictly against existing SDK 0.8.1 declarations. Deterministic checks pass the valid batch and malformed-result cases, including missing, extra, swapped or mismatched keys and unexpected operation arrays, without a second send. These checks use simulated confirmation and make no network or signing calls. Native behavioral follow-up and public default-branch installation remain pending; this candidate has no release GO yet.

## Preserved 0.1.0 campaign

Plugin source: [`8a18fe4ed3c3025fc5150a5e0a84f882cc4c9206`](https://github.com/Arkiv-Network/claude-plugin/commit/8a18fe4ed3c3025fc5150a5e0a84f882cc4c9206), tested on Windows with Claude Code **2.1.296**. The plugin's 341 files remain frozen; canonical skill bytes are pinned by [the source receipt](../source/skills.lock.json). This candidate is on a private feature branch, with no default-branch release or release GO.

| Check | Observed result |
| --- | --- |
| Deterministic tests and hook timing | After evaluation and cleanup finished, the final serial `npm test` passed 29/29: twenty hook processes had p95 131.4 ms and maximum 145.5 ms. An earlier serial run passed at p95 163.9 ms. The original concurrent-file run failed at 28/29, p95 264.8 ms; a later serial run under concurrent work also failed at p95 244.1 ms. All original assertions remain, with zero skips or cancellations. The final gate passes; these results do not establish a stable sub-200 ms guarantee under machine load. |
| Build, static and fixed-source import checks | Exit 0; generated artifacts match, imported bytes match the pinned Git revision, and cross-skill references resolve. |
| Strict marketplace and plugin validation | Exit 0 with zero warnings. |
| Local and GitHub feature-branch installation | Both nine-command loops exit 0: add, install, list, details, marketplace update, plugin update, uninstall, remove and final empty list. Inventory includes active skills, the hosted MCP declaration and SessionStart hook. GitHub source used the private `feat/claude-plugin-20261012` branch; default-branch installation is separate. |
| Native hook activation | A project declaring the SDK receives the exact snippet; a project without it receives none. With Node missing from PATH, the hook error is nonblocking and the headless session completes. |
| Native MCP override isolation | A local canary connects and receives requests in the positive control. The strict empty MCP configuration suppresses the bundled connection and adds zero canary calls. |
| Native read-only MCP smoke | With a local synthetic fixture, the router loads and actual status/document tools succeed. Initial invalid-document and denied-search attempts are retained as test friction. This is not a General production observation. |
| Membership authentication | Isolated `claude.ai` Pro login succeeds, exit 0; an empty Console profile blocks Console fallback. |
| Native evaluator smoke | One `plugin-mcp-status` run per arm: with-plugin score 1, without-plugin score 0, delta 1; no run errors. The status mock was called once, and its process indicator passed. Case metadata says three repetitions, but the actual arm arrays contain one each. This does not establish full-suite reliability. |
| New-developer installation | Add, install and list commands taken from the local guide all exit 0, with private feature-branch and project-scope substitutions. Browser clipboard used a test stand-in; the system clipboard was untouched. |
| Installed-cache onboarding | Two native sessions exit 0 without `--plugin-dir`; the installed cache exposes 16 Arkiv skills. The copied verification prompt loads the router and reports CONNECTED after a successful loopback status call. The to-do prompt loads data-modeling/query recipes, gives a conceptual model/query and asks for missing SDK, privacy, query and signing decisions. No executable SDK integration was tested. |
| User configuration preservation | The initial isolated installation checks preserved the recorded hashes. A later check found different hashes for habitual settings and known marketplaces; the installed-plugin inventory and original checkouts still match, and Arkiv is absent from habitual inventories. Santiago confirmed concurrent interface settings changes with no functional changes. Those user files are preserved; exact original-byte preservation of those two files is not claimed. |

The full campaign finished naturally with **exit 1** after all 438 attempts across 73 cases, three repetitions per arm, at concurrency 2. Only **196 attempts were usable**: 99 with the plugin and 97 without it. The remaining 242 were rejected by the membership's five-hour session limit. The native report's `partial:false` means every attempt returned; it does not establish 438 successful model runs.

With the plugin, 92 of 99 usable outcomes passed; seven outcome failures and nine process-indicator failures remain. Without it, 53 of 97 usable outcomes passed. No Arkiv skill calls were observed in the 54 usable negative runs across both arms; the other 42 negative attempts were unavailable. Full mocked-MCP cases were also blocked by the limit. The reported aggregate delta is not a complete comparable ablation and cannot certify improvement.

Root inspected the retained failures directly. Encryption/privacy responses loaded the security policy recipe, and RPC configuration responses loaded troubleshooting, consistent with current canonical routing; six process expectations require investigation against that routing. Three untrusted-payload responses loaded no recipe. Outcome findings concern batch validation, mirror recovery and entity lifecycle. All original scores, votes, inputs and traces remain unchanged; no finding is discarded and no rubric is weakened.

Two original `auth_failed` smokes, the initial native `ECONNREFUSED` fixture failure and the other first-run friction remain preserved; later successful checks do not replace them. The source stayed byte-identical to the frozen candidate. No further model calls or paid-API fallback were started after the limit was identified. The full behavioral gate remains failed, with no release GO.

MCP testing used loopback fixtures or evaluator mocks, with zero public General test calls. No signing, broadcasts, production deployment or executable SDK integration is claimed. macOS/Linux hook execution, default-branch installation, public General connectivity and a fully usable ablation remain unverified. Detailed receipts and original failures stay in private operator evidence.
