# Behavioral evaluations

This suite separates answer outcomes from observed tool use. Historical active-skill prompts and answer rubrics are imported unchanged from the revision in [the import receipt](../../../source/evals-import.json). Deprecated compatibility cases are retired because that entrypoint is excluded from this plugin. New cases check real mocked MCP calls and concrete developer questions before choosing a model.

Every case has an outcome grader and a process grader. Positive skill-invocation graders use `arm: with-only`; the evaluator omits these indicators from both ablation scores. Negative cases explicitly use `arm: both` with zero allowed Arkiv skill calls. Rule-only process checks prohibit Bash; their controlled system-prompt rules do not prove the startup hook loaded. Test the actual hook separately in native sessions.

Run from the repository root with Claude Code 2.1.296 or newer. Set an isolated `CLAUDE_CONFIG_DIR` first, authenticate normally if needed, and choose a new absolute output directory outside the checkout:

```bash
claude plugin eval plugins/arkiv --ablation with-without --mocks record --runs 3 -j 2 --no-publish --trust-plugin --output-dir /absolute/new-eval-output --json /absolute/new-eval-output/run.json --report /absolute/new-eval-output/report.html
```

Mock files under `mocks/arkiv` are synthetic, fixed, read-only responses. `_tools.json` preserves the supported input shapes from the maintained MCP source; the fixture data is not production evidence. Servers and tools without mocks stay withheld. Never pass `--allow-real-servers` or `--mocks off`: General test traffic cannot currently be classified with the known operator credentials. Neither the mock nor this suite signs, broadcasts, submits feedback or modifies account settings.

The pass threshold is 1.0. Keep original failures, inspect invocation indicators separately from scores, and report with/without outcomes and incomplete provider runs honestly. Do not change a rubric to erase a supported failure. Built-in model graders are the system under test; this suite does not authorize another model to review the implementation.
