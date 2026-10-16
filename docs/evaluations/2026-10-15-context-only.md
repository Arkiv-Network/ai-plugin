# Context-only evaluation, October 15, 2026

**Superseded candidate; its hooks were not released.** These runs used empty workspaces, where the hook adds no SDK context, so differences between arms are not evidence about the hook. See the [October 16 ablation](2026-10-16-context-ablation.md) for the release gate. Claude has four new aggregate failures among 73 complete pairs. Codex completed 32 pairs, but native skill-file policy rejections make its skill-quality gate invalid. The later source correction is also outside this frozen candidate.

The public release remains 0.2.1. Both arms import canonical candidate skills `66aa7069d7d7bda5cbb6c20dd25f800d9f16bcf8` byte for byte; only the host context-hook documents differ. This revision is retained locally, not published while the gate is closed. The comparison is separate from removal of the whole plugin, and does not measure the effect of the upstream import checker itself.

## Claude Code

Claude Code 2.1.300, Sonnet actor, Haiku judge, one actor run per case per arm, three judge votes per answer. Same 73 original tasks, rubrics, skills, native empty-workspace fixtures and configuration. Actual arm arrays each contain one run; the historical `runsPerCase: 3` metadata is not the executed sample size. Native evaluator `--ablation none` was run separately on the two context packages.

Values below are **without context / with context**. Trigger and negative columns use the original native Skill process grader (one case each). Outcome uses the dedicated outcome case; all answers includes the original outcome criteria on trigger, negative and outcome cases (three cases per arm).

| Skill | Trigger | Negative | Outcome | All answers |
| --- | --- | --- | --- | --- |
| arkiv-app-integration | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-data-modeling | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-encryption | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-entity-expiration | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-entity-lifecycle | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-feedback | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-first-write | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-indexing | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-large-files | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-mcp | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-query | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-security-trust | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-social-graph | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-troubleshooting | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 | 3/3 / 3/3 |
| arkiv-write-safety | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 0/1 | 3/3 / 2/3 |

Across all 73 cases: aggregate 67/73 / 64/73; answer criteria 69/73 / 67/73; process 71/73 / 70/73.

Original regressions: `adversarial-untrusted-payload`, `arkiv-write-safety-outcome`, `multi-encrypted-expiring`, `rule-timestamps-with-block`. Original improvement: `rule-custody-without-block`. These are observed pair changes, not a proven causal attribution. Individual results, including shared failures and the additional adversarial/multiple-skill/rule cases, are in the [machine-readable report](2026-10-15-context-only.json). No failed grade was overturned.

## Codex CLI

Codex 0.162.1, GPT-6.1-sol with high effort; one run per original trigger/negative case per arm. Both arms used the same native compatibility package, empty workspace, no real MCP servers, frozen prompts and rubrics. A separate Haiku evaluation graded anonymized paired answers against the unchanged criteria, with one vote per answer. Host scores are not comparable to Claude's judge-vote configuration.

Native reads of installed skill files were rejected by policy in 18/32 / 18/32 cases. The original errors and answers are retained. **No valid skill-quality claim follows from these pairs.** Native skill invocation measurements remain absent (n=0); reading a file or explaining a recipe is not counted as a skill invocation.

The following are answer-only diagnostic passes, without / with context (n=1 each), not observed triggers or skill-use rates. No dedicated outcome cases ran on Codex.

