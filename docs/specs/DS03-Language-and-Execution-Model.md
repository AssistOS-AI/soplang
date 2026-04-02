# DS03 - Language and Execution Model

## Role of This Document

This document defines how SOP-Lang command text becomes executable behavior. The scope includes normalization, execution modifiers, macro and jsdef semantics, object-member invocation, inline command expansion, and runtime diagnostics obligations.

## Language Vocabulary

- `Command line` is one executable statement that defines one output variable.
- `Normalized command` is the parsed structure that contains command identity, output target, ordered inputs, input types, and execution modifiers.
- `Conditional execution` is expressed by `?` and skips evaluation when required direct inputs are missing.
- `Forced execution` is expressed by `!` and keeps a command eligible for recomputation even when dependency clocks are unchanged.
- `Await dependency` is declared after `await` and participates in stale tracking without becoming a direct runtime value input.
- `Chain alias` is an internal variable derived from dot references to keep field-level dependencies visible.
- `Block commands` are multiline declarations such as `macro`, `jsdef`, `form`, and `prompt` that are encoded to single-line transport form before final parsing.

## Execution Model Direction

Language behavior remains deterministic at normalization level for identical source and context. Execution remains dispatch-based and not string-interpreter based. Macro expansion remains explicit in graph terms so generated commands stay attributable. Object-member commands remain part of normal command semantics and not an out-of-band execution channel.

## Expectations

- Language extensions preserve one output target per command definition and explicit input dependency modeling.
- New execution features preserve dispatch consistency and diagnostics attribution.
- Parser updates keep equivalent source normalization stable so recomputation planning remains predictable.

## Requirements

- Each executable line resolves to one normalized representation with command identity, output target, ordered inputs, input types, and execution modifiers.
- Dot-style references are rewritten into chain aliases before planning so dependency extraction remains explicit.
- Inline bracket commands are extracted into generated temporary variables before execution so hidden dependencies are not introduced.
- Block command payloads preserve semantic content through encode and decode stages.
- Command execution goes through registry dispatch.
- Conditional commands skip execution when direct inputs are missing or empty.
- Forced commands remain recompute-eligible regardless of unchanged dependency clocks.
- Unknown commands and unresolved member methods produce variable-level diagnostics.
- Member invocation executes against resolved object instances and preserves method side effects through the standard variable update path.
- Macro and jsdef declarations remain first-class language constructs and execute through the same runtime pipeline used by built-ins.
- Macro expansion preserves explicit produced and consumed variables in dependency graph state.
- Macro return behavior remains explicit through generated return alias wiring.
- Context imports declared with `~` bind to definition-context variables in predictable form.
- Dependency-shape mutations induced by macro updates trigger graph refresh and controlled restart.

## Constraints

- Execution order must not be inferred from source text order alone.
- Dependencies not present in normalized command input model are invalid planning evidence.
- Language extensions are not allowed to bypass dispatch, graph extraction, or variable-level diagnostics.

## Invariants

- Every computed output remains traceable to one normalized command definition.
- Recompute decisions remain grounded in graph and clock evidence.
- Dispatch semantics remain consistent across built-in commands, registered commands, and object-member commands.
- Equivalent source context produces equivalent normalized output.

## Examples

- When a command uses dot notation such as `$chat.history`, normalization creates an internal chain alias so the graph contains an explicit dependency from the consumer to the base object variable.
- When a command includes an inline bracket command, that bracket body is transformed into a generated temporary command and the original command consumes the temporary variable, which keeps graph visibility and diagnostic attribution explicit.

## Validation Criteria

- Equivalent source and context produce equivalent normalized command structures.
- Unknown command execution writes output-variable diagnostics with command context.
- Forced execution recomputes targets even if dependency clocks do not advance.
- Dot references appear as explicit chain-alias dependencies in graph state.
- Macro-definition updates affect only dependent expansion branches.
