# Unreleased context and consent preparation

This source is not part of the 0.2.1 packages. No new context or skill-usage hook is enabled in the public release. A complete comparable context-only ablation, with no regressions, is required before importing these changes into a release.

The [October 15 context-only evaluation](evaluations/2026-10-15-context-only.md) is **NO GO**: four Claude pair regressions and a Codex skill-read policy blocker. A subsequent malformed-manifest correction also remains outside that frozen evaluation. Deterministic tests passing does not remove this release gate.

## Local SDK context

`source/context/sdk-context.mjs` reads package metadata, detected lockfiles and installed declaration files without importing executable project code. Categories mean:

| Category | Required evidence |
| --- | --- |
| `absent` | A valid current manifest does not declare the SDK. |
| `not_installed` | A declared SDK is absent throughout the supported filesystem resolution search. |
| `mismatch` | Readable supported manifest, lock and installed identities disagree. |
| `out_of_range` | Identities agree outside the supported stable version range. |
| `compatible` | Identities agree inside the supported stable version range. This does not certify application compatibility. |

Unsupported version specifications, missing/corrupt evidence, PnP resolution and unsupported lock formats stay unmeasured. npm lock versions 2 and 3 are supported. Other lock formats are detected but not interpreted. Declaration reads, traversal depth and total bytes are bounded. Symlink targets for declarations must stay inside the resolved SDK package.

`source/context/context-hook.mjs` keeps suppression state in a short-lived process for each native session, reached through OS-local IPC. It makes no HTTP, TCP or DNS requests and writes no context cache or identifiers. The host starts the process with an asynchronous hook; spawning a detached descendant from a synchronous PowerShell hook caused a reproduced timeout. The synchronous adapter fails open and emits only changed categorical facts, with explicit invalidation after workspace changes, SDK disappearance or declaration changes. Session start and compaction refresh observations. Idle expiry and SessionEnd discard state. This has Windows native and Linux ARM64 deterministic evidence; macOS is unverified.

Claude Code uses SessionStart, UserPromptSubmit, FileChanged, CwdChanged, PostCompact and SessionEnd. Codex uses SessionStart, UserPromptSubmit, PostCompact and SessionEnd, comparing evidence on prompts because equivalent file/directory events are unavailable. Shell command text is never used to infer an event.

Native Claude evidence includes startup, resume, compaction, directory changes and an actual interactive FileChanged notification. Codex evidence includes packaged SessionStart/UserPromptSubmit execution; a fresh native compaction lifecycle remains unverified. Both native hosts continued to a loopback MCP tool call with Node absent and with a deliberately throwing context hook. These are isolated fixture results, not a new production release.

The installed Codex 0.162.1 runtime skips portable AgentPlugin hook sources in its [loader](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/core-plugins/src/loader.rs). Native tests therefore use its supported `.codex-plugin/plugin.json` compatibility format. The published portable package is unchanged. Current [Codex hook documentation](https://learn.chatgpt.com/docs/hooks) and [plugin documentation](https://developers.openai.com/plugins/build/plugins) describe broader support; documentation alone does not certify this installed version. Review and trust hooks before they run. Native CLI evidence does not certify desktop or IDE behavior.

## Canonical skill check

The candidate imports the canonical skills revision recorded in each preparation receipt. It reproduces the sanitized historical SDK chain-export failure and checks readable installed export/declaration evidence. Unsupported syntax stays unmeasured. No key or general chain/RPC check was added without the required retained failure evidence.

Claude skill-frontmatter hooks last for the rest of the session, according to the [official skills reference](https://code.claude.com/docs/en/skills). Each Write/Edit execution therefore rechecks that the changed file is inside the current workspace and actually imports Arkiv. Native tests observed a warning for the deliberate incompatible import and no warning for an unrelated neighboring file. Codex edits did not execute this frontmatter hook. Explicitly running the packaged `skills/arkiv/scripts/check-imports.mjs` is the tested manual alternative; it is not automatic enforcement or skill-use measurement.

Prepare two new, unpublished packages from a fixed canonical Git revision:

```bash
node scripts/prepare-context-candidates.mjs /absolute/skills-checkout FULL_COMMIT /absolute/new-output
```

Only the two host hook documents differ between the context arms. Skills are imported from Git objects, byte for byte, using the existing source lock. Do not edit the generated copies. The native no-plugin comparison remains separate from this context-only comparison. Original prompts, rubrics, failures and incomplete runs must remain visible. A later source correction cannot inherit an earlier candidate's evaluation result.

## Skill usage remains disabled

`source/skill-usage.mjs` is inactive preparation. Activation still requires sufficiently qualified C1 traffic and a separate owner decision; internal verification traffic does not establish external adoption. No numerical threshold has been invented.

The closed aggregate admits only included skill categories, package version, Claude host, separate `agent_invocation` and `user_expansion` channels, and bounded integers. Native Claude tests observed PreToolUse/Skill and UserPromptExpansion separately. These count attempts, including denied invocation attempts, not completion. Codex skill measurement stays absent.

An activated implementation would also require explicit local opt-in under `CLAUDE_PLUGIN_DATA`. Review a validated local aggregate with:

```bash
node source/skill-usage.mjs --preview
```

The preview grants no approval and sends nothing. Each future MCP `share_skill_usage` call must follow approval of that exact displayed aggregate and include `sharingApproved:true`. No automatic retry, hook HTTP request, headers-helper submission, SDK state, path, prompt, arguments, free text or persistent identifier is allowed. The receiving service remains inactive and its public catalog is unchanged. Repeated approved submissions may overlap; there is no unique-user or exactly-once claim.