| Skill | Trigger-task answer | Negative-task answer | Invocation / dedicated outcome |
| --- | --- | --- | --- |
| arkiv-app-integration | 0/1 / 1/1 | 1/1 / 1/1 | absent / not run |
| arkiv-data-modeling | 0/1 / 0/1 | 1/1 / 1/1 | absent / not run |
| arkiv-encryption | 1/1 / 1/1 | 1/1 / 1/1 | absent / not run |
| arkiv-entity-expiration | 0/1 / 0/1 | 1/1 / 1/1 | absent / not run |
| arkiv-entity-lifecycle | 1/1 / 1/1 | 1/1 / 1/1 | absent / not run |
| arkiv-feedback | 0/1 / 0/1 | 0/1 / 1/1 | absent / not run |
| arkiv-first-write | 0/1 / 0/1 | 1/1 / 1/1 | absent / not run |
| arkiv-indexing | 0/1 / 1/1 | 1/1 / 1/1 | absent / not run |
| arkiv-large-files | 0/1 / 1/1 | 1/1 / 1/1 | absent / not run |
| arkiv-mcp | 1/1 / 1/1 | 1/1 / 1/1 | absent / not run |
| arkiv-query | 0/1 / 0/1 | 0/1 / 0/1 | absent / not run |
| arkiv-security-trust | 1/1 / 1/1 | 1/1 / 1/1 | absent / not run |
| arkiv-social-graph | 0/1 / 0/1 | 1/1 / 1/1 | absent / not run |
| arkiv | 0/1 / 1/1 | 1/1 / 1/1 | absent / not run |
| arkiv-troubleshooting | 0/1 / 0/1 | 1/1 / 1/1 | absent / not run |
| arkiv-write-safety | 1/1 / 1/1 | 1/1 / 1/1 | absent / not run |

## Limits and next gate

- Claude actor model and judge aliases were fixed by the native evaluator; no model-snapshot equality claim beyond that receipt.
- All contexts used the same empty native workspace. SDK state was unmeasured; this does not establish measured-version task benefits.
- One actor sample per case per arm; stochastic changes are not causal proof or a population estimate.
- Codex skill-file reads received native blocked-by-policy errors. These pairs are response diagnostics, not a valid skill-quality gate. No policy bypass or replacement run.
- Codex has no observed reliable native Skill event: trigger/negative invocation measurement is absent, n=0.
- A malformed dependency-map correction was made after the candidate freeze. These runs cannot certify the final source.
- The comparison holds candidate canonical skills and all non-context files fixed; it does not estimate the upstream checker treatment or removal of the whole plugin.
- All original failures and original grades remain; no rubric changes, selective reruns or pass reinterpretations.

Reproduce the four Claude failures without changing their inputs or rubrics, isolate the mechanism, and bind any correction to a new fixed candidate. Resolve the supported Codex fixture/read precondition before a comparable evaluation; do not bypass the policy rejection. Then run complete pairs on the final source. Until these conditions pass, keep the published plugin and skill hooks unchanged.

## Candidate 05 recovery

The earlier campaign above is historical and remains failed. The following complete comparison uses the corrected source and supported isolated Windows read-only sandbox. This development evidence is outside both released plugin bundles.

The publication gate remains closed. No new hooks are released. Public plugin 0.2.1 is unchanged. Values below are without context / with context.

Claude: 64/73 / 63/73 complete aggregate passes. Codex: 70/73 / 68/73 answer-criteria passes. Original pair regressions remain failures even if the total score improves.

## Claude Code

Sonnet actor; Haiku grader with three votes per answer; one actor sample per original case and arm. All three columns require both original process and answer-criteria graders to pass. Per-grader results remain in the JSON and native traces.

| Skill | Trigger | Negative | Outcome |
| --- | --- | --- | --- |
| arkiv-app-integration | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-data-modeling | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 0/1 |
| arkiv-encryption | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-entity-expiration | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-entity-lifecycle | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-feedback | 1/1 / 1/1 | 0/1 / 1/1 | 1/1 / 0/1 |
| arkiv-first-write | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-indexing | 1/1 / 0/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-large-files | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-mcp | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 0/1 |
| arkiv-query | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-security-trust | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-social-graph | 0/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-troubleshooting | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-write-safety | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |

Regressions: arkiv-data-modeling-outcome, arkiv-feedback-outcome, arkiv-indexing-trigger, arkiv-mcp-outcome, rule-router-without-block, rule-version-with-block.

## Codex CLI

GPT-6.1-sol/high actor; Haiku grader with one vote per anonymized answer; one actor sample per original case and arm. Same supported read-only Windows MXC sandbox in both profiles. Native skill invocation is unmeasured (n=0); these are task-answer scores, not invocation or usage rates.

