---
max_turns: 10
timeout_seconds: 180
allowed_tools: [Read, Glob, Grep, Skill]
tags: [plugin, mcp, read-only]
---
Read guides/synthetic-typed-query with the Arkiv MCP read_knowledge tool, then explain its marker and the type, pagination and trust scope it specifies. Use the successful response as evidence. If the tool is unavailable, say so without inventing the marker. This is a synthetic read-only fixture. Do not install, configure, sign, broadcast or submit feedback.
