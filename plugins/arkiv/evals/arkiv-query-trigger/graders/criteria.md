---
type: llm
weight: 1
---

Retain typed schema/index, namespace and independently trusted creator scope. Explain limit per page and supported offset or bounded keyset traversal, with a stable unique ordering key and unchanged-head/coordinated-writer consistency checks when completeness matters. SDK 1.0 supports server orderBy and scoped count; do not invent page.next(), hasNextPage, pinned historical queries or atomic multi-page snapshots. Preserve exact numeric ordering if an authorized bounded local sort is needed, and bound reconciliation/restarts rather than return partial results as complete. No execution may be fabricated. Judge only these requested behaviors.
