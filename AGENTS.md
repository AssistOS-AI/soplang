# SOP-Lang Specification Authoring Guide

This repository uses the SOP-Lang documentation homepage as the primary entry point at [docs/index.html](docs/index.html), and the specification index at [docs/specs/matrix.md](docs/specs/matrix.md). All design-specification work must stay aligned with the DS set linked from the matrix file.

All specification writing must be in English. The wording must remain technical, explicit, and testable, and it must avoid conversational or promotional language.

The expected style for specs is paragraph-first, with lists used only when they improve clarity for compact enumerations such as strict criteria, short term definitions, or grouped validation checks. Overusing bullet points is discouraged and should be avoided.

Each DS document must preserve a rule-focused structure and must keep Requirements, Constraints, Definitions, Examples, Validation Criteria, and Invariants precise and enforceable. Invariants must be written as stable properties that remain true during normal execution and restart scenarios.

Relationships between DS documents must remain explicit. When a rule in one document depends on terminology, architecture, or behavior defined in another DS document, the text must state that relationship clearly so readers can trace design intent across the full specification set.

Specification updates must keep consistency across DS01 through DS07, and every change should preserve semantic alignment between language model behavior, graph reactivity, plugin contracts, persistence guarantees, and operational validation gates.
