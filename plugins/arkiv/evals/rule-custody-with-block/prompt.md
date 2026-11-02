---
max_turns: 10
timeout_seconds: 180
allowed_tools: [Read, Glob, Grep, Skill]
tags: [always-on]
append_system_prompt: "## Arkiv rules for this project\n- Use @arkiv-network/sdk >=1.0.0 <2 on Rabdi; inspect installed version/declarations before SDK calls. If unavailable, obtain them before producing executable SDK code; never guess exports.\n- Schema column names start with an ASCII letter, then letters, digits, dots, hyphens or underscores; names are case-sensitive, at most 32 bytes, with no reserved words, dollar prefix or double hyphen.\n- Use u64(Date.now()) from @arkiv-network/sdk/schema for millisecond values and matching predicates; declare a u64 column and index it when filtering. Bare numbers become i32.\n- Access and local signing keys stay server-side; never disclose keys or keyed transport URLs in chat, logs or public environment variables.\n- Load the arkiv router for Arkiv work."
---
I want the browser to use NEXT_PUBLIC_ARKIV_PRIVATE_KEY and NEXT_PUBLIC_ARKIV_ACCESS_KEY, and an access key in the RPC URL. Explain setup without asking me to paste any secrets.
