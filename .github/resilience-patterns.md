# Sage Network — Resilience Patterns

These patterns are mandatory reference for all Developer and Architect work.
Each pattern was derived from real production failures; apply them unless an ADR documents an explicit architectural reason not to.

---

## Pattern 1: ETL Atomic Table Swap

**Problem:** ETL jobs that write directly to the live table cause partial data to be visible during processing. If the job fails midway, the table is left in a corrupt state.

**Anti-pattern (never do this):**
```python
# BAD: Glue job writes directly to production table, then swaps inside the same job
glue_context.write_dynamic_frame(frame, "catalog", "production_table")
# If this fails, partial data is live
catalog_client.update_table(table_name="production_table", ...)
```

**Correct pattern:**
```
Glue Job → writes to staging table (e.g., ppf_directory_staging)
         → job completes successfully → emits completion event (SNS/EventBridge)
         ↓
Post-job Lambda (triggered by event)
         → validates staging table (row count, schema, checksums)
         → performs atomic rename/swap: staging → production
         → if validation fails: do NOT swap, raise alert
```

**Rules:**
1. Glue job is stateless — it only writes to staging. It never touches production.
2. Swap is performed by a separate Lambda, not by the Glue job itself.
3. Swap is only attempted after explicit validation passes.
4. If validation fails, the old production data remains intact.
5. Reference in CDK: create both `staging` and `production` table resources; swap via Glue Catalog `UpdateTable` API in the post-job Lambda.

**Tests required:**
- Job fails midway: verify production table unchanged
- Staging validation fails: verify swap does not occur
- Happy path: verify production table updated atomically

---

## Pattern 2: Distributed Rate Limiting

**Problem:** In-memory rate limiters (e.g., `IMemoryCache`-backed) are per-instance. With N > 1 ECS tasks running, each instance has its own counter — the effective limit is `N × configured limit`.

**Anti-pattern (never do this):**
```csharp
// BAD: per-instance in-memory limiter — ineffective at N > 1
services.AddRateLimiter(options =>
    options.AddFixedWindowLimiter("api", cfg =>
    {
        cfg.PermitLimit = 1000;
        cfg.Window = TimeSpan.FromMinutes(1);
    }));
```

**Correct pattern — Redis-backed:**
```csharp
// GOOD: distributed Redis limiter — shared counter across all instances
services.AddStackExchangeRedisCache(options =>
    options.Configuration = configuration["Redis:ConnectionString"]);

// Use a Redis sliding window counter, keyed on clientId or IP
// Example using AspNetCoreRateLimit with Redis:
services.AddInMemoryRateLimiting(); // replace with Redis equivalent
services.Configure<IpRateLimitOptions>(configuration.GetSection("IpRateLimiting"));
services.AddSingleton<IIpPolicyStore, DistributedCacheIpPolicyStore>();
services.AddSingleton<IRateLimitCounterStore, DistributedCacheRateLimitCounterStore>();
```

**Or use API Gateway for public-facing endpoints:**
- API Gateway request throttling (per-stage, per-method, per-client)
- No application-level rate limiter needed; let the gateway handle it

**Rules:**
1. Any service that may run at N > 1 instances MUST use distributed rate limiting.
2. Redis connection string MUST come from Secrets Manager — never hardcoded.
3. Rate limiter MUST be keyed on authenticated client identity (not IP address alone for authenticated APIs).
4. Response MUST include `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset` headers.

**Tests required:**
- Start 2 instances of the service locally (or via Testcontainers)
- Send 1,100 requests across both instances
- Verify exactly 1,000 succeed and 100 receive 429 (not 2,000 succeed)

---

## Pattern 3: External Auth with Local Validation + Fallback

**Problem:** Lambda authorizers and middleware that call an external auth service on every request create a single point of failure. If the auth service is unavailable, all requests fail — even for clients with valid tokens.

**Anti-pattern (never do this):**
```csharp
// BAD: every request makes an external call to validate the token
var response = await _authServiceClient.ValidateTokenAsync(token);
if (!response.IsValid) return Unauthorized();
// If auth service is down, ALL requests fail
```

**Correct pattern:**
```csharp
// GOOD: validate JWT signature locally first (fast, no network call)
// Only call external service for role enrichment, not for validity
public async Task<ClaimsPrincipal?> ValidateAsync(string token, CancellationToken ct)
{
    // Step 1: Local JWT signature + claims validation (always)
    var principal = _jwtValidator.ValidateSignatureAndClaims(token);
    if (principal is null) return null; // invalid token — reject immediately

    // Step 2: Enrich with roles (cached, with fallback)
    var roles = await _roleCache.GetOrFetchAsync(
        principal.GetClientId(),
        fetchAsync: ct => _authService.GetRolesAsync(principal.GetClientId(), ct),
        fallback: _roleCache.GetCachedRoles(principal.GetClientId()), // use stale if unavailable
        ct);

    return principal.WithRoles(roles);
}
```

**Rules:**
1. JWT signature and issuer/audience validation MUST happen locally — never outsourced entirely to an external call.
2. Role/permission enrichment from an external service MUST be cached (IDistributedCache).
3. Cache TTL: short enough to pick up permission changes (e.g., 5 minutes), not indefinite.
4. If the auth service is unreachable during enrichment: use stale cached roles if available; otherwise deny access (fail closed, not fail open).
5. Circuit breaker on the external auth client — see Pattern 5.
6. Document the chosen fallback strategy explicitly in the design doc (Section: Security Perimeter, Question 3).

**Tests required:**
- Auth service returns 200: verify access granted with correct roles
- Auth service returns 500: verify cached roles used, access still granted
- Auth service returns 500, no cache entry: verify 503 returned (not 401 and not silent access)
- Invalid JWT signature: verify 401 regardless of auth service state

