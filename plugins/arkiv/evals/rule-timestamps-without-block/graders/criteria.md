---
type: llm
weight: 1
---

Use u64(Date.now()) imported from @arkiv-network/sdk/schema for the value in both writes and predicates; declare the matching u64() schema column and index it if filtering. Explain bare-number i32 range failure. Do not replace the timestamp with a string or lose type consistency.
