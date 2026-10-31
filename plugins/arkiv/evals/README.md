# Behavioral evaluations

This suite separates answer outcomes from observed tool use. The [historical import receipt](../../../source/evals-import.json) retains original source hashes. The reviewed [SDK 1.0 amendment lock](../../../source/evals-sdk1.lock.json) binds current prompts, rubrics and the renamed untrusted-entity-data case to their earlier bytes and reasons. Current inputs target typed schema columns on Rabdi. Binary contents belong in named `bytes()` columns. Deprecated compatibility cases remain retired; no active case was removed.

The migration preserves case categories, allowed tools, turn/time limits, grader types/weights, process indicators and the 1.0 pass threshold. Controlled system-prompt rules and API expectations now match SDK 1.0: actual name grammar, current-head pagination and explicit historical gaps. No signing, publication or secret-disclosure permission was added. Earlier results used different inputs and do not establish scores for this revision.

`node scripts/check-sdk-vocabulary.mjs` checks all current repository contents and file/directory names, including both hosts' hooks/scripts, source hooks/rules, docs and tests. The [closed exception list](../../../source/sdk-vocabulary-exceptions.json) explains the two published encryption helper symbols. The temporary canonical-reference waiver in `source/vocabulary-policy.json` binds only the two exact link occurrences at line 25, their raw blobs, the two canonical reference filenames and matching lock metadata. Unrelated links, inline/fenced code and added occurrences fail; remove this waiver after importing the reviewed upstream rename. All preserved historical files, sections and original case identities are explicitly listed and hash-bound in that policy. The SDK 1.0 amendment checks also reject changed control thresholds, tampered historical receipts and unreviewed current bytes.

Every case has an outcome grader and a process grader. Positive skill-invocation graders use `arm: with-only`; the evaluator omits these indicators from both ablation scores. Negative cases explicitly use `arm: both` with zero allowed Arkiv skill calls. Rule-only process checks prohibit Bash; their controlled system-prompt rules do not prove the startup hook loaded. Test the actual hook separately in native sessions.

Run from the repository root with Claude Code 2.1.296 or newer. Set an isolated `CLAUDE_CONFIG_DIR` first, authenticate normally if needed, and choose a new absolute output directory outside the checkout:

```bash
claude plugin eval plugins/arkiv --ablation with-without --mocks record --runs 3 -j 2 --no-publish --trust-plugin --output-dir /absolute/new-eval-output --json /absolute/new-eval-output/run.json --report /absolute/new-eval-output/report.html
```

Mock files under `mocks/arkiv` are synthetic, fixed, read-only responses. `_tools.json` preserves the supported input shapes from the maintained MCP source; the fixture data is not production evidence. Servers and tools without mocks stay withheld. Never pass `--allow-real-servers` or `--mocks off`: these evaluations require synthetic responses and must not send production MCP traffic. Neither the mock nor this suite signs, broadcasts, submits feedback or modifies account settings.

The pass threshold is 1.0. Keep original failures, inspect invocation indicators separately from scores, and report with/without outcomes and incomplete provider runs honestly. Do not change a rubric to erase a supported failure. Built-in model graders are the system under test; this suite does not authorize another model to review the implementation.

The authored MCP profile fixture still deliberately uses General. The event-profile case requires observing that synthetic General response and asking the human to add the appropriate event URL; it cannot establish the production plugin profile. The typed-query fixture now describes schema values and bounded current-head pagination, retaining its exact retrieval marker. Historical source digests and retained results are preserved separately from current amended inputs. This migration has not been behaviorally evaluated; old scores do not certify it.