| Skill | Trigger-task answer | Negative-task answer | Outcome-task answer |
| --- | --- | --- | --- |
| arkiv-app-integration | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-data-modeling | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-encryption | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-entity-expiration | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-entity-lifecycle | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-feedback | 0/1 / 0/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-first-write | 1/1 / 0/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-indexing | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-large-files | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-mcp | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-query | 1/1 / 1/1 | 1/1 / 0/1 | 1/1 / 1/1 |
| arkiv-security-trust | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-social-graph | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-troubleshooting | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-write-safety | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |

Regressions: arkiv-first-write-trigger, arkiv-query-negative.

## Limits

- One actor sample per task per arm. Pair changes do not prove causation or estimate population benefit.
- The same original skills, prompts, fixtures, model configuration and rubrics are held within each host pair. Host scores are not comparable because actor and judge-vote configurations differ.
- Native empty workspaces leave SDK evidence unmeasured. Measured-version behavior is covered by separate deterministic and native lifecycle fixtures, not this task-quality population.
- Codex answer grades cover trigger, negative and outcome tasks. Native skill invocation measurement remains absent; file reads are not recast as invocations.
- This comparison neither removes the whole plugin nor isolates the upstream import-checker treatment.
- Candidate-04 failures, the Codex policy-rejected original pairs and the brace-glob harness failure remain retained; no original grade or rubric was changed.

## Candidate 06 completion

The startup correction suppresses a wholly unmeasured SDK observation until there are measured facts to report or invalidate. It passed 66 deterministic tests on DGX after a retained failing regression. Both native hosts also received `compatible` and `0.8.1` from a separate synthetic metadata/declaration fixture without model tool calls.

The publication gate remains closed. No new hooks are released. Public plugin 0.2.1 is unchanged. Values below are without context / with context.

Claude: 66/73 / 64/73 complete aggregate passes. Codex: 66/73 / 67/73 answer-criteria passes. Original pair regressions remain failures even if the total score improves.

## Claude Code

Sonnet actor; Haiku grader with three votes per answer; one actor sample per original case and arm. All three columns require both original process and answer-criteria graders to pass. Per-grader results remain in the JSON and native traces.

| Skill | Trigger | Negative | Outcome |
| --- | --- | --- | --- |
| arkiv-app-integration | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-data-modeling | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-encryption | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-entity-expiration | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-entity-lifecycle | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-feedback | 1/1 / 0/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-first-write | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-indexing | 1/1 / 0/1 | 1/1 / 1/1 | 0/1 / 1/1 |
| arkiv-large-files | 1/1 / 0/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-mcp | 1/1 / 0/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-query | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-security-trust | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-social-graph | 0/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-troubleshooting | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-write-safety | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |

Regressions: arkiv-feedback-trigger, arkiv-indexing-trigger, arkiv-large-files-trigger, arkiv-mcp-trigger, plugin-mcp-read-guidance, rule-router-without-block.

## Codex CLI

GPT-6.1-sol/high actor; Haiku grader with one vote per anonymized answer; one actor sample per original case and arm. Same supported read-only Windows MXC sandbox in both profiles. Native skill invocation is unmeasured (n=0); these are task-answer scores, not invocation or usage rates.

| Skill | Trigger-task answer | Negative-task answer | Outcome-task answer |
| --- | --- | --- | --- |
| arkiv-app-integration | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-data-modeling | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-encryption | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-entity-expiration | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-entity-lifecycle | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-feedback | 0/1 / 0/1 | 1/1 / 0/1 | 1/1 / 1/1 |
| arkiv-first-write | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-indexing | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-large-files | 0/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-mcp | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-query | 1/1 / 1/1 | 0/1 / 0/1 | 0/1 / 0/1 |
| arkiv-security-trust | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-social-graph | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-troubleshooting | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |
| arkiv-write-safety | 1/1 / 1/1 | 1/1 / 1/1 | 1/1 / 1/1 |

Regressions: arkiv-feedback-negative.

## Limits

