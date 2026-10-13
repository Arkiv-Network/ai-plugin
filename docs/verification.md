# Verification scope

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
