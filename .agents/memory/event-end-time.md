---
name: Event end time display
description: End time must never be shown in the event UI — endDate is intentionally hidden from users.
---

## Rule
Do NOT display `endDate` / end time anywhere in the UI — web or mobile.

**Why:** The owner has explicitly and repeatedly removed end time from the event display. Merged tasks keep re-introducing it. This is a deliberate product decision.

**How to apply:**
- Web event-detail.tsx: use `formatTimeRangeCT(event.date)` — no second argument.
- Mobile event/[id].tsx: show only `format(new Date(event.date), "h:mm a")` — no end time suffix.
- EventCard (mobile): same — start time only.
- `endDate` stays in DB schema, API responses, and calendar link generation (Google Cal / .ics) — that usage is correct and must not be removed.
- Any time a task touches event detail pages, verify the end time has not been re-added before marking complete.