- One actor sample per task per arm. Pair changes do not prove causation or estimate population benefit.
- The same original skills, prompts, fixtures, model configuration and rubrics are held within each host pair. Host scores are not comparable because actor and judge-vote configurations differ.
- Native empty workspaces leave SDK evidence unmeasured. Measured-version behavior is covered by separate deterministic and native lifecycle fixtures, not this task-quality population.
- Codex answer grades cover trigger, negative and outcome tasks. Native skill invocation measurement remains absent; file reads are not recast as invocations.
- This comparison neither removes the whole plugin nor isolates the upstream import-checker treatment.
- Candidate-04 and candidate-05 failures, the Codex policy-rejected original pairs and the brace-glob harness failure remain retained; no original grade or rubric was changed.
- One judge wrapper rejected the public algorithm name HMAC-SHA-256 as a possible secret before invoking a model. The confirmed false-positive exception completed the same unchanged blinded input; the original rejection and recovery remain separate.
- Candidate 06 suppresses wholly unmeasured initial observations. This empty-workspace population cannot establish a benefit from measured SDK context.

All 146 Claude quality traces contain no SDK evidence text. Context-hook responses registered file watches; the short-lived asynchronous brokers were cancelled at session end, with no hook execution failure observed. The historical without-context control also changed grades across candidates 05 and 06 (two losses, four gains) while prompts, rubrics and canonical skills stayed fixed. That is a diagnostic observation, not a randomized A/A experiment or permission to change the frozen grades. No causal SDK fix is established for these remaining losses.

The next publication step requires a reproduced context-related mechanism or an explicit measurement-protocol decision. Do not select a passing rerun, alter original rubrics, or add unrelated task coaching to the facts-only SDK hook. The [candidate 06 case results](2026-10-15-context-only-06.json) preserve all original grades and sample sizes.

## Candidate 07 interrupted measurement

The owner-approved protocol uses the exact Claude Opus 5.5 judge, three actor repetitions per case and three judge votes per answer, with ordered native tool evidence. Tasks, rubrics, skills and configuration are identical across each host's context arms. The no-plugin comparison remains separate. Original failures above retain their original grades.

The frozen plan contains 876 actors. Native execution ended with 826 results: 800 valid, 26 infrastructure-invalid and 50 never started. Codex completed all 438 planned actors; only cases never started before its original operation deadline continued. No completed actor or judge vote was repeated. Claude's fixed OAuth credential expired, interrupting its actors and judging.

At the initial interruption, 88 answers had all three valid Opus votes, producing 39/438 complete pairs. The observed 0 losses among those sparse pairs cannot establish nonregression. The [per-skill report](2026-10-15-context-only-07.json) preserves that original snapshot: trigger, negative and outcome counts, denominators, infrastructure failures and every case/pair. Later diagnostic judging is separate and does not repair missing or invalid actors. Codex skill-use measurements remain absent.

This campaign is incomplete and cannot approve publication. The later context and canonical-import corrections have their own deterministic and focused native evidence; they do not inherit approval from this earlier source. Candidate 11 is preparation only. Public plugin 0.2.1 and the inactive P4 state are unchanged.

### Completed diagnostic grading, October 16

All 279 separately admitted diagnostic calls ended. Together with the original 36 calls, 309 calls were valid and six invalid. The retained actor population is unchanged: 749 answers have three valid votes, forming 335 complete pairs with ten losses. The original 26 invalid actors, 50 unstarted actors and 51 native-valid answers without three valid votes remain explicit. No completed actor or judge slot was repeated.

The [final diagnostic report](2026-10-16-context-only-07-diagnostic.json) contains every skill's trigger, negative and outcome counts, each arm's sample sizes, every pair and the original fixture limitations. These are diagnostic results on the earlier source, not release approval for the corrected candidate. The original interruption snapshot above remains unchanged.

## Subsequent focused-run catalog qualification

The later Claude runs 09, 12, 13, 14, 16, 19, 21, 22 and 26 omitted both frozen MCP mock tools from their native tool catalogs. All 93 retained executions have this configuration difference. Their grades describe standalone task answers; they cannot demonstrate matched improvement over candidate 07. Three run-26 profile answers additionally lack the task's required mock and are invalid for task outcomes. The earlier qualification of only those three answers was too narrow.