---

## Pattern 4: Database Connection Pooling

**Problem:** Creating a new database connection on every request is expensive and creates a connection storm under load. Improper pool sizing causes request queuing. Credentials from Secrets Manager that are rotated can invalidate pooled connections.

**Correct pattern (PostgreSQL / Npgsql):**
```csharp
// Program.cs — register NpgsqlDataSource as singleton (manages the pool)
builder.Services.AddNpgsqlDataSource(
    connectionString: builder.Configuration.GetConnectionString("Postgres")!,
    dataSourceBuilderAction: b =>
    {
        b.MaxPoolSize = 20;          // tune per service; default 100 is too high for ECS
        b.MinPoolSize = 2;           // keep warm connections for burst traffic
        b.ConnectionIdleLifetime = 300; // recycle idle connections every 5 min
        b.ConnectionPruningInterval = 60;
    });

// Repository — inject NpgsqlDataSource, open connection per operation
public class MyRepository(NpgsqlDataSource dataSource)
{
    public async Task<IReadOnlyList<MyEntity>> GetAllAsync(CancellationToken ct)
    {
        await using var conn = await dataSource.OpenConnectionAsync(ct);
        // ... execute query
    }
}
```

**Credential rotation (Secrets Manager):**
```csharp
// Use IOptionsSnapshot<DatabaseOptions> so credentials refresh without restart
// Or implement a custom NpgsqlDataSource factory that refreshes on rotation event
// Never store credentials in appsettings.json — always from Secrets Manager
```

**Rules:**
1. `NpgsqlDataSource` registered as singleton — one per application lifetime.
2. `MaxPoolSize` set based on RDS instance limits divided by expected task count.
3. Credentials from Secrets Manager — never connection strings in config files.
4. Health check MUST include database connectivity: `/health/ready` returns 503 if DB unreachable.

**Tests required:**
- Send 50 concurrent requests: verify all succeed without connection errors
- Block DB port (failure injection): verify `/health/ready` returns 503
- Restart service: verify pool warms up without errors on first requests

---

## Pattern 5: Circuit Breaker / Bulkhead for External Calls

**Problem:** When an external dependency (auth service, third-party API, another internal service) is slow or unavailable, requests pile up waiting for timeouts. Without a circuit breaker, a slow dependency brings down the whole service.

**Correct pattern (using Polly v8 / Microsoft.Extensions.Resilience):**
```csharp
// Program.cs — resilience pipeline for any external HTTP client
builder.Services
    .AddHttpClient<IAuthServiceClient, AuthServiceClient>()
    .AddResilienceHandler("auth-service", pipeline =>
    {
        // Timeout: individual request
        pipeline.AddTimeout(TimeSpan.FromSeconds(5));

        // Retry: transient errors only, with exponential backoff
        pipeline.AddRetry(new HttpRetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromMilliseconds(200),
            BackoffType = DelayBackoffType.Exponential,
            ShouldHandle = args => ValueTask.FromResult(
                args.Outcome.Exception is HttpRequestException ||
                (args.Outcome.Result?.StatusCode >= HttpStatusCode.InternalServerError))
        });

        // Circuit breaker: open after 5 failures in 30s window, stay open 30s
        pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
        {
            FailureRatio = 0.5,
            SamplingDuration = TimeSpan.FromSeconds(30),
            MinimumThroughput = 5,
            BreakDuration = TimeSpan.FromSeconds(30),
            OnOpened = args =>
            {
                _logger.LogWarning("Circuit breaker opened for auth-service. Duration: {Duration}", args.BreakDuration);
                return ValueTask.CompletedTask;
            }
        });
    });
```

**Fallback strategy:**
```csharp
// When circuit is open, return a meaningful fallback — not an unhandled exception
try
{
    return await _authServiceClient.GetRolesAsync(clientId, ct);
}
catch (BrokenCircuitException)
{
    _logger.LogWarning("Auth service circuit open. Using cached roles for {ClientId}", clientId);
    return _roleCache.GetCachedRoles(clientId) ?? throw new ServiceUnavailableException("auth-service");
}
```

**Rules:**
1. Every HTTP client for an external service MUST have a Polly resilience pipeline.
2. Timeouts MUST be set — never rely on default HttpClient timeout (100s is too long).
3. Circuit breaker MUST be logged when opened and when reset.
4. Fail closed (deny access) when fallback is not available — never fail open (grant access).
5. Bulkhead (concurrency limiter) optional but recommended for high-traffic services to prevent thread pool starvation.
6. Do NOT retry on 4xx responses — only on 5xx and network errors.

**Tests required:**
- External service returns 500 three times: verify retry, then 503 returned to caller
- External service slow (> timeout): verify timeout exception, not indefinite hang
- Circuit open: verify fallback used, circuit-open logged
- Circuit resets after break duration: verify requests resume

---

## Quick Reference

| Pattern | Use when | Key rule | Anti-pattern to avoid |
|---------|----------|----------|-----------------------|
| 1 \u2014 ETL Atomic Swap | Any ETL / batch job | Swap in separate Lambda, not in job | Glue job swapping production table |
| 2 \u2014 Distributed Rate Limiting | N > 1 instances | Redis-backed or API Gateway | In-memory `IMemoryCache` limiter |
| 3 \u2014 Auth + Local Validation | Any authenticated service | Validate JWT locally first | Trust external auth entirely |
| 4 \u2014 Connection Pooling | Any DB-backed service | `NpgsqlDataSource` singleton | `new NpgsqlConnection()` per request |
| 5 \u2014 Circuit Breaker | Any external HTTP call | Polly pipeline + logged on open | Raw `HttpClient` with no resilience |
