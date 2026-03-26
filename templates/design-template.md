# {Feature/Service Name} — Technical Design

**Date:** {YYYY-MM-DD}
**Author:** {name or agent}
**Status:** Draft | Approved | Implemented
**Service Type:** API | ETL | Event-driven | Scheduled job | Mixed

## Summary

One paragraph: what we are building, why, and for whom.

## Components

| Component | Type | Purpose | Dependencies |
|-----------|------|---------|-------------|
| {Name} | API Controller | {what it does} | {deps} |
| {Name} | Service | {what it does} | {deps} |
| {Name} | Repository | {what it does} | {deps} |
| {Name} | CDK Stack | {what it does} | {deps} |

## Data Model

| Entity | Property | Type | Notes |
|--------|----------|------|-------|
| {Entity} | Id | string | Primary key |
| {Entity} | {field} | {type} | {constraints} |

### Relationships
- {Entity A} has many {Entity B}

## API Surface

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/{resources} | List all | Bearer |
| GET | /v1/{resources}/{id} | Get by ID | Bearer |
| POST | /v1/{resources} | Create | Bearer + Idempotency-Key |
| PATCH | /v1/{resources}/{id} | Update | Bearer + Idempotency-Key |
| DELETE | /v1/{resources}/{id} | Delete | Bearer |

All responses follow JSON:API. Full spec: `docs/api/{service}.yaml`.

## ETL Data Contract

<!-- Remove this section if not an ETL service -->

**Status:** LOCKED | PENDING

> ⚠️ If PENDING, Developer cannot start until this is LOCKED. Placeholder code is not acceptable.

| Field | Source Name (exact) | Type | Notes |
|-------|---------------------|------|-------|
| {field} | {exact name from schema} | {type} | {constraints} |

- **Schema version:** {version, date}
- **Schema source:** {URL or document reference}
- **Sample records:** {location of test data in repo or S3}

## Infrastructure

| Resource | AWS Service | Notes |
|----------|-------------|-------|
| Compute | ECS Fargate (Graviton ARM64) | {task size, min/max capacity} |
| Database | RDS / DynamoDB | {engine, size} |
| Secrets | Secrets Manager | {rotation schedule} |
| Rate Limiting | Redis ElastiCache / API Gateway | {must be distributed if N>1 instances} |

## Assumptions This Architecture Makes

<!-- MANDATORY — every assumption is a risk that must be mitigated or explicitly accepted. -->

| # | Assumption | Fallback if Wrong | Risk Level | How We Test |
|---|-----------|-------------------|------------|-------------|
| 1 | {e.g., Auth service always available} | {e.g., Cached roles + deny on downtime} | P0 | {e.g., Circuit breaker + failure injection} |
| 2 | {e.g., Data schema stable at v3.x} | {e.g., Schema version locked in ADR-0xx} | P1 | {e.g., Contract test against real sample} |

> ❌ No assumption may have an empty Fallback column. If no fallback exists, it is a P0 risk requiring arch review before proceeding.

## Failure Modes & Resilience

<!-- MANDATORY — document how the service behaves when each dependency fails. -->

| # | Failure Mode | Trigger | Behaviour | Mitigation | Test |
|---|-------------|---------|-----------|------------|------|
| 1 | DB unreachable | RDS failover | Return 503 with RFC 7807 body | Retry 3x with backoff, then 503 | Failure injection: block DB |
| 2 | Auth service down | External service 500/timeout | {deny / fallback to cached roles?} | Circuit breaker + cache | Failure injection: block auth service |
| 3 | Rate limit at N>1 instances | Per-instance limiter | Users bypass limit | Distributed Redis limiter | N=2 instance test, 1100 requests |

## Security Perimeter

<!-- MANDATORY — draw the trust boundaries and answer every question. -->

```
[Client] --(HTTPS)--> [ALB/API GW] --(validates token?)--> [ECS Service] --> [RDS]
                                           ^
                                     Auth mechanism: {JWT local / Lambda authorizer / middleware}
```

1. **Authentication:** {Where does it happen? What validates the token?}
2. **Token validation:** {Local JWT signature check? Issuer/audience checked? External call?}
3. **Auth service unavailable:** {Deny all? Use cached roles? Fail open? — Document explicitly.}
4. **Load balancer exposure:** {Public or private? Why? Security Group rules?}
5. **Service-to-service:** {IAM roles? mTLS? How does ECS call RDS, S3, external APIs?}
6. **Secrets:** {All from Secrets Manager. Rotation schedule?}
7. **Sensitive data:** {What PII or business-critical data flows through? Encrypted at rest + in transit?}

## SLOs & Performance

| Metric | Target | Test |
|--------|--------|------|
| p99 latency | {e.g., < 500ms} | Load test at {n} req/s |
| Availability | {e.g., 99.9%} | Verified by monitoring |
| Error rate | {e.g., < 0.1%} | Verified by monitoring |

## Decisions

| # | Decision | Rationale | ADR |
|---|----------|-----------|-----|
| 1 | {decision} | {why} | [ADR-{N}](../decisions/{N}-{slug}.md) |

## Risks & Open Questions

| # | Risk / Question | Impact | Owner | Resolution |
|---|----------------|--------|-------|------------|
| 1 | {risk} | P0/P1/P2 | {who} | {mitigation or open} |

## Out of Scope

- {What this design intentionally does not cover}

## Approval

- **Architecture review:** {Name, Date — required before API Designer starts}
- **Tech Lead sign-off on assumptions:** {Name, Date — required before Developer starts}
