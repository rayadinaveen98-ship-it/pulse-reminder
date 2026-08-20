# Pulse Reminder

Pulse is a mobile-first personal reminder and automation command center.

## Current capabilities

- Create one-time and recurring reminders with categories, priority, notes and multiple notification offsets
- Complete, snooze, restore, pause and delete reminder flows
- Cloud sync across signed-in devices
- Web push delivery with connected-device diagnostics
- Calendar month/week/day views
- Google Calendar import/export sync
- Reminder templates
- Natural-language Quick Add with confirmation preview
- Voice Quick Add
- Global search and advanced filters
- Dark/light interface and installable PWA support

## Run locally

Serve the repository with any static web server and open `index.html` through HTTP/HTTPS.

## Deployment

This repository is a zero-build static Vercel deployment. The production app is deployed from the `main` branch.

Git deployment trigger verified during the Pulse 6.0A consolidation cycle.

## Current milestone

Pulse 6.0A — architecture consolidation. Existing behavior is being migrated from stacked version-specific render/layout wrappers into a centralized runtime lifecycle before the visual polish stages begin.
