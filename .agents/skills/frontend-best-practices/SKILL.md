---
name: frontend-best-practices
description: Guide Codex to design, implement, review, and refactor frontend code with strong UI architecture, accessibility, responsiveness, performance, and maintainability. Use when creating or improving components, pages, forms, client-side state, styling systems, design-system usage, data-fetching flows, or frontend test coverage in web applications such as Angular, React, or Vue.
---

# Frontend Best Practices

## Overview

Use this skill to keep frontend work clear, resilient, and user-centered.

Apply it when the task touches component structure, visual states, interaction patterns, accessibility, styling, client-side data flow, or frontend review standards.

## Goal

Produce frontend solutions that:

- keep the user journey clear
- handle edge states explicitly
- stay accessible and responsive
- keep state and side effects understandable
- preserve consistency with the existing design system
- remain easy to test, review, and extend

## How to work

### 1. Understand the user flow before changing code

Determine or infer:

- the user goal
- the primary interaction on the screen
- the required states and failure modes
- device and viewport constraints
- permissions or feature-flag conditions
- the existing design-system or product conventions

If details are missing, make conservative assumptions and keep them consistent.

### 2. Prefer simple composition over clever abstraction

Start with the smallest structure that solves the task cleanly.

- Keep components focused on a single responsibility.
- Extract shared UI only after a clear reuse pattern appears.
- Separate rendering concerns from orchestration when it improves readability.
- Isolate API or SDK mapping instead of leaking raw payload shapes through the UI.

### 3. Design every visible state intentionally

Always account for the states the user can actually see:

- loading
- empty
- success
- error
- disabled
- pending or saving
- optimistic or rollback
- unauthorized or unavailable

Do not treat these as optional polish.

### 4. Make accessibility and responsiveness baseline requirements

Use semantic structure and interaction patterns from the start.

- Prefer native elements before generic containers.
- Preserve keyboard navigation and visible focus.
- Label inputs and controls clearly.
- Keep contrast, spacing, and reading order usable.
- Respect reduced-motion or motion-heavy interactions intentionally.
- Verify the layout works on small and large screens.

### 5. Keep data flow and side effects explicit

Choose state ownership deliberately.

- Prefer framework-native primitives before adding new state layers.
- Keep a single source of truth for important state.
- Avoid storing values that can be derived cheaply.
- Handle stale requests, race conditions, and retries intentionally.
- Keep forms, validation, and submission status easy to trace.

### 6. Optimize where it matters

Optimize based on real risk or observed hotspots.

- Avoid expensive work in render paths, templates, and change-detection loops.
- Lazy-load routes or heavy widgets when it improves startup and navigation.
- Bound list rendering with pagination or virtualization when needed.
- Keep images, animations, and bundles proportional to the screen's needs.

### 7. Produce concrete output

Depending on the task, deliver one or more of the following:

- component boundaries or page structure
- state ownership and data-flow plan
- accessibility and responsive-behavior notes
- frontend architecture or refactor recommendation
- code ready to implement
- review findings in priority order
- validation or testing checklist

## Decision guide

### If creating a new feature

1. Define the user journey and required screen states.
2. Choose component and state boundaries.
3. Decide how data enters, updates, and fails.
4. Implement semantic structure and responsive behavior.
5. Add tests for critical interactions and edge states.

### If reviewing or refactoring existing frontend code

1. Identify user-facing regressions first.
2. Check accessibility, responsiveness, and missing states.
3. Look for duplicated logic, tangled ownership, and brittle effects.
4. Check whether styling and design-system usage are drifting.
5. Recommend changes in priority order, starting with user impact.

## Frontend standards to enforce

### Architecture

- Organize by feature or capability when possible.
- Keep components and hooks or composables narrow in purpose.
- Keep business rules out of templates and style files.
- Use adapters or mappers where raw backend shapes hurt readability.

### State and data

- Prefer local state first, then lift or centralize only when needed.
- Make derived data explicit instead of duplicating it in multiple stores.
- Keep async status visible and recoverable.
- Preserve or reset state intentionally during navigation and mutations.

### UX and accessibility

- Use native controls when they fit the behavior.
- Make errors actionable and success feedback visible.
- Avoid surprise focus changes and inaccessible custom controls.
- Support keyboard-only operation for interactive flows.

### Styling and design systems

- Reuse tokens, utilities, and shared components before inventing new ones.
- Avoid one-off styles that fight the existing visual language.
- Keep spacing, typography, and hierarchy consistent across states.
- Make mobile and desktop behavior intentional, not accidental.

### Forms

- Validate close to user input and again at the server boundary.
- Prevent duplicate submission where it can cause bad side effects.
- Preserve user input on recoverable errors whenever possible.

### Performance

- Avoid unnecessary rerenders, reflows, and oversized bundles.
- Debounce or throttle high-frequency events when appropriate.
- Defer non-critical work that would block interaction.
- Measure before introducing complexity-only optimizations.

### Testing

- Test user-observable behavior first.
- Cover critical edge states and regressions.
- Prefer integration coverage for flows that cross multiple components.

### Security

- Treat the client as untrusted.
- Escape or sanitize dangerous HTML and rich content.
- Keep secrets and privileged logic out of the frontend.
- Never rely on the UI alone for authorization.

## Constraints

- Do not replace established design-system patterns without a clear reason.
- Do not hide important rules inside effects, template tricks, or CSS side effects.
- Do not couple the UI tightly to unstable backend response shapes when an adapter would clarify intent.
- Do not ship screens without explicit loading, empty, and error handling.
- Do not add state-management complexity without a real ownership problem to solve.

## Output format

When useful, structure the response in this order:

1. assumptions
2. recommended approach
3. UI states and user-experience notes
4. implementation details
5. validation or testing checklist

## References inside this skill

Consult these files only when relevant:

- `references/frontend-review-checklist.md`
- `references/framework-patterns.md`
