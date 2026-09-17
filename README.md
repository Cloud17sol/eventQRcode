# Doorlist

Event guest and access management — authentication, events, guests, invitations, scanning, manual check-in, staff, and a live door ledger.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Fill `.env` with your Supabase project URL and anon key.

## Database

In the Supabase SQL editor, run in order:

1. `supabase/migrations/001_profiles_and_events.sql`
2. `supabase/migrations/002_guests_and_categories.sql`
3. `supabase/migrations/003_invitations_and_rsvps.sql`
4. `supabase/migrations/004_gates_and_checkins.sql`
5. `supabase/migrations/005_manual_checkin_search.sql`
6. `supabase/migrations/006_event_staff.sql`
7. `supabase/migrations/007_event_dashboard.sql`
8. `supabase/migrations/008_security_hardening.sql`
9. `supabase/migrations/009_rls_helper_grants.sql`
10. `supabase/migrations/010_events_select_insert_returning.sql`
11. `supabase/migrations/011_event_registration.sql`
12. `supabase/migrations/012_optional_registration_email.sql`

That creates `profiles`, `events`, `guest_categories`, `guests`, `invitations`, `rsvps`, `gates`, `check_ins`, `event_staff`, `event_live_pulse`, and `event_registration`. Invitation lookup, guest search, check-in, staff assignment, live totals, and public registration go through RPCs. Guests use `open_invitation` / `submit_rsvp` / `open_event_registration` / `register_for_event` only — no anonymous table access.

Auth emails must be enabled in Supabase Auth settings.

## Production

The gate scanner is a Progressive Web App. Staff can install Doorlist on an iPhone or Android home screen. The service worker caches app assets and fonts only — not guest lists or check-in data. A new version asks before reload so a door shift is not interrupted.

### Vercel

1. Import this repo in Vercel (Vite, output `dist`).
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Production environment variables.
3. Deploy. `vercel.json` rewrites client routes to `index.html` and keeps the service worker uncached.

Scanning needs HTTPS. After deploy, open the scanner on the phone, then Add to Home Screen and launch from there.

### Supabase

Use a dedicated production project, or treat the current project as production. Run migrations `001`–`012` in order. In Authentication → URL configuration:

- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**`

### Device checks

Confirm on iPhone Safari and Android Chrome: install, camera permission, invitation page, and a live admit. Camera will not start on plain `http://` LAN addresses.
