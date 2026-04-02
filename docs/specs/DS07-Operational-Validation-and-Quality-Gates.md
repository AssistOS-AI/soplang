# DS07 - Operational Validation and Quality Gates

## Role of This Document

This document defines how runtime changes are validated before acceptance in SOP-Lang Pipeline. It translates architecture and language constraints into evidence-oriented validation rules that keep regressions detectable.

## Validation Vocabulary

- `Quality gate` is a repeatable validation scenario aligned to one failure class.
- `Validation evidence` is observable output that demonstrates pass or fail with runtime attribution.
- `Acceptance scope` is the mandatory set of gates for a given change category.

## Quality Direction

Validation remains evidence-first and attribution-first. Requirements without executable validation mapping are treated as incomplete design work. Runtime-affecting changes are accepted only when relevant mandatory gates pass.

## Expectations

- Validation work covers parser, graph, dispatch, plugin, and persistence impact based on actual change surface.
- Validation reporting remains attributable to document identity, variable identity, and command context when applicable.
- Restart scenarios are included whenever stateful subsystems are changed.

## Requirements

- Runtime-affecting design expectations map to executable or automatable validation scenarios.
- Failed validations provide evidence sufficient for root-cause analysis without speculative reruns.
- Validation outcomes remain attributable and reproducible for the same input and context.
- Language normalization gates verify that identical source and context produce identical normalized command structures.
- Graph invalidation gates verify that local changes recompute only downstream closure.
- Dispatch diagnostics gates verify that unknown commands and unresolved member methods produce variable-level diagnostics.
- Persistence continuity gates verify that restart preserves clocks, dependencies, values, and diagnostics.
- Plugin isolation gates verify that provider replacement under stable contracts preserves orchestration semantics.
- Restart-bound gates verify that repeated dependency-shape changes stop at configured retry limits with explicit build failure evidence.
- Custom-type restoration gates verify that restored instances remain callable through member dispatch.
- Changes that alter command interpretation pass normalization, graph invalidation, and dispatch diagnostics gates.
- Changes that alter planning or stale logic pass graph invalidation, persistence continuity, and restart-bound gates.
- Changes that alter plugin integration pass dispatch diagnostics, plugin isolation, and relevant persistence gates.
- Changes that alter persistence behavior pass persistence continuity and custom-type restoration gates.
- Changes that alter custom-type lifecycle pass dispatch diagnostics, persistence continuity, and custom-type restoration gates.

## Constraints

- Validation cannot rely only on manual visual inspection.
- Validation cannot accept ambiguous outcomes without attributable evidence.
- Validation cannot skip restart scenarios for stateful runtime changes.

## Invariants

- A requirement without validation mapping is incomplete.
- A gate without attributable evidence is invalid evidence.
- A failed mandatory gate is never treated as accepted behavior.
- Parser and graph changes are not accepted without automated downstream-scope evidence.

## Examples

- If a parser change modifies execution modifiers handling, acceptance requires normalization evidence for equivalent source, recomputation-scope evidence for affected closures, and diagnostics evidence for unknown command handling.
- If a persistence-layer change modifies variable update storage, acceptance requires restart continuity evidence for clocks and diagnostics plus callable restoration evidence for persisted custom objects.

## Validation Criteria

- Each runtime-affecting change is classified by impacted subsystem.
- Required gates are selected according to the impacted subsystem.
- Gate results include attributable evidence.
- Mandatory gate failures block acceptance.
- Successful gate sets are recorded with enough detail to repeat validation under the same conditions.

## Open Questions

- Gate structure for controlled parallel recomputation experiments remains to be defined.
- Evidence comparison rules for nondeterministic provider outputs under fixed orchestration constraints remain to be defined.
- Automatic rollback policy after repeated restart-limit failures remains to be defined.
