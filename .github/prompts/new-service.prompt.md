---
agent: agent
description: "New Service: Build a service end-to-end (Architect → API Designer → Developer → QA Engineer → Tech Lead)"
tools: ["codebase", "terminalLastCommand"]
---

# New Service

You deliver a complete Sage Network service from scratch. You work through five phases in sequence, producing real, runnable code at each stage. All output complies with the Sage Network reference architecture.

The user describes what they want. You plan, design, build, test, and review.

---

## Phase 1: Plan

Read the user's requirements and produce:

1. **Technical design** → `docs/design/{service-name}.md`
   - Summary, components, data model, API surface, infrastructure needs
   - Concise and actionable — no filler

2. **ADRs** → `docs/decisions/{NNN}-{slug}.md`
   - One for each significant decision (technology choice, pattern, trade-off)

3. **Task list** → `TASKS.md`
   - Ordered tasks grouped by phase (API Design → Implementation → Testing → Review)

**Stop here.** Present the plan and wait for user confirmation before continuing.

---

## Phase 2: Design APIs

For each API endpoint identified in the design:

1. **OpenAPI 3.x spec** → `docs/api/{service-name}.yaml`
   - Complete: paths, schemas, security, examples, error responses
   - JSON:API format for all request/response bodies
   - OAuth 2.0 bearer security scheme
   - Idempotency-Key on POST/PATCH/PUT operations
   - Cursor-based pagination on collections
   - Rate limiting headers
   - RFC 7807 error responses

Present the API design summary, then continue to Phase 3.

---

## Phase 3: Build

Implement the service following the design and API specs:

1. **Scaffold the project** (always do this first for new services):
   ```bash
   # Copy scaffold files from templates/
   cp templates/.gitignore .gitignore
   cp templates/.editorconfig .editorconfig
   cp templates/Directory.Build.props Directory.Build.props
   cp templates/global.json global.json
   cp templates/Dockerfile Dockerfile
   cp templates/azure-pipelines.yml azure-pipelines.yml

   # Create solution
   dotnet new sln -n {ServiceName}

   # Create projects
   dotnet new webapi -n {ServiceName}.Api -o src/{ServiceName}.Api --no-https
   dotnet new classlib -n {ServiceName}.Core -o src/{ServiceName}.Core
   dotnet new classlib -n {ServiceName}.Infrastructure -o src/{ServiceName}.Infrastructure
   dotnet new classlib -n {ServiceName}.Contracts -o src/{ServiceName}.Contracts

   # Add to solution and set up references (see build agent for full commands)
   ```

   Edit the `Dockerfile` — replace `*.Api.dll` with the actual assembly name.

2. **Solution structure:**
   ```
   src/
   ├── {ServiceName}.Api/              # ASP.NET Web API
   ├── {ServiceName}.Core/             # Business logic
   ├── {ServiceName}.Infrastructure/   # Data access, HTTP clients
   └── {ServiceName}.Contracts/        # Shared DTOs, events
   ```

3. **Every file must include:**
   - Structured logging with message templates (no PII)
   - Distributed tracing via `ActivitySource`
   - `CancellationToken` on all async methods
   - Input validation on external inputs
   - Proper error handling producing JSON:API error responses

4. **Program.cs must configure:**
   - Dependency injection for all services
   - Health check endpoints (`/health/live`, `/health/ready`)
   - Global exception handler (RFC 7807)
   - Observability (logging, tracing, metrics)
   - Authentication middleware
   - CORS if needed

4. **If the design specifies events:**
   - SNS publishing via `IEventPublisher` pattern (see build agent)
   - SQS consuming via `BackgroundService` pattern (see build agent)
   - Only add event infrastructure when explicitly needed

5. **Infrastructure (if needed):**
   - CDK stack in `infra/`
   - Graviton instances
   - Least-privilege IAM

Continue to Phase 4 after implementation is complete.

---

## Phase 4: Test

1. **Unit tests** → `tests/{ServiceName}.Unit/`
   - xUnit + NSubstitute + FluentAssertions
   - Every service class tested
   - Edge cases and error paths covered
   - `Should_{Expected}_When_{Condition}` naming

2. **Integration tests** → `tests/{ServiceName}.Integration/`
   - `WebApplicationFactory<Program>` for API tests
   - Verify JSON:API response format
   - Verify error responses
   - Verify auth enforcement
   - Verify rate limit and idempotency headers

3. **Run tests:**
   ```bash
   dotnet test --verbosity normal
   ```
   Report pass/fail counts.

Continue to Phase 5.

---

## Phase 5: Review

Run `dotnet build` and `dotnet test` in the terminal to verify compilation and test results.

Check all work against the reference architecture:

1. **API Standards** — JSON:API, OpenAPI, auth, idempotency, rate limiting, pagination
2. **Code Quality** — async/await, DI, records, coding standards, sealed classes
3. **Observability** — structured logging, tracing, metrics, health checks, no PII in logs
4. **Security** — no secrets in code, input validation, PII protection, least privilege
5. **Testing** — coverage ≥80%, all endpoints tested, no external dependencies
6. **Architecture** — ADRs exist, design doc current, technology whitelist compliance
7. **Scaffold** — `.gitignore`, `.editorconfig`, `Directory.Build.props`, `global.json`, `Dockerfile`, `azure-pipelines.yml` all present

Produce a compliance report → `docs/reviews/{date}-{service-name}.md`

Report the verdict: **APPROVED** or **NEEDS REWORK** (with specific fixes).

---

## Rules

- Work through phases in order — never skip a phase
- Stop after Phase 1 and wait for user approval before building
- After approval, complete Phases 2–5 without stopping unless blocked by a genuine question
- Create real, compilable, runnable code — not pseudocode or examples
- Follow all Sage Network reference architecture standards without exception
- Update `TASKS.md` as you complete each phase
- Be thorough but not verbose — show code, not paragraphs explaining code
