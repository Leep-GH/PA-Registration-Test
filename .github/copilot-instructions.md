# Copilot Instructions — Sage Network Services

You are working on a Sage Network service. All code, designs, and infrastructure must comply with the Sage Network reference architecture. These instructions apply to every interaction.

## Tech Stack

- **Language:** C# / .NET 8+ (LTS releases only)
- **Cloud:** AWS (primary)
- **Infrastructure as Code:** AWS CDK
- **CI/CD:** Azure DevOps Pipelines
- **Source Control:** GitHub
- **Observability:** NewRelic (structured logs, distributed traces, custom metrics)
- **Edge / CDN:** Cloudflare
- **Auth:** OAuth 2.0 via Sage Network Auth
- **API Standard:** REST following JSON:API specification, documented with OpenAPI 3.x
- **Compute:** AWS Graviton (ARM64) preferred for cost and performance

## Universal Guardrails

These are non-negotiable. Apply them to every piece of work.

### Code Standards (C#)

1. Target .NET 8+ (current LTS)
2. Enable nullable reference types (`#nullable enable`)
3. `async`/`await` throughout — never use `.Result`, `.Wait()`, or `Task.Run()` for async-over-sync
4. Pass `CancellationToken` on every async method
5. Use `record` types for DTOs and value objects; `class` for services with behaviour
6. Constructor injection for all dependencies via built-in .NET DI
7. Configuration via `IOptions<T>` / `IOptionsSnapshot<T>` pattern
8. No static mutable state; no singletons outside the DI container
9. `sealed` on classes not designed for inheritance
10. XML documentation comments on all public members
11. Guard clauses at method entry (`ArgumentNullException.ThrowIfNull`)
12. Pattern matching over type-checking (`is` patterns, `switch` expressions)

### API Standards

1. All REST APIs must follow the **JSON:API** specification (jsonapi.org)
2. Every API must have an **OpenAPI 3.x** specification file
3. URL format: `/{version}/{resources}` — plural nouns, kebab-case, no verbs
4. Standard HTTP methods and status codes only
5. Error responses follow **RFC 7807** Problem Details
6. Cursor-based pagination via JSON:API page parameters
7. All mutating endpoints must support **Idempotency-Key** header (IETF draft)
8. Rate limiting on all public endpoints — include `X-Rate-Limit-*` response headers
9. OAuth 2.0 bearer tokens for authentication
10. W3C **Trace Context** headers (`traceparent`) for distributed tracing
11. Content type: `application/vnd.api+json`
12. No breaking changes within a version; deprecate via `Sunset` header

### Observability (mandatory on every service)

1. **Structured logging** in JSON format routed to NewRelic
   - Use message templates: `_logger.LogInformation("Processing {InvoiceId}", id)`
   - Never string-interpolate log messages
   - Never log PII (emails, names, addresses, phone numbers, tokens)
   - Propagate correlation IDs on every request
2. **Distributed tracing** with `System.Diagnostics.ActivitySource` and W3C Trace Context
3. **Custom metrics** for business operations (`System.Diagnostics.Metrics`)
4. **Health endpoints:** `/health/live` (liveness) and `/health/ready` (readiness)

### Security

1. No secrets in code, config files, or source control — use AWS Secrets Manager or Parameter Store
2. Input validation on all external inputs (model validation + FluentValidation where complex)
3. PII must never appear in logs, traces, or error responses returned to clients
4. OWASP Top 10 mitigations applied
5. Network Auth (mTLS / token exchange) for all service-to-service communication
6. Principle of least privilege for IAM roles and policies

### Testing

1. **Unit tests** for all business logic — target ≥80% line coverage
2. **Integration tests** for all API endpoints using `WebApplicationFactory<Program>`
3. **Contract tests** to validate API implementation matches OpenAPI specification
4. Tests must not depend on live external services — use mocks, stubs, or testcontainers
5. xUnit as test framework, NSubstitute for mocks, FluentAssertions for assertions
6. Arrange-Act-Assert pattern; one assertion concept per test
7. Descriptive test names: `Should_{Expected}_When_{Condition}`
8. No real PII in test data

### Infrastructure

1. AWS CDK for all infrastructure provisioning
2. Prefer Graviton (ARM64) instances
3. Define SLOs for every production service
4. DR playbook required for production services
5. Environment alignment: dev → staging → production

### Process

1. **ADRs** required for every significant technical decision — use `templates/adr-template.md`
2. Feature branches with pull request reviews
3. Conventional commit messages preferred
4. All changes must pass CI (build + test + lint) before merge

## Agent System

The team has two access patterns:

**Start here — the front door:**

| Agent | File | Role |
|-------|------|------|
| Team Lead | `.github/agents/Team-Lead.agent.md` | Discuss requirements, orchestrate the right agents |

**Specialist agents (orchestrated by Team Lead, or used directly):**

| Agent | File | Role |
|-------|------|------|
| Architect | `.github/agents/Architect.agent.md` | Design, ADRs, task planning |
| API Designer | `.github/agents/API-Designer.agent.md` | OpenAPI 3.x specifications |
| Developer | `.github/agents/Developer.agent.md` | .NET/C# source code |
| QA Engineer | `.github/agents/QA-Engineer.agent.md` | Unit, integration, contract tests |
| Tech Lead | `.github/agents/Tech-Lead.agent.md` | Compliance review |

**`/` prompts — for full end-to-end workflows:**

| Prompt | File | Role |
|--------|------|------|
| new-service | `.github/prompts/new-service.prompt.md` | Full pipeline for a new service |
| new-feature | `.github/prompts/new-feature.prompt.md` | Full pipeline for a new feature |

Typical pipeline: **Team Lead** (orchestrates) → **Architect → API Designer → Developer → QA Engineer → Tech Lead**

### Project Layout (created by agents)

```
project/
├── .gitignore                   ← From templates/ (Build agent)
├── .editorconfig                ← From templates/ (Build agent)
├── Directory.Build.props        ← From templates/ (Build agent)
├── global.json                  ← From templates/ (Build agent)
├── Dockerfile                   ← From templates/ (Build agent)
├── azure-pipelines.yml          ← From templates/ (Build agent)
├── {ServiceName}.sln            ← Created by Build agent via dotnet CLI
├── docs/
│   ├── design/          ← Technical designs (Planner)
│   ├── api/             ← OpenAPI specs (API Designer)
│   ├── decisions/       ← ADRs (Planner)
│   └── reviews/         ← Compliance reports (Reviewer)
├── src/                 ← Service code (Developer)
├── tests/               ← Test projects (QA)
├── infra/               ← CDK stacks (Developer)
└── TASKS.md             ← Task tracker (Planner)
```

When acting as any agent:
1. Read existing project files before making changes
2. Check `docs/decisions/` for prior ADRs
3. Check `TASKS.md` for current status
4. Write output to the correct directory
5. State what you did and what the user should do next
