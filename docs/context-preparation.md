# Local SDK context, installed-import check and skill-usage preparation

Version 0.3.0 ships the local SDK context hooks in both packages and the canonical installed-import check. Skill-usage collection stays disabled. The release gate is the [October 16 context-only ablation](evaluations/2026-10-16-context-ablation.md): no degradation on Claude Code (218/219 with context versus 211/219 without) or Codex CLI (207/219 versus 204/219), all pairs complete. Version 0.3.1 changes how hostile input and four edge cases are handled (listed below). Across 320 ordinary-input comparisons in its [verification record](verification.md), the injected text is byte-identical to 0.3.0, so that ablation still applies to those inputs. The only output difference there: projects whose manifest does not declare the SDK now also watch `pnpm-workspace.yaml` and `lerna.json`.

## Local SDK context

Version 0.5.1 targets SDK `>=1.0.0 <2` on Rabdi. Coherent pre-1.0 installations are out of range; stable 1.x installations are compatible. The bounded comparator parser accepts the major-only upper bound `<2`. Earlier ablations above describe their original releases; they are not fresh SDK 1.0 behavioral results.

`source/context/sdk-context.mjs` reads package metadata, detected lockfiles and installed declaration files without importing executable project code. The build copies it and `source/context/context-hook.mjs` byte for byte into `plugins/*/scripts/context/`. Categories mean:

| Category | Required evidence |
| --- | --- |
| `absent` | A valid current manifest does not declare the SDK, and its folder is not a workspaces root. |
| `not_installed` | A declared SDK is absent throughout the supported filesystem resolution search. |
| `mismatch` | Readable supported manifest, lock and installed identities disagree. |
| `out_of_range` | Identities agree outside the plugin-supported range `>=1.0.0 <2`. |
| `compatible` | Identities agree inside that range. This does not certify application compatibility. |

The context names the supported range whenever it reports `compatible` or `out_of_range`. Unsupported version specifications, missing or corrupt evidence, PnP resolution and unsupported lock formats stay unmeasured and add nothing. npm lock versions 2 and 3 are supported; other lock formats are detected but not interpreted. Declaration reads, traversal depth and total bytes are bounded. Symlink targets for declarations must stay inside the resolved SDK package.

Suppression state lives in a short-lived process per native session, reached through OS-local IPC: Windows named pipes, or Linux abstract sockets with Node 20, minor 8 or later, which leave no session-derived pathname after a crash. A per-session proof prevents knowledge of an enumerable IPC name from authorizing context injection or session termination. The adapter cannot authenticate whatever answers on that name, so since 0.3.1 it injects only text built entirely from its own fixed fact lines and ignores a relative or oversized workspace in the reply. Installed versions are measured only up to six digits per part. Each request carries a random ID; when the adapter resends a request after its reply was lost, the process replays that reply (it keeps the 32 most recent) instead of treating the change as already delivered. The hooks make no HTTP, TCP or DNS requests and write no cache or identifiers. Other platforms, including macOS, and older Linux Node versions leave automatic context unmeasured; the MCP connection is independent.

Also since 0.3.1:

- A declaration-only change re-states the current declaration count after invalidating earlier declaration facts.
- A workspaces root (a `workspaces` field, `pnpm-workspace.yaml` or `lerna.json`) with no SDK dependency of its own is unmeasured, not `absent`: its packages may depend on the SDK.
- An SDK resolved from a `node_modules` folder above the lockfile's folder keeps its version and declaration count, but its category is unmeasured, because that lock does not describe it. Packages inside a monorepo whose lock sits at the monorepo root stay unmeasured, as in 0.3.0.

The host starts the broker with an asynchronous hook; the synchronous adapter fails open and emits only changed categorical facts. It waits up to about 1.8 seconds for the broker. If the broker is still unavailable at a fresh startup or `/clear`, the adapter reports the measured facts without it, because nothing earlier exists to invalidate; resume and compaction stay silent without session state. When a later prompt reaches a replacement broker, earlier hook facts are explicitly invalidated and re-established. Workspace changes, SDK disappearance and declaration changes also invalidate earlier hook facts; separately supplied evidence keeps its own scope.

