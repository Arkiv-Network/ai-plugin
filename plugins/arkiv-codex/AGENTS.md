# Arkiv plugin for Codex CLI

This package contains Arkiv skills and one Devfolio (Arkiv: Global Tour Stop) MCP connection at https://mcp.arkiv.network/devfolio. Start a new Codex session after installing, then invoke the Arkiv router with $arkiv. Load only the task skill it selects. The router carries the essential safety rules even when the SDK is absent.

Codex does not run the Claude rules hook. After you review and trust the package hooks, a read-only local hook reports the installed SDK version category at session start and on prompts when it changes; it makes no network requests, stores nothing on disk and never blocks the session. This AGENTS.md is package documentation; installing the plugin does not inject it into the consumer project's instructions. Only add templates/AGENTS.snippet.md to a project's AGENTS.md when the developer explicitly requests it, preserving their existing instructions.

Before executable SDK code, inspect the manifest, lockfile and installed declarations for SDK >=0.8.1 <0.9 on Tiramisu; ask for missing evidence. Ask for the query, filters, sort, expected cardinality, stable IDs, trusted creator, public/private fields, permissions, retention, architecture and signer custody. Installation authorizes no SDK installation, wallet connection, signing, feedback or transaction. Before writes obtain explicit operation, network, authorized signer and spending scope. Never request signing keys in chat.

Read the existing connection's actual server_status and confirm profile devfolio before saying CONNECTED. Otherwise report NOT CONNECTED. Do not add a duplicate connection or switch profiles. Synthetic fixtures do not establish live service health.

Skills are real files imported from one fixed canonical Git revision; never edit imported files. See the distribution README for installation, client evidence and maintenance commands. Desktop, IDE and other clients need their own tests; CLI evidence does not certify them.
