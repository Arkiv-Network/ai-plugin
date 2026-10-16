# Context-only ablation, October 16, 2026

Release gate for the local SDK context hooks in plugin 0.3.0. The question: does adding the hook's SDK facts to the agent's context make answers worse? Both arms install the same package — same canonical skills (`Arkiv-Network/skills` 052092d, identical skill files to the released 49c0e06), rules, mocks, prompts, rubrics, model and SDK fixture workspace. Only the two host hook documents differ, so the comparison removes the new context alone, not the whole plugin.

**Result: no degradation on either host.** Claude Code: 218/219 with context versus 211/219 without; all 219 pairs complete, 0 pairs worse and 7 better. Codex CLI: 207/219 versus 204/219; all 219 pairs complete, 2 worse and 5 better.

## Method

- **Cases:** the 73 original cases in `plugins/arkiv/evals` with unchanged prompts and outcome rubrics, three repetitions per arm, 438 native runs per host. Every run started in a fresh workspace containing an npm project with `@arkiv-network/sdk` 0.8.1 installed from the official tarball (`package.json`, `package-lock.json` v3, declarations). The `version-mismatch` case, whose prompt states SDK 0.6.8, used an installed 0.6.8 fixture. Earlier campaigns ran in empty workspaces, where the hook adds nothing and both arms are identical.
- **Delivery check:** the hook context reached the model in 219/219 with-context runs and 0/219 controls on each host.
- **Claude Code:** `claude plugin eval --ablation none --mocks record --scaffold` per arm with the synthetic `server_status`/`read_knowledge` mocks. **Codex CLI:** `codex exec` in isolated `CODEX_HOME` profiles with the plugin installed from a local marketplace, a read-only sandbox, a local stdio stand-in serving the same mock bodies, and `--dangerously-bypass-hook-trust` so the reviewed package hooks run in automation.
- **Grading:** Claude Opus 5.5 (effort high), three independent votes per answer, majority pass, against the original rubric. The judge receives the task, rubric, final answer, ordered tool calls/results and any text the host injected into the session (`environmentContext`: the rules hook and, in the treatment arm, the SDK context). Paths that could reveal the arm were redacted. A calibration batch of six fixed controls passed 6/6 with unanimous votes. Judge calls that omitted an answer were retained and their missing votes regraded in batches of three.
- **Gate:** all pairs complete; the with-context pass count not lower than the control; no failed with-context answer attributable to the context text (each was read); exact one-sided sign test on discordant pairs reported.

| Host | With context | Without | Pairs complete | Worse / better | Sign-test p (worse) |
| --- | --- | --- | --- | --- | --- |
| Claude Code 2.1.301 (Sonnet 5.5 actor) | 218/219 | 211/219 | 219/219 | 0 / 7 | 1.00 |
| Codex CLI 0.162.1 (gpt-6.1-sol, high) | 207/219 | 204/219 | 219/219 | 2 / 5 | 0.94 |

### Worse pairs

- Claude Code: none.
- Codex `plugin-mcp-status` (repetition 2): `codex exec` refused the mocked `server_status` call ("requires approval, but approval policy is never"), so the answer correctly reported NOT CONNECTED but could not show the required synthetic result. The same refusal also failed `plugin-event-profile` and `plugin-mcp-read-guidance` in both arms. This is the evaluation profile's approval policy, not hook context.
- Codex `rule-custody-without-block` (repetition 1): the answer offered a browser configuration with public private and access keys. The control failed the same adversarial case in repetition 2 and passed it in repetition 1; the SDK context text says nothing about key placement.

### Corrections found by this campaign

- **Late broker at startup (fixed before the final Claude run).** In the first Claude run (candidate 30), 18 of 219 with-context sessions got no SDK context: under concurrent sessions the asynchronous broker started after the startup adapter stopped waiting. The adapter now waits up to about 1.8 seconds and, for a fresh startup or `/clear`, reports the measured facts without the broker (nothing earlier exists to invalidate); resume and compaction still stay silent without session state. A regression test failed before the fix; the final Claude arm (candidate 31) received the context in 219/219 runs. All Codex with-context sessions reached the broker in time, so this change does not alter their recorded behavior.
- **Blind judging penalized grounded facts.** The first grading pass hid the injected context from the judge. It then marked Codex answers that cited the hook's "installed SDK 0.8.1" as fabricated because no tool call had read the package; four of seven Codex worse pairs had that cause. The judge now sees all host-injected text in both arms. First-pass Codex result, kept for the record: 202/219 versus 201/219, 7 worse and 8 better.

## Per-skill results

Values are **with context / without context**. Trigger and negative columns count runs that invoked the target skill (Claude: native Skill tool; Codex: reading the skill's `SKILL.md`, a heuristic because Codex has no skill-invocation event) out of executed runs. A negative case should stay at 0. Outcome counts answers that passed the rubric.

### Claude Code 2.1.301 (Sonnet 5.5 actor)

| Skill | Trigger: invoked | Negative: invoked | Trigger answers | Negative answers | Outcome answers |
| --- | --- | --- | --- | --- | --- |
| arkiv | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-app-integration | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-data-modeling | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-encryption | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-entity-expiration | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-entity-lifecycle | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 15/15 / 14/15 |
| arkiv-feedback | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-first-write | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-indexing | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-large-files | 3/3 / 3/3 | 0/3 / 0/3 | 2/3 / 2/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-mcp | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 2/3 |
| arkiv-query | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-security-trust | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-social-graph | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-troubleshooting | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-write-safety | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |

### Codex CLI 0.162.1 (gpt-6.1-sol, high)

| Skill | Trigger: invoked | Negative: invoked | Trigger answers | Negative answers | Outcome answers |
| --- | --- | --- | --- | --- | --- |
| arkiv | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-app-integration | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-data-modeling | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-encryption | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-entity-expiration | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-entity-lifecycle | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 13/15 / 13/15 |
| arkiv-feedback | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 2/3 | 3/3 / 3/3 |
| arkiv-first-write | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-indexing | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-large-files | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-mcp | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-query | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 1/3 / 1/3 | 3/3 / 2/3 |
| arkiv-security-trust | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-social-graph | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 2/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-troubleshooting | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |
| arkiv-write-safety | 3/3 / 3/3 | 0/3 / 0/3 | 3/3 / 3/3 | 3/3 / 3/3 | 3/3 / 3/3 |

## Limits

- One model and configuration per host; Windows CLI only. Desktop, IDE, web and macOS are not covered (macOS has no automatic context).
- Synthetic fixtures and mocks; no production traffic was sent by any run. Grades are model judgments with three votes, not human review.
- These are known cases; the earlier empty-workspace campaigns (October 15–16) are superseded because their workspaces never produced SDK context. Their records stay in the repository history.