Claude Code uses SessionStart, UserPromptSubmit, FileChanged, CwdChanged, PostCompact and SessionEnd. Claude can report the launch `cwd` on later prompt and compaction events after CwdChanged supplies `new_cwd`, so the adapter keeps the explicit native selection in authenticated session RAM and rejects inspections whose workspace changed concurrently. Codex uses SessionStart, UserPromptSubmit, PostCompact and SessionEnd, comparing evidence on prompts because equivalent file and directory events are unavailable. Shell command text is never used to infer an event.

Codex 0.162.1 gives a portable root `plugin.json` precedence and skips hooks for that format in its [loader](https://github.com/openai/codex/blob/rust-v0.162.1/codex-rs/core-plugins/src/loader.rs), so the Codex package uses the native `.codex-plugin/plugin.json` manifest. Codex skips plugin hooks until the user reviews and trusts them with `/hooks` ([hooks documentation](https://learn.chatgpt.com/docs/hooks)). Native CLI evidence does not certify desktop or IDE behavior.

## Installed-import check

The canonical router's `PostToolUse` frontmatter hook runs `skills/arkiv/scripts/check-imports.mjs` in Claude Code after Write/Edit. Claude keeps skill-frontmatter hooks for the rest of the session ([skills reference](https://code.claude.com/docs/en/skills)), so each execution rechecks that the changed file is inside the current workspace and directly imports the SDK. It reproduces the sanitized SDK 0.7.0 chain-export friction and reads installed exports and declarations only; unsupported syntax and conditional, namespace or ambient shapes stay unmeasured. Codex does not run skill frontmatter hooks; explicitly running the packaged script is the tested advisory alternative. No private-key or general chain/RPC detector was added without retained failure evidence.

In 0.3.1 the check quotes only plain package subpaths and names of at most 64 characters; any other SDK import leaves the file unmeasured. It reads each declaration file once per check and stops after 128 files.

## Ablations

Prepare two packages from a fixed canonical Git revision; the control removes only the context hook registrations from the release packages:

```bash
node scripts/prepare-context-candidates.mjs /absolute/skills-checkout FULL_COMMIT /absolute/new-output
```

Run the cases in workspaces where the hook has something to report (an installed SDK fixture). An empty workspace makes both arms identical. Give the judge the host-injected context of every run, in both arms; otherwise statements grounded in the hook's facts look fabricated. Keep the context-only comparison separate from the whole-plugin baseline.

Earlier candidates (October 15–16) were measured in empty workspaces, and one judging pass hid injected context; their per-pair differences are not evidence about the hook. Their records remain in [the earlier report](evaluations/2026-10-15-context-only.md) and the repository history.

## Skill usage remains disabled

`source/skill-usage.mjs` is inactive preparation and is not part of either package. Activation requires sufficiently qualified plugin traffic and a separate owner decision; internal test traffic does not establish external adoption, and no numerical threshold is defined.

The closed aggregate admits only included skill categories, package version, Claude host, separate `agent_invocation` and `user_expansion` channels, and bounded integers. Native Claude tests observed PreToolUse/Skill and UserPromptExpansion separately. These count attempts, including denied ones, not completion. Codex skill measurement stays absent.

An activated implementation would also require explicit local opt-in under `CLAUDE_PLUGIN_DATA`. Review a validated local aggregate with:

```bash
node source/skill-usage.mjs --preview
```

The preview grants no approval and sends nothing. Each future MCP `share_skill_usage` call must follow approval of that exact displayed aggregate and include `sharingApproved:true`. No automatic retry, hook HTTP request, headers-helper submission, SDK state, path, prompt, arguments, free text or persistent identifier is allowed. The receiving service remains inactive and its public catalog is unchanged.
