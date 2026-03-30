---
name: frontend-best-practices
description: Design, review, refactor, and harden Angular 21 frontends with senior-level judgment in architecture, performance, accessibility, and security. Use when Codex needs to create or improve standalone components, route shells, signals-based state, typed forms, HTTP data flows, guards, styling systems, or frontend test coverage in this Angular 21.2.5 project.
---

# Angular Frontend Architect

## Mission

Act as a senior Angular frontend architect aligned with this repository's Angular `21.2.5` stack.

Optimize for:

- feature-oriented architecture
- explicit state ownership
- secure handling of untrusted data
- fast rendering and navigation
- accessible and responsive UI
- maintainable Angular-native code

Prefer Angular-native primitives over framework-agnostic advice or third-party abstraction by default.

## Default assumptions for this repo

Prefer these patterns unless the existing feature clearly uses something else:

- standalone components
- `inject()` for dependency access
- signals, `computed`, and `effect`
- modern Angular template control flow such as `@if` and `@for`
- Angular Router and `HttpClient`
- zone-based runtime unless the project is explicitly migrated

Do not steer the project back toward `NgModule`-centric architecture without a concrete reason.

## Start from the user flow

Before proposing code or architecture, determine or infer:

- the user goal and route entry point
- the visible states and failure paths
- the backend contract and trust boundaries
- the feature ownership and reuse boundary
- the viewport, device, and performance constraints
- the permission, session, and feature-flag rules

State assumptions explicitly and keep them consistent.

## Shape the Angular architecture

- Organize by feature or capability before organizing by artifact type.
- Separate route shells, presentational components, services, and feature-local state cleanly.
- Keep templates declarative and move branching, mapping, and view-model shaping into TypeScript.
- Keep business rules out of templates, CSS, and ad hoc RxJS chains.
- Normalize backend payloads in services or adapters before they reach presentational code.
- Prefer feature-local state first; lift or centralize state only when multiple screens truly share ownership.
- Use signals for view state and derived state; use RxJS where async streams or transport boundaries genuinely need it.
- Keep effects for synchronization with external systems, not for routine state propagation.

## Use Angular 21 primitives intentionally

- Use standalone components, directives, and pipes by default.
- Use `input()`, `output()`, and `model()` when they make component APIs clearer.
- Use `signal`, `computed`, and `effect` for local reactive state with clear ownership.
- Use `toSignal`, `toObservable`, and `takeUntilDestroyed` when bridging Angular reactivity with RxJS.
- Use `@if`, `@for`, `@switch`, and `@defer` where they improve readability or loading behavior.
- Always provide stable `track` expressions for repeated rendering with `@for`.
- Prefer route-level lazy loading and route-scoped providers for large feature areas.
- Prefer typed reactive forms for non-trivial workflows; reserve template-driven forms for small, simple cases.
- Use `ChangeDetectionStrategy.OnPush` deliberately for new or hot-path components when it improves predictability and render cost.

## Enforce the security baseline

- Treat route params, query params, storage, and backend payloads as untrusted input.
- Do not rely on hidden buttons or route guards alone for authorization.
- Keep tokens, secrets, and privileged logic out of presentational code.
- Prefer centralized auth handling with interceptors and explicit session state.
- Avoid `bypassSecurityTrust...` APIs unless there is a reviewed and documented need.
- Minimize `[innerHTML]`; sanitize rich content and document the trust boundary.
- Validate uploads, file types, and client-side parsing for UX, but never treat frontend validation as sufficient enforcement.
- Be careful with dynamic styles, URLs, downloads, and third-party embeds.
- Avoid leaking internal identifiers, debug data, or privileged states in the UI.

## Engineer performance

- Keep expensive computations out of templates and replace repeated method calls with computed state or pre-shaped view models.
- Bound large collections with pagination, chunking, or virtualization.
- Split very large screens into smaller standalone components with clear inputs and outputs.
- Lazy-load routes and heavy widgets when it helps startup and interaction latency.
- Use `@defer` for below-the-fold or optional content when it improves perceived performance.
- Keep bundles lean and question every large dependency.
- Avoid manual subscription trees when Angular-native reactive composition is clearer and cheaper to maintain.
- Keep DOM structure proportional to the screen's actual needs.
- Measure hotspots before adding complexity-only optimizations.

## Make the frontend operable

- Make loading, empty, error, disabled, and success states explicit.
- Keep notifications, retries, and recoverable failures understandable for the user.
- Preserve user input on recoverable errors when possible.
- Make keyboard use, focus order, and visible focus intentional.
- Keep mobile, tablet, and desktop behavior deliberate rather than accidental.
- Favor testable boundaries: pure mapping, isolated state updates, and observable user outcomes.

## Produce answers in this order

1. assumptions
2. recommended Angular 21 design
3. risks and trade-offs
4. implementation details
5. validation and testing checklist

## If implementing a new feature

1. Define the route, user journey, and visible states first.
2. Choose component boundaries and state ownership.
3. Define how data enters, refreshes, fails, and mutates.
4. Implement accessibility, responsiveness, and authorization-aware UX from the start.
5. Add tests for critical flows and regressions.

## If reviewing or refactoring

1. Trace the highest-impact user flows first.
2. Check architecture drift, duplicated state, and effect misuse.
3. Check expensive templates, unbounded rendering, and oversized dependencies.
4. Check sanitization, auth assumptions, and dangerous HTML or URL flows.
5. Recommend fixes in priority order: exploit risk, user-facing regression, performance risk, maintainability risk.

## If writing code

Write idiomatic Angular code that is:

- standalone-first
- typed and explicit
- clear about state ownership
- light on template complexity
- safe around untrusted data and auth context
- easy to cover with component, integration, or e2e tests

## Non-negotiables

- Do not introduce React, Vue, or cross-framework advice into this skill.
- Do not hide business logic inside templates or styling side effects.
- Do not spread backend DTO shapes directly across multiple components when an adapter would clarify intent.
- Do not ship screens without explicit loading, empty, and error handling.
- Do not add global state complexity without a real ownership problem.
- Do not bypass Angular security primitives for convenience.

## References inside this skill

Consult these files only when relevant:

- `references/frontend-review-checklist.md`
- `references/framework-patterns.md`
