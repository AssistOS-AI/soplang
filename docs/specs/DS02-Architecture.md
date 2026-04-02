# DS02 - Architecture

## Role of This Document

This document defines the runtime architecture that links document editing, command normalization, dependency planning, execution, and persistence. The document sets architectural behavior rules and excludes implementation shortcuts that would break incremental recomputation, diagnostics attribution, or restart continuity.

## Architectural Vocabulary

- `Document service layer` manages documents, chapters, and paragraphs and triggers command reanalysis when content changes.
- `Normalization layer` transforms command text into normalized command structures that runtime services can execute deterministically.
- `Dispatch layer` resolves command identity and routes execution to built-ins, registered commands, and object-member methods.
- `Graph layer` stores variable nodes and dependency edges and computes topological execution layers.
- `Build layer` executes variables in dependency-safe order and supports controlled restart when dependency shape changes.
- `Persistence boundary` stores documents, variables, graph state, and operational entities through plugin contracts.

## Architecture Direction

The architecture remains layered so each concern can evolve independently without redefining adjacent contracts. Document identity remains the default namespace boundary for runtime planning and diagnostics. Command execution remains centralized in one registry-based dispatch path so built-ins and extensions follow the same execution semantics. Graph planning remains clock-aware and dependency-driven. Integration remains plugin-based and must not redefine parser or graph semantics.

## Expectations

- Architecture updates preserve strict separation between parsing, dispatch, planning, and persistence.
- Runtime flows keep variable-level traceability from source text to persisted output value and diagnostics.
- Integration changes fit existing contracts instead of embedding provider-specific assumptions in core layers.
- Code changes keep restart behavior explicit when dependency shape changes during execution.

## Requirements

- The document and structure layer persists document, chapter, and paragraph entities and treats structural edits and command edits as one coherent evolution path.
- Updating command-bearing sections triggers section-level command reanalysis and variable-definition refresh.
- The normalization layer produces one normalized representation per executable line and preserves output target, command name, ordered inputs, input types, and execution modifiers.
- Dot references are rewritten into explicit chain aliases before planning, block commands such as `macro`, `jsdef`, `form`, and `prompt` are collapsed into encoded single-line forms before final parsing, and inline bracket commands are rewritten into generated temporary variables so dependency extraction remains explicit.
- The dispatch layer runs all command families through one invocation surface and attaches diagnostics to output variables when commands are unknown, method targets are undefined, or method names are unresolved.
- Conditional member calls skip execution when inputs are missing, and forced execution semantics remain visible from normalized representation through runtime behavior.
- The graph and build layer persists graph state, refreshes edges when variable definitions change, recomputes topological layers before execution and after restart events, and evaluates stale status from logical clocks and explicit dependencies.
- Dependency-shape changes discovered during execution trigger controlled restart and replanning, and restart loops remain bounded.
- The custom type runtime layer instantiates and restores objects through the custom type registry and keeps object-member commands inside normal dispatch semantics.
- Object state mutations performed by methods persist through the same variable update flow used by other command outputs.
- The persistence and plugin layer keeps variable value, clock, and update metadata coherent on each successful update.
- Plugins load through declared dependencies, and plugin initialization and runtime failures remain visible through runtime diagnostics.

## Constraints

- Execution paths that bypass normalization are forbidden in standard runtime operation.
- Recompute decisions taken without graph and clock evidence are forbidden.
- Integration calls that influence output variables but skip variable-level diagnostics are forbidden.
- Plugin-specific transport details are not allowed to leak into parser and graph contracts.

## Invariants

- Command identity resolution remains centralized in the command registry.
- Restarted builds continue only after layer recomputation and never with stale plans.
- Parser, dispatch, graph, and persistence remain distinct responsibilities even when they are invoked in the same operational flow.

## Examples

- When a chapter command section is updated, the runtime reparses only that section, updates variable definitions, refreshes graph edges for affected outputs, recalculates layers, and computes only stale downstream nodes.
- When a method command is invoked on an undefined object variable without conditional syntax, the dispatch layer writes diagnostic evidence to the output variable and the build continues with attributable failure context.

## Validation Criteria

- Identical command text and context produce identical normalization output.
- Unknown command execution writes output-variable diagnostics.
- Cycle scenarios stop execution with attributable error evidence.
- Process restart preserves graph continuity for unchanged documents.
- Replacing plugin implementation under stable contracts preserves parser and graph behavior.
