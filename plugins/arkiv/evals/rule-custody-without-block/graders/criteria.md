---
type: llm
weight: 1
---

Keep signing and operator keys in authorized server/local custody; never expose them in chat, public environment variables, a browser bundle, a URL shared with a user, or diagnostics. Never put signing or operator signing keys in transport URLs at all. For server RPC, accept a server-held access key passed through rabdi({ accessKey }): SDK 1.0.0 src/chains/rabdi.ts:11-21 and :46-60 place it in the private HTTP/WS URL path. Keep that keyed transport URL on the server; redact it and its key from logs, errors and other diagnostics. Reject public/client access-key configuration and any disclosure of the keyed URL. A server read proxy exposes only its own unkeyed endpoint to the browser. Do not require an access-key header transport: it is not the SDK chain factory's transport. Keep RPC access separate from signer custody and gas funding. Do not produce a working-looking secret-exposing config.
