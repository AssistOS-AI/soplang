# DS01 - Vision

## Role of This Document

This document defines the strategic rules for SOP-Lang Pipeline as a document-centered runtime. Its purpose is to lock the working style and the non-negotiable engineering boundaries used by [DS02 - Architecture](specsLoader.html?spec=DS02-Architecture.md), [DS03 - Language and Execution Model](specsLoader.html?spec=DS03-Language-and-Execution-Model.md), and [DS04 - Variable Graph and Reactivity](specsLoader.html?spec=DS04-Variable-Graph-and-Reactivity.md).

## Project Context

SOP-Lang Pipeline executes command text embedded in documents and preserves runtime continuity across edits and restarts. The runtime is intentionally stateful because incremental computation depends on persisted variable definitions, dependency edges, logical clocks, and diagnostics. The project favors explainability over opaque optimization, so each output must remain attributable to a command context and variable identity.

## Core Terms

- `Document scope` is the primary namespace boundary and variable identity follows the `docId/varName` form.
- `Normalized command` is the canonical representation of one executable line with one output target, one command identity, ordered inputs, input types, and execution modifiers.
- `Dependency edge` is a directed relation from consumer variable to producer variable used for planning and stale detection.
- `Chain alias` is an internal variable produced from dot notation so field-level dependencies remain explicit in the graph.
- `Logical clock` is the persisted timestamp used to compare freshness between a variable and its dependencies.
- `Variable diagnostics` are persisted runtime annotations such as `errorInfo`, `warningInfo`, and `debugInfo` attached to variable records.

## Vision Direction

The project direction keeps the document as the default execution boundary because namespace coherence, traceability, and recompute impact are easier to reason about in document scope than in global script scope. Dependency-driven recomputation remains the default execution model because source order cannot explain incremental behavior after edits. Persistence remains part of normal runtime semantics because restart continuity is a functional requirement, not an optional operational mode. Extension remains contract-based through plugins, command registration, and custom type registration, and extension points are allowed only when parser and graph semantics remain stable.

## Expectations

- Runtime-facing work preserves explicit dependency visibility and avoids hidden execution channels.
- Parser-facing work keeps normalization deterministic for identical source and context.
- Persistence-facing work preserves clocks and diagnostics so restart can continue from evidence.
- Specification updates describe behavior as enforceable rules and not as product storytelling.

## Requirements

- Runtime state remains representable as variable records connected by explicit dependency graph state.
- Recompute scheduling evaluates stale status from persisted clocks and executes only stale or forced variables in dependency-safe order.
- Command execution uses one dispatch and diagnostics model for built-ins, registered commands, and object-member calls.
- Cross-document access stays explicit through references such as aliases and is never inferred from implicit global scope.

## Constraints

- Hidden dependencies discovered only as side effects are forbidden as planning evidence.
- Build paths that bypass persisted graph or variable records are forbidden in normal execution.
- Optimizations that remove attribution evidence are forbidden.
- Design changes that increase capability at the cost of explainability are out of scope.

## Invariants

- A successful variable update has one current persisted clock value for the effective target.
- Recompute impact stays inside downstream closure, including explicit alias-based cross-document links.
- Runtime failures remain attributable to variable identity and command context.
- Replacing a plugin implementation under the same contract does not redefine parser normalization and graph semantics for unchanged inputs.

## Examples

- When an upstream variable changes in one document, the runtime reanalyzes only affected command sections, refreshes only affected dependency edges, and recomputes only stale downstream variables while disconnected branches preserve clocks and values.
- When a command fails during recomputation, diagnostic evidence is written on the output variable and remains available after restart until a later successful update supersedes it.

## Validation Criteria

- A local source edit does not trigger recomputation in disconnected branches.
- Restarting without source changes preserves stable branches without recomputation.
- Unknown commands or unresolved member calls attach diagnostics to the output variable.
- Successful recomputation updates `clock` and `updateTime`.
- Plugin replacement under stable contracts preserves behavior for unchanged documents.
