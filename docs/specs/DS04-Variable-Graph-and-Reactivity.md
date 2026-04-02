# DS04 - Variable Graph and Reactivity

## Role of This Document

This document defines how dependency graph state and logical clocks control incremental recomputation in SOP-Lang Pipeline. It specifies graph construction, stale detection, restart behavior, and recomputation scope boundaries.

## Graph Vocabulary

- `Graph node` represents one variable identity with dependency and layer metadata.
- `Graph edge` represents one consumer-to-producer dependency relation used for planning.
- `Stale variable` is a variable with no clock, a variable older than at least one dependency, or a variable flagged for forced execution.
- `Build layer` is a topological execution group where dependencies are resolved in earlier layers.
- `Restart event` is a controlled build reset triggered when dependency shape changes during active execution.

## Reactivity Direction

Reactivity remains graph-driven and clock-driven, not line-order driven. Scheduling remains conservative with respect to dependency correctness and incremental with respect to recomputation scope. Restart behavior remains explicit and bounded when graph shape mutates during execution.

## Expectations

- Graph updates remain explicit whenever variable definitions change.
- Stale evaluation uses persisted clocks and explicit dependency edges only.
- Reactivity changes preserve downstream-closure limits and do not introduce global invalidation by default.

## Requirements

- Every variable with a producing command is represented as a graph node.
- Every explicit dependency is represented as a graph edge.
- Chain aliases, macro-generated references, custom command dependencies, and object-host dependencies are included in dependency extraction.
- Planning computes topological layers from current graph state before execution.
- Cycle detection stops execution and produces attributable diagnostics.
- Missing dependency nodes prevent dependent execution and write diagnostics.
- Recompute eligibility compares logical clocks between node and dependencies.
- Forced execution flags keep nodes eligible regardless of clock equality.
- Recompute propagation remains bounded to downstream closure from changed or forced nodes.
- Equal-value writes may preserve prior clock so unnecessary downstream invalidation is avoided.
- Dependency-shape mutation detected during execution triggers restart and layer recalculation.
- Restart loops are bounded by explicit retry threshold.
- Restart-limit exhaustion stops build execution and preserves explicit diagnostic evidence.

## Constraints

- Graph state is treated as durable runtime evidence and not as disposable cache for active workspaces.
- Scheduling does not continue on stale layer plans after dependency-shape changes.
- Optimizations do not bypass edge registration for derived dependencies.

## Invariants

- A node is never executed before all its dependencies are available in earlier layers.
- Clock progression reflects meaningful value transition events.
- Recompute impact remains inside downstream closure boundaries.
- Graph failures remain attributable to variable identity and build context.

## Examples

- When a macro change introduces a new variable dependency, build execution restarts, recomputes graph layers, and continues on the new plan instead of continuing on stale topology.
- When one upstream variable changes value, only downstream consumers with stale clocks are recomputed and disconnected branches preserve values and clocks.

## Validation Criteria

- Local source changes do not trigger recomputation in disconnected graph branches.
- Cycle scenarios stop build execution with persisted cycle diagnostics.
- Alias retargeting refreshes graph edges and causes downstream recomputation in the next valid plan.
- Forced execution recomputes targets despite unchanged dependency clocks.
- Repeated restart-triggering mutations stop at configured retry limit with explicit build failure diagnostics.
