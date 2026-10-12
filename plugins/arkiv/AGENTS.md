# Arkiv plugin consumer guide

This installable package combines namespaced Arkiv skills, the hosted General MCP connection and a small SessionStart rules hook. Start an Arkiv task with `/arkiv:arkiv`, then load only the task guidance it recommends. It does not install the SDK, provide a wallet, sign or broadcast transactions.

Before executable SDK calls, inspect the project's manifest, lockfile and installed declarations. Ask for missing local evidence. Before a model, ask for the required queries, expected size, public/private fields, creator/owner policy, app stack and Entity Expiration. Before any write, obtain explicit network, operation, signer and spending scope. Never ask for private keys in chat.

The hook reads the current project's `package.json` only and activates when a dependency field declares `@arkiv-network/sdk`. Node.js 20+ must be on PATH. No package mutation, network access or SDK installation occurs in the hook.

Guidance is imported from a fixed canonical skills revision. Do not edit bundled skill files; changes belong upstream. Maintainers build and verify from the distribution repository root with `node scripts/build-plugin.mjs --check`, `node scripts/check-static.mjs`, `node --test tests/*.test.mjs` and strict Claude plugin validation.

Do not add `CLAUDE.md` to this installable root: it is not loaded and creates a strict validation warning. Keep test profiles isolated and real General MCP traffic excluded; behavioral tests use `evals/mocks/arkiv` and `--mocks record --no-publish`. Eval responses are synthetic and do not prove current production status.
