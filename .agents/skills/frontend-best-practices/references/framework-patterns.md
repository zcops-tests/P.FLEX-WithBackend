# Framework Patterns

Read only the section for the framework in use.

## Cross-framework defaults

- Prefer the framework's standard state, routing, and form patterns before introducing new libraries.
- Keep rendering declarative and side effects explicit.
- Move backend shape normalization to adapters, services, or query layers instead of spreading it across UI code.
- Keep reusable UI primitives generic and product features specific.

## Angular

- Keep templates declarative and move complex branching or data shaping into TypeScript.
- Prefer `async` pipe, signals, or framework-native reactive bindings over manual subscription management when possible.
- Tear down long-lived effects and subscriptions intentionally.
- Keep services focused on data access or cross-cutting concerns, not arbitrary component state.
- Use typed forms where available and keep validation messages close to the control.
- Split large feature shells into smaller presentational components when templates become difficult to scan.

## React

- Keep render functions pure and derive state instead of mirroring props unnecessarily.
- Use effects to synchronize with external systems, not as a default place for business logic.
- Keep server-state fetching and caching in a clear query layer when remote data is central.
- Prefer composition over deep prop drilling or broad context when a narrower boundary is possible.
- Keep hooks focused and avoid creating abstractions that only hide simple state.

## Vue

- Keep templates readable and move complex logic into computed properties or composables.
- Prefer computed state over watchers when values are derivable.
- Keep composables narrow and centered on one responsibility.
- Make side effects inside watchers explicit and easy to clean up.
- Avoid hiding business rules inside template directives when a named method or computed property would be clearer.
