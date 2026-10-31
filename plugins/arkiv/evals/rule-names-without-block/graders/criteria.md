---
type: llm
weight: 1
---

Validate the actual SDK 1.0 name grammar: createdAt and entityType are valid case-sensitive names; _price is invalid because it starts with an underscore. Show a valid alternative such as price or price_minor. Require an ASCII letter first, then letters/digits/dot/hyphen/underscore, at most 32 bytes, no dollar prefix, double hyphen or reserved words. Do not impose a nonexistent lowercase-only rule or emit the invalid leading-underscore name as a valid SDK write.
