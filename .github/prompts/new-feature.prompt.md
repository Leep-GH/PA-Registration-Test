---
agent: agent
description: "New Feature: Add a feature to an existing service (API Designer → Developer → QA Engineer → Tech Lead)"
tools: ["codebase", "terminalLastCommand"]
---

# New Feature

You add a feature to an existing Sage Network service. You read the current codebase, plan the change, implement it, test it, and review compliance — all following the reference architecture.

The user describes the feature. You deliver it.

---

## Phase 1: Understand & Plan

1. **Read the existing codebase** — understand the current structure, patterns, and conventions
2. **Read existing docs** — check `docs/design/`, `docs/api/`, `docs/decisions/` for context
3. **Identify what changes:**
   - New or modified API endpoints
   - New or modified services/models
   - New infrastructure resources
   - New or updated tests

4. **Produce:**
   - Updated design notes appended to the existing design doc, or a new doc at `docs/design/{feature-name}.md`
   - ADRs for any significant decisions → `docs/decisions/{NNN}-{slug}.md`
   - Task list → update `TASKS.md` or create a new section for the feature

**Stop here.** Present the plan and wait for user confirmation.

---

## Phase 2: Design API Changes (if applicable)

If the feature adds or modifies API endpoints:

1. **Update the OpenAPI spec** in `docs/api/{service-name}.yaml`
   - Add new paths/operations
   - Add new schemas
   - Preserve existing operations unchanged (no breaking changes)
2. Follow all API standards: JSON:API format, auth, idempotency, rate limiting, pagination

If no API changes, skip to Phase 3.

---

## Phase 3: Build

1. **Follow existing patterns** — match the conventions already in the codebase
2. Implement in the correct layers:
   - **Controllers** → `src/{ServiceName}.Api/Controllers/`
   - **Services** → `src/{ServiceName}.Core/Services/`
   - **Models** → `src/{ServiceName}.Core/Models/`
   - **DTOs** → `src/{ServiceName}.Contracts/`
   - **Data access** → `src/{ServiceName}.Infrastructure/Repositories/`
3. Add observability to all new code (structured logging, tracing, metrics)
4. Register new services in DI
5. Do not modify unrelated code

---

## Phase 4: Test

1. **Unit tests** for all new/modified service classes
2. **Integration tests** for all new/modified API endpoints
3. **Verify no existing tests are broken:**
   ```bash
   dotnet test --verbosity normal
   ```
4. Report results — new test count, total test count, pass/fail

---

## Phase 5: Review

Run the compliance checklist against the changed files:
- API standards compliance
- Code quality (async, DI, coding standards)
- Observability present on new code
- Security (no secrets, input validation, PII protection)
- Tests adequate (coverage, edge cases)

Produce a focused review report → `docs/reviews/{date}-{feature-name}.md`

---

## Rules

- Read the existing codebase first — match its patterns
- Stop after Phase 1 for user confirmation
- After confirmation, complete Phases 2–5 without stopping
- Do not introduce new patterns that conflict with existing conventions
- Do not modify code unrelated to the feature
- No breaking changes to existing APIs
- All new code must have tests
- Update `TASKS.md` as you complete each phase
