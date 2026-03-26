# ADR-{number}: {Title}

**Status:** Proposed | Accepted | Rejected | Deprecated | Superseded by ADR-{n}
**Date:** {YYYY-MM-DD}
**Author:** {name or agent}
**Type:** API | ETL | Auth | Infrastructure | General

## Context

What is the issue or situation that prompted this decision?
Describe the forces at play: requirements, constraints, existing decisions.

## Decision

What are we deciding to do and why?
State it clearly in one or two sentences, then explain the reasoning.

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| {Option A — chosen} | {pros} | {cons} |
| {Option B} | {pros} | {cons} |
| {Option C} | {pros} | {cons} |

## Consequences

**Positive:**
- {benefit}

**Negative / Trade-offs:**
- {cost or constraint introduced}

## Assumptions This Decision Makes

<!-- MANDATORY — every decision rests on assumptions. List them all. -->

| # | Assumption | Fallback if Wrong | Risk Level | How We Test |
|---|-----------|-------------------|------------|-------------|
| 1 | {e.g., External service always available} | {e.g., Cache + deny on downtime} | P0 / P1 / P2 | {e.g., Failure injection test} |

**Risk levels:** P0 = blocks production if wrong | P1 = degraded experience | P2 = minor impact

> Every assumption MUST have a Fallback. If no fallback exists, that is a P0 risk that must be resolved before implementation starts.

## Failure Modes

<!-- MANDATORY for distributed systems, ETL, auth, and infrastructure decisions -->

| # | Failure Mode | Trigger | Behaviour | Mitigation | Test |
|---|-------------|---------|-----------|------------|------|
| 1 | {e.g., Database unreachable} | {e.g., RDS failover} | {e.g., Return 503} | {e.g., Retry + circuit breaker} | {e.g., Failure injection test} |

## Security Implications

- **Authentication:** {How is identity verified for this decision?}
- **Authorisation:** {Who is allowed to use this? What's the default?}
- **Secrets:** {Any credentials involved? Where stored? How rotated?}
- **Data exposure:** {What sensitive data is handled? How is it protected?}

## Testing & Validation

- **Unit:** {What logic is unit-testable?}
- **Integration:** {What end-to-end flow is tested?}
- **Contract:** {How is the API surface validated?}
- **Distributed:** {How do we verify it works at N > 1 instances? If applicable.}
- **Failure injection:** {How do we verify graceful degradation?}

## References

- {Link to design doc, RFC, prior ADR, or reference architecture section}

## Approval

- **Proposed by:** {Name, Date}
- **Tech Lead sign-off:** {Name, Date — REQUIRED before implementation}
