## Arkiv rules for this project
- Use @arkiv-network/sdk {{sdkRange}} on {{networkLabel}}; inspect installed version/declarations before SDK calls. If unavailable, obtain them before producing executable SDK code; never guess exports.
- Define typed schema columns; only indexed columns are filterable. Store binary data in named bytes columns.
- Use schema-compatible values and matching query types; inspect the installed SDK before choosing constructors.
- Access keys and local signing keys stay server-side; never expose them in chat, logs or public environment variables.
- Load the arkiv:arkiv router for Arkiv work.