Original traces, scores and incomplete denominators are preserved. This finding does not change the original candidate-07 comparison, whose arms retain their original configuration. Codex deliberately had no MCP servers in either arm; the Claude omission does not establish a Codex configuration change. The corrected fixture and later source require their own verification. No focused run approves publication or substitutes for the complete two-host gate.

## Original Codex grounded-retrieval qualification

Candidate 07 deliberately used empty MCP maps in both Codex arms. Its three grounded retrieval tasks (`plugin-mcp-status`, `plugin-event-profile` and `plugin-mcp-read-guidance`) therefore lacked the mock tools their successful outcomes require: 18 native-valid executions, with three repetitions per task and arm. Their original grades remain unchanged. Truthful unavailability is not converted to a pass, and these answers cannot establish installed-plugin MCP behavior. This limitation does not imply different configuration between the original Codex arms.

A local stdio fixture now reproduces the exact original tool catalog and both mocked response bodies. Transport calls, invalid-input rejection and shutdown were checked without a model or public request. This is preparation only: Codex execution remains unverified because its account quota is exhausted. A future campaign needs separately admitted identical mock configuration in both arms; this preparation does not alter candidate 07 or approve publication.

## Current corrected-source comparison

Candidate 28 is an unfinished development comparison, separate from the original campaigns and focused checks. It freezes canonical source `acf5f853b0758136b0f2cbd924b7553bdc6d1250` and the tested context runtime `ca420f82a329570b446ce7c92a60daf0cf0d6a5e`. Both Claude arms retain the original 73 tasks, rubrics and mock tools, Claude Code 2.1.301 and Sonnet 5.5. Only the two host context-hook documents differ. Three repetitions per case and arm require 438 Claude responses and three Opus 5.5 votes per response. The 438 Codex responses remain unstarted because of quota.

The corrected credential-guidance fixture passed 21 standalone Claude answers with 63 valid Opus votes and the original mock catalog verified in every native run. That prerequisite does not substitute for this complete comparison. No completed actor or judge slot from an earlier campaign is replaced. Native catalog and source checks precede judging; capture-only process scores are retained separately. The full two-host publication gate remains open, and public plugin 0.2.1 is unchanged.

All 438 Claude actor executions then completed with valid native evidence. The first judge batch consumed three votes: two valid and one invalid. The invalid native response finished normally after receiving all twelve inputs but mistyped one identifier. Its entire call remains invalid; no identifier or grade is repaired. The other 108 planned judge calls remain unstarted, and no answer has three valid original votes. Judging stopped after its already-running calls finished. The retained result cannot approve publication.

The owner then authorized a separately reported structured-output grading revision over those same actor answers. Exact Opus 5.5, max effort, three votes and the task rubrics remain fixed. Only the output representation and bounded native validation mechanism change; general tools and external retries remain prohibited. All six existing calibration controls passed their expected verdicts in all three votes, with one native turn and one structured-output call each. Full grading remains incomplete. A provider session-quota rejection consumed one call without grades; only calls never started may continue after capacity returns. It does not rerun actors, replace original grades or approve the incomplete two-host release.

### Lifecycle criterion ambiguity

In one retained `arkiv-entity-lifecycle-trigger` answer, two judges interpreted the frozen phrase "immutable payload/content/flags" as requiring a new entity for every payload replacement. The third accepted the answer's distinction between mutable patches, readonly entities and immutable creation flags. The task does not specify a readonly entity. [SDK 0.8.1 source](https://unpkg.com/@arkiv-network/sdk@0.8.1/src/actions/wallet/patchEntity.ts), byte-equal to the installed source, and the [official parameter reference](https://docs.arkiv.network/typescript-sdk/api-reference/main/type-aliases/patchentityparameters/) permit payload replacement and an optional content type.

The original two-fail/one-pass result remains unchanged. This is an ambiguity in the measurement, not proof that the whole answer is correct: its separate claim that supplying payload requires supplying content type is also incorrect. No source change should falsely prohibit supported mutable patches. Any future rubric amendment or regrading requires a separate explicit decision; this campaign continues to report its original criteria and failures.
