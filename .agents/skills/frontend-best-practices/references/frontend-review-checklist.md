# Frontend Review Checklist

Use this checklist when reviewing a PR, auditing a screen, or validating a feature before merge.

## 1. User flow

- Is the primary user action obvious?
- Does the screen match the intended product behavior?
- Are permission, feature-flag, and unavailable states handled?

## 2. Visible states

- Is there a clear loading state?
- Is there a meaningful empty state?
- Is the error state actionable and recoverable?
- Are pending, disabled, and success states visible where needed?

## 3. Accessibility

- Are semantic elements used where possible?
- Can the flow be completed with keyboard only?
- Is focus visible and moved intentionally?
- Are inputs, buttons, icons, and tables labeled accessibly?
- Is contrast acceptable for text and important controls?

## 4. Responsiveness

- Does the layout hold up on narrow screens?
- Does content wrap, truncate, or scroll intentionally?
- Do tap targets and spacing stay usable on touch devices?

## 5. Architecture and maintainability

- Are components small enough to understand quickly?
- Is state ownership clear?
- Is derived data duplicated unnecessarily?
- Are API payloads mapped cleanly before reaching presentational code?
- Are styles, templates, and logic separated at a reasonable boundary?

## 6. Performance

- Is any heavy computation happening during render or template evaluation?
- Are large lists paginated, windowed, or otherwise bounded?
- Are images and assets sized appropriately?
- Is non-critical code lazy-loaded when it helps?

## 7. Forms and mutations

- Is validation close to the input and also enforced on submission?
- Is duplicate submission prevented where it matters?
- Are optimistic updates reversible?
- Is user input preserved on recoverable failures?

## 8. Testing

- Does the change cover the main user behavior?
- Are edge states tested?
- Is there coverage for the bug or regression being fixed?

## 9. Security

- Is any HTML injection path escaped or sanitized?
- Are secrets or privileged assumptions kept out of client code?
- Does the UI avoid implying authorization it cannot enforce?

## 10. Merge gate

Treat the change as incomplete if any of these are missing without justification:

- loading, empty, or error handling
- keyboard accessibility for interactive flows
- responsive behavior for common screen sizes
- tests for high-risk behavior
