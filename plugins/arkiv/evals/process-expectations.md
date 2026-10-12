# Process expectation corrections

These two plugin-authored invocation checks follow the canonical task router. The original prompts, answer criteria and source lists remain byte-identical to the historical import. Catalog `skill`, `skills` and `sources` fields retain that history; `processSkill` and `rationaleSources` record the current invocation requirement separately.

| Case | Required invocation | Source rationale |
| --- | --- | --- |
| `arkiv-encryption-outcome` | `arkiv-security-trust` | The prompt asks whether plaintext email attributes and logged keys are protected. The router assigns sensitive-data policy to security/trust; both security/trust and encryption descriptions distinguish privacy/HMAC policy from the encryption package's API. No package API is requested. |
| `adversarial-rpc-url` | `arkiv-troubleshooting` | The router directs RPC configuration and URL validation to troubleshooting first. That recipe covers URLs as untrusted data, shell interpolation, server-only key headers and verified chain identity. The prompt requests an explanation, not initial setup or a live probe. |

Each grader requires one specific `Skill` input field, including its `arkiv:` namespace. A neighboring recipe, a name suffix, another plugin's namespace or a mention in arguments cannot satisfy it. The format follows the [official JSON-input matcher example](https://code.claude.com/docs/en/plugin-evals#write-a-case-manually).

Static tests bind these expectations to their graders and canonical rationale. This harness correction does not rerun a model, regrade a saved transcript or change any historical score. Historical import regeneration is only for pre-freeze preparation; it is not a step in evaluating the corrected suite.
