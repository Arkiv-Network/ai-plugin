# Short project-rule sources

The short block in `always-on.md` is generated for SDK-declaring projects only. It is intentionally below one KiB and points to the namespaced router. Full task guidance stays in skills pulled on demand.

| Rule | Canonical evidence in the imported source |
| --- | --- |
| SDK range, Tiramisu and declaration inspection | `skills/arkiv/SKILL.md`, “Start with the source and the task”; `skills/arkiv-first-write/SKILL.md`, project-rules block |
| Lowercase attribute names and reserved words | `skills/arkiv/SKILL.md`, “Rules that prevent real failures”; `skills/arkiv/references/limits.md`; `skills/arkiv-data-modeling/SKILL.md`, “Storage rules” |
| `u64(Date.now())` and matching predicate types | `skills/arkiv/SKILL.md`, timestamp rule; `skills/arkiv-data-modeling/SKILL.md`, explicit constructors; published SDK 0.8.1 attribute/query declarations linked by those skills |
| Access and local signing-key custody | `skills/arkiv/SKILL.md`, credential rule; `skills/arkiv-security-trust/SKILL.md`; `skills/arkiv-first-write/SKILL.md`, project-rules block |
| Router for Arkiv work | `skills/arkiv/SKILL.md`; namespace follows the Claude Code plugin format |

All paths resolve below `plugins/arkiv`. The [skill receipt](skills.lock.json) binds the original source bytes. SDK `latest` was separately observed as 0.8.1 before packaging; that registry observation does not establish future compatibility or a live transaction. Native hook execution and controlled rule-pair evals are separate checks.
