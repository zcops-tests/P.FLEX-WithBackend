---
name: nodejs-backend-architect
description: Guides the agent to design, implement, review, and harden Node.js backends with strong architecture, security, performance, observability, and production-readiness. Use this when creating or improving APIs, services, workers, integrations, or backend modules in Node.js or TypeScript.
---

# Node.js Backend Architect

## What this skill does

This skill helps the agent produce backend work that is safe, scalable, maintainable, and directly implementable.

Apply it for Node.js backends built with TypeScript or JavaScript, including NestJS, Fastify, and Express projects.

## When to use this skill

Use this skill when the task involves one or more of the following:

- creating a new backend service, API, worker, or integration
- defining backend architecture, modules, or folder structure
- designing REST endpoints, async flows, queues, jobs, or webhooks
- modeling data, migrations, consistency rules, and repository boundaries
- implementing authentication, authorization, tenant isolation, or auditability
- reviewing or refactoring an existing backend for security or performance
- preparing a backend for staging or production deployment

Do not use this skill for frontend-only work unless the task directly touches backend contracts.

## Goal

Produce backend solutions that:

- are correct by design
- minimize security risk
- avoid common performance bottlenecks
- separate responsibilities cleanly
- are observable and testable
- are ready to operate in real environments

## How to work

### 1. Understand the operating context first

Before proposing architecture or code, determine or infer:

- the business objective
- core entities and relationships
- critical user actions and permissions
- expected scale, concurrency, and latency sensitivity
- consistency requirements versus async tolerance
- hosting, database, framework, and deployment constraints

If information is missing, make conservative assumptions and keep them consistent.

### 2. Prefer the simplest architecture that will hold up

Default to a modular monolith unless there is a clear reason to split services.

Only recommend microservices, event-driven decomposition, or physical service separation when there are concrete scaling, isolation, ownership, compliance, or operational reasons.

### 3. Enforce clear backend boundaries

Keep these concerns separate:

- transport layer
- request validation
- use-case or application logic
- domain rules
- data access
- external integrations
- background processing
- serialization and response shaping

Do not bury business-critical rules inside controllers, middleware, or ORM callbacks.

### 4. Treat security and performance as baseline requirements

Always account for:

- strict input validation
- explicit authorization for sensitive operations
- secure secret handling
- safe query and pagination patterns
- bounded payload sizes and rate controls
- idempotency where retries can happen
- moving heavy work out of request-response paths

### 5. Produce concrete output

Depending on the task, deliver one or more of the following:

- module and folder structure
- architecture recommendation with trade-offs
- entity and schema design
- endpoint contracts and DTOs
- auth and authorization strategy
- performance and caching strategy
- queue and worker design
- observability and deployment checklist
- code or pseudocode ready to implement

## Decision guide

### If the user is creating a backend from scratch

1. Define scope and boundaries.
2. Choose framework and storage deliberately.
3. Design modules by domain.
4. Model data from real query patterns.
5. Define contracts before implementation.
6. Add security, observability, and testing requirements.

### If the user is auditing or refactoring an existing backend

1. Identify risk hotspots first.
2. Check authorization, validation, secrets, and error handling.
3. Review slow queries, N+1 issues, blocking work, and oversized payloads.
4. Check missing indexes, retry safety, and background job boundaries.
5. Recommend changes in priority order.

### If the user is asking for code

Write code that is:

- typed when TypeScript is available
- modular and testable
- explicit about validation and errors
- safe around external inputs and side effects
- compatible with the chosen framework conventions

## Backend standards to enforce

### Architecture

- Organize by domain or capability, not only by file type.
- Prefer dependency inversion at module boundaries.
- Keep application services focused on use cases.
- Keep repositories narrow and query-oriented.

### API design

- Use stable and predictable response shapes.
- Validate all external input.
- Support pagination, filtering, and sorting intentionally.
- Return errors that are actionable but do not leak internals.
- Make idempotent operations safe where appropriate.

### Data and persistence

- Use constraints and unique keys to enforce invariants.
- Add indexes based on actual access paths.
- Avoid ORM patterns that hide inefficient queries.
- Plan migrations for safety, reversibility, and rollout order.

### Security

- Never trust client-provided authorization context.
- Store secrets outside source code.
- Hash passwords with modern password hashing.
- Minimize token scope and lifetime.
- Verify signatures for inbound webhooks.
- Sanitize upload and file-handling flows.

### Performance

- Avoid N+1 reads.
- Avoid full table scans on critical paths.
- Avoid large synchronous CPU work in the event loop.
- Use caching only with a clear invalidation strategy.
- Push slow or retryable work to jobs or queues.

### Observability and operations

- Use structured logs.
- Include request or correlation IDs.
- Define health and readiness checks.
- Emit metrics for latency, error rate, throughput, and queue health.
- Add tracing when requests cross services or async boundaries.

### Quality

- Use strict typing when possible.
- Cover domain-critical logic with tests.
- Add integration or e2e coverage for critical flows.
- Ensure environment configuration is explicit and validated.

## Constraints

- Do not recommend insecure defaults for convenience.
- Do not over-engineer the system without evidence.
- Do not expose internal fields, secrets, tokens, or stack traces.
- Do not assume eventual consistency is acceptable for money, inventory, permissions, or irreversible side effects.
- Do not treat rate limiting, authorization, or validation as optional.

## Output format

When useful, structure the response in this order:

1. assumptions
2. recommended design
3. risks and trade-offs
4. implementation details
5. validation or testing checklist

## References inside this skill

Consult these files when relevant:

- `resources/backend-architecture-checklist.md`
- `resources/security-performance-checklist.md`
- `examples/module-template.md`
- `examples/api-contract-template.md`
