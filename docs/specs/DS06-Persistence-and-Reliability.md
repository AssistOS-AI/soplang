# DS06 - Persistence and Reliability

## Role of This Document

This document defines persistence obligations and reliability behavior for SOP-Lang Pipeline. It specifies what must remain durable, how consistency is preserved, and how recovery supports incremental recomputation after restart.

## Persistence Vocabulary

- `Variable record` is the durable entry that stores variable identity, parsed command metadata, value payload, clock, and diagnostics.
- `Graph state` is the durable dependency map used for planning and layered execution.
- `Logical timestamp` is the monotonic source used for variable clocks.
- `Recovery` is the restart sequence that reconstructs usable runtime state from persisted entities.
- `Custom type restoration` is the process that rebuilds callable runtime objects from persisted serialized payload.

## Reliability Direction

Persistence is part of normal runtime semantics and is not an optional operational add-on. Recovery behavior is incremental-first and must avoid mandatory full reingestion when unchanged durable state already provides enough planning evidence.

## Expectations

- Persistence changes preserve coherence between value payload, clock, and update metadata.
- Recovery changes preserve graph usability and variable attribution after restart.
- Shutdown paths flush in-memory state required for continuity of stale detection.

## Requirements

- Document, chapter, and paragraph entities remain durable.
- Variable entities remain durable with parsed command metadata, value payload, and diagnostics.
- Graph state remains durable and indexed for planning reuse.
- Clock values remain durable for stale-evaluation continuity.
- Operational entities required by active plugins remain durable, including users, agents, chat-user bindings, snapshots, and workspace metadata.
- Variable value transitions persist value payload, clock, and update metadata as one coherent update.
- Graph updates caused by command-definition changes are visible before dependent execution continues.
- Alias and reference identity remain durable so resolution is stable after restart.
- Custom type payload persistence remains sufficient for object restoration.
- Error, warning, and debug diagnostics remain attached to variable records until superseded.
- Recovery restores enough state for incremental recomputation without mandatory full rebuild.
- Recovery reuses durable graph and variable data for stale detection and planning.
- Recovery restores custom objects before dependent member commands execute.
- Recovery failures remain explicit and include affected entity identity in diagnostics.
- Shutdown flows flush relevant in-memory state that would otherwise break continuity.

## Constraints

- Reliability must not depend on console log history.
- Persisted state must not omit dependency or clock evidence required for stale evaluation.
- Recovery logic must not silently discard incompatible entities.

## Invariants

- Every durable variable remains traceable to document and variable identity.
- Recovered graph state remains usable for topological planning.
- Restored custom objects remain callable through dispatch.
- Diagnostic evidence remains queryable from persisted variable records.

## Examples

- After process restart with no source changes, the runtime rehydrates variables and graph state, evaluates staleness from restored clocks, and skips recomputation for stable branches.
- When one upstream variable changes and persists a newer clock, only downstream dependents recompute and unrelated branches remain unchanged.

## Validation Criteria

- A no-change restart performs zero recomputation for stable graphs.
- Updating one upstream variable recomputes only downstream dependents and advances relevant clocks.
- Restored custom-type variables remain callable through member dispatch.
- Diagnostics written before restart remain accessible after restart.
