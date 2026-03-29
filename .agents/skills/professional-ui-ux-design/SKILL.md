---
name: professional-ui-ux-design
description: Guide Codex to create or refine professional user interfaces with strong visual hierarchy, polished layout, high-trust aesthetics, accessible interactions, and excellent user experience. Use when designing or redesigning dashboards, admin panels, landing pages, product pages, onboarding flows, forms, settings screens, design-system surfaces, or responsive web interfaces where the quality of UI and UX is a primary concern.
---

# Professional UI UX Design

## Overview

Use this skill to make interfaces feel intentional, credible, and easy to use.

Apply it when the task is not only to make the screen work, but to make it look professional, communicate clearly, and guide users through the right actions with minimal friction.

## Goal

Produce UI work that:

- communicates a clear visual direction
- creates strong hierarchy and scanning flow
- feels polished without becoming noisy
- reduces user effort during key tasks
- handles edge states with clarity and confidence
- stays accessible and responsive
- respects existing product and brand patterns when present

## How to work

### 1. Start from the product goal, not decoration

Determine or infer:

- the primary user goal on the screen
- the most important action
- the level of trust, urgency, or calm the interface should convey
- the intended audience and context of use
- the existing design system, brand, or product language

If the visual direction is not defined, choose one deliberately and keep it consistent.

### 2. Choose a clear visual concept

Every strong UI needs a point of view.

- Decide whether the screen should feel editorial, technical, premium, operational, friendly, or minimal.
- Pick typography, spacing, shape language, and contrast levels that reinforce that direction.
- Avoid default-looking layouts, generic card soup, and interchangeable dashboards.

### 3. Build hierarchy before detail

Make the page readable in a quick scan.

- Establish one primary action and a clear reading path.
- Group related information with spacing and structure before adding borders.
- Use size, contrast, alignment, and density intentionally.
- Let the page breathe; do not fill every area just because space exists.

### 4. Design flows to reduce friction

Good UX removes hesitation.

- Shorten the path to the main task.
- Keep choices understandable and limited.
- Make system status obvious during loading, saving, and error recovery.
- Show the next sensible action when the user reaches an empty, blocked, or success state.

### 5. Make interaction feel polished

Professional UI is shaped by behavior, not only by screenshots.

- Keep hover, focus, pressed, disabled, and pending states visually coherent.
- Use motion sparingly and purposefully to reinforce transitions and feedback.
- Preserve keyboard and screen-reader usability.
- Make destructive or irreversible actions explicit and calm.

### 6. Balance consistency and surprise

Be distinctive without hurting usability.

- Reuse the product's established patterns when they already work.
- Introduce visual personality through layout, typography, color, or composition instead of random novelty.
- Keep delight subordinate to clarity and task completion.

### 7. Produce concrete output

Depending on the task, deliver one or more of the following:

- visual direction and aesthetic rationale
- page structure or wireframe-level layout plan
- component hierarchy and content priorities
- UX improvements and state-handling notes
- styling guidance or implementation-ready UI code
- review findings ranked by user impact

## Decision guide

### If designing a new screen

1. Define the core task and success state.
2. Pick a visual direction that matches the product and audience.
3. Lay out the page around hierarchy and flow.
4. Add interaction states, feedback, and accessibility considerations.
5. Refine for polish, density, and responsiveness.

### If redesigning an existing screen

1. Identify confusion, clutter, and weak hierarchy first.
2. Simplify the information flow before changing visual styling.
3. Preserve useful familiarity while removing low-value noise.
4. Improve trust signals, spacing rhythm, and action clarity.
5. Validate that the redesign still supports real user tasks.

## UI and UX standards to enforce

### Visual direction

- Use a coherent type, spacing, and color system.
- Make the interface feel deliberate, not template-generated.
- Prefer a small number of strong visual ideas over many weak ones.
- Keep surfaces, shadows, and radii consistent.

### Layout and hierarchy

- Make the primary action unmistakable.
- Use layout to explain the product, not merely contain widgets.
- Keep headers, sections, and supporting content in a clear rhythm.
- Avoid dense clusters of controls without hierarchy.

### Content and microcopy

- Use labels and button text that explain outcomes clearly.
- Keep empty states and helper text useful, not decorative filler.
- Reduce jargon unless the audience expects it.
- Keep high-value information visible without forcing unnecessary clicks.

### Interaction design

- Give immediate feedback for user actions.
- Make state changes understandable.
- Prevent accidental destructive actions.
- Do not rely on color alone to communicate meaning.

### Forms and task flows

- Ask only for information that is necessary.
- Break large tasks into digestible steps when complexity is real.
- Keep validation specific, timely, and recoverable.
- Preserve user input when errors can be corrected.

### Accessibility and responsiveness

- Maintain readable contrast and touch-friendly targets.
- Ensure the design works on narrow and wide screens.
- Preserve logical reading and tab order.
- Keep motion optional and non-disorienting.

### Trust and polish

- Use consistency to create confidence.
- Avoid abrupt jumps, hidden states, or ambiguous feedback.
- Make loading, empty, success, and error states feel designed, not appended.
- Remove visual noise that competes with the main task.

## Constraints

- Do not optimize for aesthetics at the cost of comprehension.
- Do not introduce multiple competing primary actions.
- Do not use trendy visuals that weaken readability or trust.
- Do not overload the screen with badges, gradients, shadows, and accents all at once.
- Do not break established brand or design-system rules without a clear reason.

## Output format

When useful, structure the response in this order:

1. assumptions
2. visual direction
3. layout and hierarchy plan
4. interaction and UX notes
5. implementation guidance or review checklist

## References inside this skill

Consult these files only when relevant:

- `references/ui-ux-review-checklist.md`
- `references/visual-direction-and-layout.md`
- `references/forms-and-task-flows.md`
