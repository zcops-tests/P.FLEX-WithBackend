# Angular Frontend Review Checklist

Use this checklist when reviewing an Angular feature, auditing a screen, or validating a change before merge.

## 1. User flow and visible states

- Is the primary user action obvious?
- Are loading, empty, error, disabled, and success states explicit?
- Are permission, unavailable, and recoverable failure states handled?

## 2. Architecture

- Is the feature organized by capability or route boundary?
- Are shell, presentational, service, and state responsibilities separated clearly?
- Is state ownership obvious, or is the same data duplicated across services and components?
- Are backend DTOs normalized before they spread through the UI?

## 3. Angular patterns

- Does the code follow standalone-first Angular patterns?
- Are signals, `computed`, and `effect` used intentionally rather than mixing reactive styles arbitrarily?
- Is `effect` being used only for synchronization and side effects, not as a hidden state machine?
- Are templates readable, or is too much logic embedded in bindings?
- Does repeated rendering use a stable tracking expression?

## 4. Accessibility and responsiveness

- Can the flow be completed with keyboard only?
- Is focus visible and moved intentionally?
- Are semantic elements and accessible labels used where possible?
- Does the layout stay usable on narrow screens and touch devices?

## 5. Performance

- Is any heavy computation happening during template evaluation?
- Are large lists bounded, paginated, or virtualized?
- Are heavy screens split, lazy-loaded, or deferred when it helps?
- Are subscriptions, signals, and change-detection patterns keeping render work proportional?
- Is a large dependency being introduced without a strong reason?

## 6. Security

- Is any HTML injection path escaped or sanitized?
- Are `DomSanitizer` bypass APIs avoided unless reviewed?
- Does the UI avoid implying authorization it cannot enforce?
- Are route params, storage values, and backend payloads treated as untrusted?
- Are secrets and privileged assumptions kept out of client code?

## 7. Forms and mutations

- Is validation close to the input and also enforced on submit?
- Is duplicate submission prevented where it matters?
- Is user input preserved on recoverable failures?
- Are optimistic updates reversible when used?

## 8. Testing

- Does the change cover the main user-observable behavior?
- Are edge states and regressions covered?
- Are high-risk flows covered with component, integration, or e2e tests as appropriate?

## 9. Merge gate

Treat the change as incomplete if any of these are missing without justification:

- explicit loading, empty, or error handling
- keyboard accessibility for interactive flows
- responsive behavior for common screen sizes
- safe handling of untrusted HTML, URL, or auth-related data
- tests for high-risk behavior
