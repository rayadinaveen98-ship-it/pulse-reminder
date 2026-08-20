# Pulse V7 Foundation

## Goal
Refactor the working V6.10 application into explicit modules without changing user-visible behavior, reminder semantics, sync data, notification delivery, Google Calendar behavior, or the V6 visual baseline.

Production `main` remains the rollback baseline while V7 work happens on `v7/foundation-architecture`.

## Current architecture audit

### Core state/UI (`app.js`)
Owns initial state, local storage, core views, base card rendering, navigation, settings, create/edit primitives, history and legacy recurrence values. It still declares an internal V3 version even though later runtime layers paint a newer visible version.

### Editor/alerts/cloud push (`v42.js`)
Normalizes multiple alert offsets and persistent reminders. It overrides `save`, `modal`, `saveForm`, and `card`. It also owns the current cloud push implementation and alert-row scheduling.

### Recurrence (`recurrence-v427.js`)
Adds advanced recurrence UI/config and overrides `modal`, `saveForm`, `complete`, and `pulseDbReminder`. It depends on the editor overrides being loaded first.

### Cloud (`cloud.js` + `sync-v425.js`)
`cloud.js` owns Supabase/auth/base mappings. `sync-v425.js` is the authoritative cloud pull boundary and realtime refresh layer. Current local/cloud fingerprints are coupled to reminder shape.

### Runtime (`pulse-runtime-v600a.js`)
Wraps `render` and `go`, owns registered views and post-render lifecycle hooks. Later UI modules rely on `PulseRuntime.afterRender`.

### Push (`push.js` + `sw.js`)
Owns service-worker registration, subscription/device persistence, test push and push settings UI. `sw.js` owns push display, snooze actions and notification click behavior.

### Feature views
Calendar, Google Calendar, Quick Add, Voice Quick Add, global filters, mobile navigation and icon decoration are layered after the core app and generally patch/render through runtime hooks.

## Primary risks

1. Override order is part of application behavior.
2. Replacing a wrapper can silently bypass later wrappers.
3. Reminder normalization is duplicated across local save, editor and sync paths.
4. Recurrence completion is a behavioral contract and must not move until regression tests exist.
5. Cloud writes also rebuild subtasks and alert rows, so reminder persistence cannot be separated casually.
6. UI decorators depend on rendered class names and markup structure.
7. PWA/push behavior has real-device requirements that static inspection cannot fully validate.

## V7 target boundaries

### `PulseConfig`
Single app version, feature flags and immutable constants. No user data.

### `PulseStore`
Owns in-memory `reminders`, `history`, `settings`, local persistence and normalized reminder shape. Emits state-change events; no DOM.

### `PulseReminderEngine`
Create/update/delete/complete/pause/restore operations. Calls recurrence engine when needed. No Supabase calls.

### `PulseRecurrence`
Pure normalization, labels and next-due calculations. No DOM and no storage.

### `PulseSync`
Transforms local models to/from DB models, performs push/pull/realtime and handles sync fingerprints. Does not own editor behavior.

### `PulseNotifications`
Push subscription/device lifecycle and scheduled-alert integration. Service worker remains separate.

### `PulseRouterRuntime`
Navigation, registered views, render hooks and version display.

### `PulseUI`
View rendering and editor components. UI may call engine/store public APIs only.

## Migration order

### V7.0A — contracts and version
- Introduce one `PulseConfig` namespace.
- Keep compatibility globals so no current module breaks.
- Record reminder normalization contract.
- No production promotion.

### V7.0B — pure recurrence extraction
- Move recurrence normalization/label/nextDue to a standalone pure module.
- Keep `window.pulseNextDue` compatibility bridge.
- Verify all recurrence modes against fixed examples.

### V7.0C — store normalization
- Centralize alert offsets, persistent flag, subtasks and recurrenceConfig normalization.
- Existing `save()` remains as a bridge initially.

### V7.0D — reminder command layer
- Centralize create/edit/complete/delete/pause/restore.
- Editor and action sheets call commands rather than modifying arrays directly.

### V7.0E — sync separation
- Move DB mapping/fingerprint/write/pull into a single sync module.
- Preserve existing table schemas and source_local_id semantics.

### V7.0F — render consolidation
- Stop replacing `render`, `go`, `modal`, `saveForm`, and `card` multiple times.
- Convert extensions to runtime hooks/components.

### V7.0G — cleanup
- Remove obsolete compatibility files only after no imports/references remain.
- Update loader order and version identifiers.

## Non-negotiable regression contract

Before any V7 branch is promoted, verify:
- Create + edit reminder
- Multiple notification offsets survive refresh/cloud pull
- Persistent reminders survive edit/cloud pull
- Every recurrence type computes correct next due
- Complete recurring vs non-recurring reminder
- History + restore
- Pause/resume/delete/duplicate/template
- Quick Add + Voice Quick Add
- Calendar Month/Week/Day
- Google Calendar connection/sync
- Desktop/mobile navigation and drawers
- Cross-device cloud sync
- Push registration + test push
- Scheduled push and snooze actions
- PWA launch from iPhone Home Screen

## V6.10 rollback baseline
Do not rewrite `main` during V7 foundation work. Promote only a tested V7 slice, and keep each slice independently revertible.
