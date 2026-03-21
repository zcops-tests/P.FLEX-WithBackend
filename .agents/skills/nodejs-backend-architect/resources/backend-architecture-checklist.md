# Backend Architecture Checklist

Use this checklist before finalizing a backend proposal.

## Scope and boundaries

- Is the service boundary clear?
- Is the backend modular by domain or capability?
- Is the architecture simpler than the problem, not more complex?

## Data and consistency

- Are entities, unique keys, and relationships defined?
- Are indexes derived from real query paths?
- Are consistency-sensitive operations identified?
- Is idempotency needed for retries or external callbacks?

## API and contracts

- Are request and response shapes stable?
- Are validation rules explicit?
- Are pagination and filters designed intentionally?
- Are error cases documented?

## Operations

- Are logs, metrics, health checks, and traces accounted for?
- Is rollout or migration risk addressed?
- Is rollback or mitigation possible?
