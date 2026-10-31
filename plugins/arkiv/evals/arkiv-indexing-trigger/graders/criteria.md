---
type: llm
weight: 1
---

Fetch selected typed columns, including needed bytes() values, rather than treating operation logs as complete entity contents. SDK 1.0 reads current head state and cannot supply pinned block-end history. For current-state projection use bounded scoped scans, unchanged-head/coordinated-writer baseline checks, event invalidation plus full reconciliation and explicit gap/reset identity. Commit the owned projection, source identity and progress atomically; sweep Entity Expiration even without logs. Exact historical requirements need an independently verified archive or must stop with an explicit gap; never attach later head data to an old checkpoint. No execution may be fabricated. Judge only these requested behaviors.
