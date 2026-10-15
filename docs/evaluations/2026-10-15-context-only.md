# Context-only evaluation, October 15, 2026

**NO GO. No new hooks are released.** Claude has four new aggregate failures among 73 complete pairs. Codex completed 32 pairs, but native skill-file policy rejections make its skill-quality gate invalid. The later source correction is also outside this frozen candidate.

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
