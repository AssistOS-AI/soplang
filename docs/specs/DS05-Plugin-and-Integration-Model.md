# DS05 - Plugin and Integration Model

## Role of This Document

This document defines integration rules for plugins in SOP-Lang Pipeline. It clarifies how plugin capabilities can extend runtime behavior while preserving parser, dispatch, graph, and persistence semantics.

## Integration Vocabulary

- `Plugin` is a named runtime dependency resolved through plugin loading.
- `Plugin contract` is the callable API surface expected by runtime consumers.
- `Plugin family` groups contracts that serve a similar operational purpose.
- `Integration failure` is a plugin outcome that prevents successful command or workflow completion.
- `Extension point` is a registration path that adds commands or custom runtime types without changing parser core logic.

## Plugin Direction

Integration remains contract-first and capability-specific. Core runtime behavior is stable under provider replacement when contracts remain unchanged. Extensions remain legal only when they preserve dispatch consistency, graph visibility, and variable-level diagnostics.

## Expectations

- Plugin implementations expose failures explicitly and do not convert execution failures into silent no-op behavior.
- Provider adapters stay behind contracts and do not leak transport details into language and graph layers.
- Extension code uses normal variable update flows so clocks and diagnostics remain coherent.

## Requirements

- Workspace orchestration plugins expose graph and variable operations required by build and runtime helpers.
- Document plugins expose create, update, read, delete, and structure operations for documents, chapters, and paragraphs.
- Persistence plugins expose durable storage and indexed retrieval for runtime entities.
- Code manager plugins expose retrieval and storage for script artifacts used by import paths.
- LLM plugins expose stable text and chat completion operations across providers.
- Chat room plugins expose chat creation, history retrieval, message publication, and subscription behavior.
- Agent plugins expose lifecycle and configuration operations for runtime agents.
- Plugin loading resolves declared dependencies before operational methods are invoked.
- Initialization failures stop dependent runtime flows and remain explicit.
- Plugin call failures that influence output variables are captured as variable-level diagnostics.
- Plugin-backed state changes respect the same persistence and diagnostics semantics as core runtime behavior.
- Runtime registration allows new command handlers and new custom runtime types through official extension points.
- Registered extensions keep document-scoped execution boundaries and do not bypass command dispatch, dependency extraction, or variable update persistence.

## Constraints

- Plugin code must not create hidden dependencies that bypass graph extraction.
- Plugin error handling must not swallow failures that influence output variables.
- Provider-specific details must not leak into parser and graph contracts.
- Replacing plugin implementation under stable contract must not require core-language behavior changes.

## Invariants

- Plugin-influenced output changes remain traceable to command and variable identity.
- Integration failures remain visible in runtime diagnostics.
- Core orchestration semantics remain stable under plugin replacement with unchanged contracts.
- Plugin integration does not redefine normalization or dependency planning algorithms.

## Examples

- When a provider adapter for LLM changes but the contract remains stable, unchanged SOP commands continue to normalize and execute the same way and graph behavior remains unchanged.
- When a plugin initialization fails, dependent flows stop with explicit failure evidence rather than continuing in degraded silent mode.

## Validation Criteria

- Replacing one provider adapter preserves parser and graph behavior for unchanged commands.
- Plugin initialization failure stops dependent flows with explicit evidence.
- Network or provider failures are captured as variable-level execution failures.
- Registering a new command or custom type executes through standard dispatch, graph, and persistence paths.
