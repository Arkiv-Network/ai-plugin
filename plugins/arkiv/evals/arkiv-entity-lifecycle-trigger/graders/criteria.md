---
type: llm
weight: 1
---

For mutable entities, schema-aware patch set can update any schema column, including required columns and a required bytes() column; values must match the schema. Patch unset can remove only optional columns, never required columns. SDK 1.0.0 src/actions/wallet/patchEntity.ts:30-38 types set as PatchEntityValues and unset as OptionalColumnName; src/schema/attributes.ts:125-141 validates every set column and rejects unsetting required columns. Creating a replacement is needed for readonly content or immutable creation flags. Distinguish ownership change from creator provenance. Verify successful receipts and fresh selected state, only within authorized entity scope. No execution may be fabricated. Judge only these requested behaviors.
