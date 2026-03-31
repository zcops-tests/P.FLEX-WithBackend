# Angular 21 Patterns

Use this reference for Angular work in this repository.

## Architecture

- Organize by feature or route boundary first.
- Keep route shells responsible for orchestration, permissions, and data loading.
- Keep presentational components focused on rendering and local interaction.
- Keep services focused on transport, mapping, and cross-cutting concerns.
- Keep feature-local state near the feature unless multiple routes truly share ownership.

## Reactivity

- Prefer signals for local UI state and derived view state.
- Prefer `computed` for derived values instead of duplicating state.
- Use `effect` only to synchronize with external systems or imperative APIs.
- Use RxJS for async workflows, transport boundaries, and stream composition where signals alone are not enough.
- Bridge RxJS and signals with `toSignal`, `toObservable`, and `takeUntilDestroyed` instead of manual cleanup patterns.

## Components and templates

- Use standalone components by default.
- Keep component APIs explicit with `input()`, `output()`, and `model()` when helpful.
- Keep templates declarative and avoid expensive method calls inside bindings.
- Use `@if`, `@for`, and `@switch` for readable control flow.
- Always provide stable tracking in repeated rendering.
- Split templates when they become hard to scan or when multiple concerns share one file.

## Forms

- Prefer typed reactive forms for complex forms, dynamic validation, or multi-step flows.
- Use template-driven forms only for small, simple forms with light validation.
- Keep validation messages close to the control and submission errors visible at the form level.
- Prevent duplicate submissions when mutations are not safely repeatable.

## Routing and data

- Prefer route-level lazy loading for large features.
- Scope providers to routes or features when it improves ownership.
- Normalize backend shapes in services or adapters before data reaches UI components.
- Keep auth, session, and permission concerns explicit at route and feature boundaries.

## Performance

- Prefer `ChangeDetectionStrategy.OnPush` for new or hot-path components when it reduces render churn.
- Replace repeated template work with computed state or pre-shaped view models.
- Use `@defer` for secondary or below-the-fold content when it meaningfully improves interaction.
- Bound list size and question large third-party dependencies.
- Keep images, icons, and animation costs proportional to the screen's needs.

## Security

- Treat all backend data and route-derived values as untrusted.
- Avoid `bypassSecurityTrust...` unless the trust boundary is documented and reviewed.
- Be careful with `[innerHTML]`, dynamic URLs, downloads, and embedded content.
- Never place secrets, privileged decisions, or server-only business rules in the client.
