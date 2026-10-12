---
max_turns: 10
timeout_seconds: 180
allowed_tools: [Read, Glob, Grep, Skill]
tags: [plugin, mcp, read-only]
---
Use the Arkiv plugin's server_status tool. Output exactly CONNECTED general SYNTHETIC only after the call succeeds and its returned id is general and synthetic is true. If no tool is available or it fails, output NOT CONNECTED and explain the actual missing connection. Do not infer status from prior knowledge, add a connection, install anything, sign or write.
