# Event Guest & Access Management Platform — Master Specification

## 1. Product Vision

Build a production-ready, multi-event guest and access management platform where event organizers can:

- Create and manage events.
- Add and manage guest lists.
- Send personalized invitations.
- Issue a unique QR credential to every invitation.
- Validate QR codes at event entrances.
- Check guests in manually when QR scanning is not possible.
- Track attendance in real time.
- Manage multiple gates and event staff.
- Prevent duplicate or unauthorized entry.
- Support weddings, birthdays, receptions, conferences, corporate events, religious events, private parties, launches, concerts and other event types.

The product should not be designed as a simple QR generator.

The core product is:

**Guest Management + Invitation Management + Event Access Control**

QR codes are one access credential within that system.

---

## 2. Core User Types

### Platform Admin

Controls the overall SaaS platform.

Responsibilities:

- View and manage organizer accounts.
- View all events.
- Suspend or reactivate accounts.
- Manage subscriptions/plans later.
- View platform usage.
- View security/audit activity.
- Manage platform-level settings.

### Event Organizer

Primary paying/user account.

Capabilities:

- Create events.
- Edit event information.
- Upload event branding.
- Add/import guests.
- Assign invitation categories.
- Configure guest allowances.
- Send/share invitations.
- Assign event staff.
- Configure gates.
- Monitor RSVPs.
- Monitor live attendance.
- Manually check guests in.
- Revoke or restore invitations.
- Export event reports.

### Event Staff / Gate Staff

Restricted user role.

Staff should only have access to events they are assigned to.

Possible permissions:

- Scan QR codes.
- Search guests.
- Perform manual check-ins.
- View guest details needed for admission.
- View check-in history.

Optional supervisor permission:

- Override duplicate check-in.
- Undo check-in.
- Admit additional guests.
- Restore revoked invitation.
- Resolve exceptions.

### Guest

Guest should not need an account.

Guest accesses a unique invitation page using a secure invite URL.

Example:

`/i/8Hsd72Kx...`

Guest can:

- View event invitation.
- See event details.
- RSVP.
- See guest allowance.
- Display QR code.
- Download/save invitation.
- Access venue information.
- Optionally add event to calendar.
- Optionally forward invitation only when organizer allows it.

---

## 3. Core Event Workflow

### Organizer Flow

1. Organizer signs up.
2. Organizer creates an event.
3. Organizer configures event settings.
4. Organizer adds guests.
5. System creates invitations.
6. Every invitation receives a secure token.
7. System generates QR credentials.
8. Organizer shares invitations.
9. Guests RSVP.
10. Gate staff open scanner.
11. QR is scanned.
12. Backend validates credential.
13. Gate screen displays result.
14. Staff confirms admission.
15. Attendance dashboard updates in real time.

---

## 4. Manual Check-In

Manual check-in is a first-class feature, not merely a fallback hack.

It must work when:

- Guest has no smartphone.
- Guest cannot open QR.
- Guest deleted invitation.
- Phone battery is dead.
- Screen is cracked.
- Camera cannot scan.
- Printed QR is damaged.
- Internet connection is unstable.
- QR scanner permission fails.
- Elderly guest only knows their name.
- Organizer intentionally issued no digital invitation.

### Manual Check-In Flow

Gate staff selects:

**Manual Check-In**

Staff can search by:

- Guest name.
- Phone number.
- Email.
- Invitation number.
- Table number.
- Access category.
- Guest reference.
- Partial name.

Example result:

```text
Tunde Adebayo
VIP
Table 12
Admits: 2
Not checked in

Tola Adebayo
General
Table 7
Admits: 1
Already checked in
```

Staff selects the correct guest.

Display:

```text
Tunde Adebayo

Invitation: INV-84729
Access: VIP
Table: 12

Allowed: 2
Already admitted: 0
Remaining: 2

[ CHECK IN ]
```

Staff chooses the number entering and confirms.

The check-in record must indicate:

```text
method = manual
```

rather than:

```text
method = qr
```

This is important for security and reporting.

---

## 5. Guest Without QR Credential

An organizer should be able to create a guest record without requiring email or smartphone delivery.

Minimum guest record:

- Name.
- Guest allowance.

Optional:

- Phone.
- Email.
- Table.
- Group.
- Notes.

The guest can still be searched manually at the gate.

Every invitation can still internally receive a secure credential even if that credential was never delivered digitally.

This makes the system usable for traditional weddings and events where some invitations are physical cards.

---

## 6. Physical Invitation Support

Support invitations where QR codes are printed.

Organizer should eventually be able to generate:

- Individual invitation PDF.
- Printable QR cards.
- Guest labels.
- Bulk invitation sheets.
- Table cards.
- Entry cards.

Printed QR codes should validate against the same invitation record used for digital invitations.

---

## 7. Recommended Technology Stack

### Frontend

- React 18+
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Query / TanStack Query
- React Hook Form
- Zod
- Lucide icons
- react-hot-toast or equivalent

### Backend

Use Supabase.

Services:

- PostgreSQL
- Supabase Auth
- Row Level Security
- Edge Functions where necessary
- Realtime
- Storage

### QR

Recommended library:

- `qrcode`

For scanning:

- `html5-qrcode`

or:

- `@zxing/browser`

QR code must contain a secure random credential.

Do not expose:

- Guest ID.
- Event ID.
- Phone number.
- Email.
- Sequential invitation ID.

Example QR content:

```text
https://app.example.com/q/3GN9sLxX8VkAPm...
```

Prefer a secure versioned credential payload internally handled by the scanner.

---

## 8. Application Structure

Recommended routes:

```text
/
 /login
 /signup

/dashboard

/events
/events/new
/events/:eventId

/events/:eventId/overview
/events/:eventId/guests
/events/:eventId/invitations
/events/:eventId/rsvp
/events/:eventId/check-ins
/events/:eventId/staff
/events/:eventId/gates
/events/:eventId/settings
/events/:eventId/reports

/scan
/scan/:eventId

/i/:inviteToken

/admin
/admin/users
/admin/events
/admin/settings
```

---

## 9. Database Schema

### profiles

```sql
id uuid primary key references auth.users(id)
full_name text
phone text
avatar_url text
role text
is_active boolean default true
created_at timestamptz
updated_at timestamptz
```

Roles:

```text
organizer
staff
platform_admin
```

Do not use `role` alone to determine event permissions.

Event-level permissions should come from event staff assignments.

### events

```sql
id uuid primary key
organizer_id uuid references profiles(id)

name text not null
slug text
event_type text
description text

event_date date
start_time time
end_time time

venue_name text
address text
city text
state text
country text

latitude numeric
longitude numeric

cover_image_url text
logo_url text

status text

timezone text

guest_limit integer

allow_rsvp boolean default true
allow_plus_one boolean default false

created_at timestamptz
updated_at timestamptz
```

Possible status values:

```text
draft
published
active
completed
cancelled
archived
```

---

## 10. Event Types

Do not hardcode business logic around specific event types.

Store a general event type.

Suggested values:

```text
wedding
birthday
reception
conference
corporate
concert
religious
school
community
private_party
product_launch
fundraiser
other
```

Templates and labels can change according to event type.

---

## 11. Guests

### guests

```sql
id uuid primary key
event_id uuid references events(id)

first_name text
last_name text
display_name text not null

email text
phone text

company text

guest_category_id uuid

table_name text
seat_number text

guest_limit integer default 1

notes text

status text default 'active'

created_at timestamptz
updated_at timestamptz
```

Status:

```text
active
blocked
cancelled
```

Do not make phone or email mandatory.

---

## 12. Guest Categories

### guest_categories

Examples:

- VIP
- General
- Family
- Bridal Party
- Groom's Family
- Bride's Family
- Sponsor
- Staff
- Media
- Speaker
- Vendor

Schema:

```sql
id uuid primary key
event_id uuid
name text
description text
default_guest_limit integer
priority integer
created_at timestamptz
```

Categories must be organizer-defined.

---

## 13. Invitations

### invitations

```sql
id uuid primary key

event_id uuid
guest_id uuid

invitation_number text unique

credential_hash text unique

status text default 'active'

delivery_method text

sent_at timestamptz
opened_at timestamptz

expires_at timestamptz

created_at timestamptz
updated_at timestamptz
```

Statuses:

```text
active
revoked
expired
cancelled
```

Never store the raw QR token in a queryable public table if avoidable.

Recommended implementation:

1. Generate cryptographically secure random token.
2. Show raw token in QR/URL.
3. Hash token server-side.
4. Save hash.
5. During scanning, hash presented token.
6. Compare hash.

---

## 14. RSVP

### rsvps

```sql
id uuid primary key
event_id uuid
invitation_id uuid
guest_id uuid

status text

attending_count integer

message text

responded_at timestamptz
updated_at timestamptz
```

Statuses:

```text
pending
attending
not_attending
maybe
```

Organizer decides whether `maybe` is enabled.

---

## 15. Check-Ins

### check_ins

Use an append-only log.

Do not simply put:

```text
checked_in = true
```

on the guest record.

Schema:

```sql
id uuid primary key

event_id uuid
invitation_id uuid
guest_id uuid

staff_user_id uuid
gate_id uuid

method text

quantity integer

action text

notes text

device_id text

created_at timestamptz
```

Methods:

```text
qr
manual
offline_sync
override
```

Actions:

```text
check_in
check_out
undo
override
```

This gives the system a complete audit history.

---

## 16. Partial Guest Entry

The system must support guest groups.

Example:

```text
Mr & Mrs Adebayo
Allowed guests: 4
```

First arrival:

```text
Quantity entering: 2
```

Remaining:

```text
2
```

Later:

```text
Quantity entering: 2
```

Remaining:

```text
0
```

Do not automatically mark an invitation unusable after its first scan if its allowance is greater than one.

Calculate:

```text
remaining =
guest_limit
-
SUM(valid check_ins)
```

---

## 17. Gate Validation

When a QR is scanned, backend must return one of several explicit outcomes.

### Valid

```text
VALID INVITATION

Tunde Adebayo
VIP
Table 12

Allowed: 2
Admitted: 0
Remaining: 2
```

### Fully Used

```text
ALREADY FULLY CHECKED IN

Tunde Adebayo

Allowed: 2
Already admitted: 2

Last entry:
6:32 PM
Gate B
```

### Partially Used

```text
VALID — PARTIAL ENTRY

Allowed: 4
Already admitted: 2
Remaining: 2
```

### Revoked

```text
ACCESS REVOKED

Contact event supervisor.
```

### Wrong Event

```text
INVALID FOR THIS EVENT

This credential belongs to another event.
```

### Expired

```text
INVITATION EXPIRED
```

### Unknown

```text
INVALID QR CODE
```

Do not disclose unnecessary internal details.

---

## 18. Gate Configuration

### gates

```sql
id uuid primary key
event_id uuid

name text
description text

is_active boolean

created_at timestamptz
```

Examples:

```text
Main Entrance
VIP Entrance
Car Park Gate
Hall Entrance
Staff Entrance
```

---

## 19. Event Staff

### event_staff

```sql
id uuid primary key

event_id uuid
user_id uuid

role text

can_scan boolean
can_manual_checkin boolean
can_override boolean
can_undo_checkin boolean
can_view_guest_details boolean

created_at timestamptz
```

Event staff roles:

```text
scanner
gate_supervisor
event_manager
```

---

## 20. Scanner UX

The scanner must prioritize speed.

Main scanning screen:

```text
Lola & Kunle Wedding

Gate:
Main Entrance

[ CAMERA VIEW ]

Point camera at guest QR

-----------------

[ Manual Check-In ]

Today:
482 / 600 checked in
```

Successful scan should:

1. Vibrate.
2. Play success tone where supported.
3. Display large green confirmation.
4. Display guest name.
5. Display category.
6. Display allowance.
7. Ask staff to confirm quantity where necessary.

Invalid result:

1. Vibrate differently.
2. Display large warning.
3. Require staff acknowledgment before scanner resets.

Avoid automatic entry solely because the camera recognized a QR.

QR recognition and guest admission should remain distinct actions where guest quantity or exceptions apply.

---

## 21. Fast-Entry Mode

For invitations that always admit exactly one person, organizer can enable:

```text
Fast Scan Mode
```

Then valid QR scan can immediately create a check-in.

For group invitations, show quantity selector.

---

## 22. Manual Search Security

Manual search should not expose an entire guest database unnecessarily.

Staff sees only:

- Name.
- Category.
- Table.
- Guest allowance.
- Check-in state.

Hide unless permission permits:

- Full email.
- Full phone.
- Notes.
- Organizer-only information.

Phone search can still work without revealing full number.

Example:

```text
******4821
```

---

## 23. Duplicate Name Resolution

If multiple guests share the same name:

```text
Three guests found

Tunde Adebayo
VIP
Table 4
Phone ending 1443

Tunde Adebayo
General
Table 19
Phone ending 6382

Tunde Adebayo
Family
Table 2
Phone ending 1055
```

Gate staff must select correct guest.

---

## 24. Invitation Delivery

Version 1:

- Copy invitation link.
- Share using WhatsApp.
- Email invitation.
- Download QR.
- Print QR.

Later:

- Native WhatsApp Business API.
- SMS.
- Bulk messaging providers.

Do not make WhatsApp API dependency mandatory for initial launch.

---

## 25. Invitation Page

Guest invitation page should be mobile-first but attractive on desktop/tablet.

Sections:

```text
Event branding

You're Invited

Guest Name

Event title

Date
Time
Venue

RSVP

Guest allowance

QR Access Pass

Event information

Map

Contact organizer
```

The QR should not necessarily be visible until organizer enables access passes.

---

## 26. Guest Import

Organizer must be able to:

- Add one guest.
- Add multiple guests quickly.
- Upload CSV.
- Upload Excel later.
- Duplicate/import previous event list later.

CSV fields:

```text
name
email
phone
category
guest_limit
table
notes
```

Import process:

1. Upload.
2. Parse.
3. Preview.
4. Show validation errors.
5. Allow column mapping.
6. Confirm import.
7. Create guests.
8. Generate invitations.

Never immediately import malformed CSV without preview.

---

## 27. Dashboard

Event dashboard should show:

```text
Total invited
RSVP attending
RSVP declined
No response

Expected attendance

Checked in
Remaining
Check-in percentage

VIP attendance
General attendance

Gate activity

Recent check-ins
```

Realtime updates should be enabled.

---

## 28. Guest List

Table:

```text
Guest
Category
Contact
RSVP
Allowance
Checked In
Remaining
Table
Invitation
Actions
```

Filters:

```text
All
Attending
Declined
No RSVP
Checked In
Not Checked In
VIP
Category
Table
Revoked
```

Search should be instant.

---

## 29. Event Overview

Include:

```text
Event title
Date
Venue

Guest count
Expected attendees
Checked in
Remaining

RSVP summary

Recent guest activity

Gate status

Staff online / recently active
```

---

## 30. Reports

Organizer should eventually export:

- Guest list.
- RSVP list.
- Attendance list.
- No-shows.
- Check-in times.
- Staff check-in activity.
- Gate activity.
- Category attendance.

Formats:

```text
CSV
Excel
PDF later
```

---

## 31. Audit Log

Create:

### audit_logs

```sql
id uuid primary key

event_id uuid
actor_user_id uuid

action text

entity_type text
entity_id uuid

metadata jsonb

created_at timestamptz
```

Record important actions:

- Invitation revoked.
- Invitation restored.
- Manual check-in.
- Check-in undone.
- Override performed.
- Guest modified.
- Guest deleted.
- Event changed.
- Staff added.
- Staff removed.

---

## 32. Row Level Security

RLS is mandatory.

Rules:

Organizer:

```text
Can access events where organizer_id = auth.uid()
```

Event staff:

```text
Can access only assigned events.
```

Guests:

```text
Do not receive authenticated table access.
```

Guest invitation pages should use secure server-side/Edge Function lookup by credential.

Never expose the guests or invitations table publicly through anonymous SELECT access.

---

## 33. QR Validation Function

Validation should happen server-side through an RPC or Edge Function.

Example:

```text
validate_event_credential(
    credential,
    event_id,
    gate_id
)
```

Function returns controlled response:

```json
{
  "valid": true,
  "status": "valid",
  "guest": {
    "name": "Tunde Adebayo",
    "category": "VIP",
    "table": "12"
  },
  "guest_limit": 2,
  "checked_in": 0,
  "remaining": 2
}
```

Do not allow the frontend to query invitation credentials directly.

---

## 34. Check-In Function

Use a database RPC:

```text
check_in_guest(
    invitation_id,
    quantity,
    gate_id,
    method
)
```

The database function should perform the check atomically.

It must:

1. Authenticate staff.
2. Confirm staff permission.
3. Confirm invitation belongs to event.
4. Confirm invitation active.
5. Calculate current admitted count.
6. Validate requested quantity.
7. Prevent over-admission.
8. Insert check-in record.
9. Write audit entry.
10. Return updated guest state.

This prevents two gates simultaneously admitting the same remaining person.

---

## 35. Concurrency

This is critical.

Imagine an invitation permits one guest.

Gate A and Gate B scan the same QR simultaneously.

Both frontends may initially see:

```text
remaining = 1
```

The database must guarantee that only one check-in succeeds.

Use:

- PostgreSQL transactions.
- Row-level locking.
- Atomic RPC functions.

Do not depend on frontend state for access decisions.

---

## 36. Offline Mode

Not required for MVP, but architecture must support it.

Eventually:

1. Staff opens assigned event while online.
2. App downloads encrypted/access-limited credential cache.
3. Device receives event-specific offline authorization.
4. Scanner can validate locally.
5. Check-ins are written to local queue.
6. Connectivity returns.
7. Queue synchronizes.
8. Conflicts are flagged.

Offline check-in records use:

```text
method = offline_sync
```

Major problem to solve later:

Two offline devices can accept the same credential.

Therefore offline mode should include configurable policy:

```text
Strict offline
Allow with conflict warning

or

No offline admission
Search only
```

Do not attempt full offline entry control in MVP.

---

## 37. PWA

Build the gate scanner as a Progressive Web App.

Benefits:

- Install to iPhone home screen.
- Install to Android.
- Full-screen scanner feel.
- Cached application assets.
- Faster gate startup.
- Foundation for offline mode.

Do not cache sensitive guest lists indiscriminately.

---

## 38. Event Branding

Per event:

- Cover image.
- Logo.
- Accent color.
- Invitation background.
- Host names.
- Custom welcome message.
- Dress code.
- Event instructions.

Later provide templates.

---

## 39. Event Creation Wizard

Step 1: Event Basics

- Event name.
- Event type.
- Date.
- Start/end time.

Step 2: Venue

- Venue name.
- Address.
- Map.

Step 3: Guest Settings

- Maximum guest count.
- RSVP enabled.
- Default allowance.
- Plus-one policy.

Step 4: Invitation

- Cover image.
- Theme.
- Message.

Step 5: Access

- QR enabled.
- Manual check-in enabled.
- Multiple-entry policy.
- Event gates.

Step 6: Publish

---

## 40. Event Status Logic

Draft:

```text
Organizer configuration only.
```

Published:

```text
Invitation links accessible.
RSVP active.
```

Active:

```text
Scanner/check-in active.
```

Completed:

```text
Check-in closed by default.
Reports available.
```

Cancelled:

```text
Invitations show event cancellation.
```

Archived:

```text
Read-only historical event.
```

---

## 41. Access Windows

Optional configuration:

```text
check_in_opens_at
check_in_closes_at
```

Scanner response before opening:

```text
ENTRY NOT YET OPEN
```

After closure:

```text
ENTRY WINDOW CLOSED
```

Supervisor override can be enabled.

---

## 42. Re-Entry

Organizer should configure:

```text
Re-entry disabled
```

or:

```text
Re-entry allowed
```

For events like:

- Conferences.
- Festivals.
- Exhibitions.

If re-entry enabled, provide:

```text
Check In
Check Out
```

Current occupancy can then be calculated.

---

## 43. Guest Status vs Invitation Status

Keep these separate.

Guest status:

```text
active
blocked
cancelled
```

Invitation status:

```text
active
revoked
expired
cancelled
```

RSVP status:

```text
pending
attending
not_attending
maybe
```

Access state is calculated from check-in records.

Do not combine everything into one status field.

---

## 44. Guest Groups

Future feature but account for it.

Examples:

```text
Adebayo Family
Bride's Family
Groom's Family
Company A
Table 5
```

Potential table:

```text
guest_groups
```

Can support grouped communication and reporting.

---

## 45. Seating

MVP:

```text
table_name
seat_number
```

Later:

- Seating plans.
- Drag-and-drop tables.
- Seat assignment.
- Capacity alerts.

Keep seating independent from access control.

---

## 46. Organizer Homepage

Dashboard:

```text
Upcoming Events

Past Events

Draft Events

[ CREATE EVENT ]
```

Each card shows:

```text
Event
Date
Venue

Invited
RSVP
Checked In

Status
```

---

## 47. Security Requirements

Mandatory:

- Secure random invite credentials.
- Credential hashing.
- HTTPS only.
- RLS.
- Server-side validation.
- Rate limiting.
- Audit logging.
- No raw guest database exposure.
- Permission-based staff access.
- Atomic check-ins.
- Revocation capability.
- Session expiration.
- Input validation.
- Sanitization.

Never trust:

- QR payload.
- Client guest limit.
- Client check-in count.
- Frontend role.
- Event ID supplied by browser.

Always validate server-side.

---

## 48. QR Credential Design

Generate at least 128 bits of entropy.

Example:

```ts
crypto.getRandomValues(...)
```

or server-side equivalent.

Do not use:

```text
INV000001
INV000002
```

as QR credentials.

Human-readable invitation numbers can still exist separately:

```text
LXB-WED-00214
```

but should never provide access authorization by themselves.

---

## 49. Privacy

Only collect data necessary for event operations.

Organizer should be able to remove event guest data after event completion.

Future platform settings:

```text
Automatically delete guest information:
30 days
90 days
180 days
Never
```

Audit and payment records may have different retention policies.

---

## 50. Error Handling

Every failure should have a user-friendly message.

Examples:

Scanner:

```text
Camera unavailable.
Use Manual Check-In.
```

Network:

```text
Unable to verify invitation.
Check your internet connection or use supervisor mode.
```

Revoked:

```text
This invitation has been revoked.
Contact event supervisor.
```

Server failure:

```text
We couldn't complete the check-in.
No entry has been recorded.
Please try again.
```

Never display raw Supabase errors to users.

---

## 51. MVP Scope

Build Version 1 in this order.

### Phase 1 — Foundation

- React/Vite/TypeScript.
- Supabase.
- Auth.
- Profiles.
- Protected routes.
- Organizer dashboard.

### Phase 2 — Events

- Create event.
- Edit event.
- Event list.
- Event dashboard.
- Event settings.

### Phase 3 — Guests

- Add guest.
- Edit guest.
- Delete guest.
- Search.
- Filter.
- Categories.
- Guest allowance.
- CSV import.

### Phase 4 — Invitations

- Generate invitation.
- Secure credentials.
- QR generation.
- Invitation page.
- RSVP.
- Revoke invitation.
- Restore invitation.

### Phase 5 — QR Scanner

- Camera scanner.
- Credential validation RPC.
- Gate selector.
- Validation screen.
- Partial guest entry.
- Check-in RPC.
- Duplicate prevention.

### Phase 6 — Manual Check-In

This is mandatory before MVP launch.

Implement:

- Guest search.
- Name search.
- Phone search.
- Invitation-number search.
- Duplicate-name resolution.
- Guest details.
- Quantity selection.
- Manual check-in.
- Manual check-in audit trail.

### Phase 7 — Staff

- Add staff.
- Assign staff to event.
- Scanner role.
- Supervisor role.
- Staff permission enforcement.

### Phase 8 — Realtime Dashboard

- Live check-in total.
- Remaining guests.
- Check-in activity.
- Gate activity.
- RSVP statistics.

### Phase 9 — Security Review

Verify:

- RLS.
- RPC authorization.
- Credential security.
- Race conditions.
- Duplicate scanning.
- Manual check-in permissions.
- Event isolation.
- Guest privacy.

### Phase 10 — Production

- PWA.
- Responsive testing.
- iPhone Safari testing.
- Android Chrome testing.
- Gate-load testing.
- Vercel deployment.
- Supabase production environment.

---

## 52. MVP Success Criteria

Do not move to advanced features until this scenario works reliably:

1. Organizer creates wedding.
2. Organizer adds 100 guests.
3. Some guests have email.
4. Some guests have only phone numbers.
5. Some guests have neither.
6. System generates invitation credentials.
7. QR invitations can be shared.
8. Guest can RSVP.
9. Staff is assigned.
10. Staff opens scanner.
11. QR validates.
12. Guest is checked in.
13. Same credential cannot exceed allowance.
14. Family invitation can partially check in.
15. Staff can manually find a guest.
16. Staff can manually admit them.
17. Organizer dashboard updates instantly.
18. Every access action appears in audit logs.

If all 18 work, the core product works.

---

## 53. Features To Defer Until After MVP

Do not build these yet:

- Payment/ticketing.
- Apple Wallet.
- Google Wallet.
- WhatsApp Business API automation.
- SMS automation.
- Full offline access control.
- Drag-and-drop seating charts.
- Facial recognition.
- NFC.
- Public event marketplace.
- Native mobile apps.
- Dynamic QR rotation.
- Subscription billing.

Architect so they can be added later, but do not let them delay MVP.

---

## 54. Cursor Development Rules

Cursor should follow these rules while developing.

### Rule 1

Implement one feature at a time.

Do not refactor unrelated files during feature implementation.

### Rule 2

Before modifying database schema:

- Show migration.
- Explain what it changes.
- Check effect on existing RLS.
- Avoid destructive migrations.

### Rule 3

Never remove existing working functionality to solve an unrelated problem.

Prefer additive fixes.

### Rule 4

After each feature:

- Run TypeScript check.
- Run build.
- Identify errors.
- Fix errors before continuing.

### Rule 5

Security logic must never exist only in React.

Authorization belongs in:

- RLS.
- SQL functions.
- Edge Functions.

### Rule 6

All check-in operations must use backend RPC functions.

Never:

```ts
supabase
  .from("guests")
  .update({ checked_in: true })
```

from the scanner.

### Rule 7

Never use hardcoded demo credentials or secret keys in frontend code.

Use environment variables.

### Rule 8

Generate migrations instead of manually assuming database columns exist.

### Rule 9

Keep components reasonably small.

Suggested structure:

```text
src/
  components/
  pages/
  layouts/
  hooks/
  contexts/
  services/
  lib/
  types/
  utils/
```

---

## 55. Recommended Source Structure

```text
src/
├── components/
│   ├── common/
│   ├── dashboard/
│   ├── events/
│   ├── guests/
│   ├── invitations/
│   ├── scanner/
│   └── staff/
│
├── pages/
│   ├── auth/
│   ├── dashboard/
│   ├── events/
│   ├── invitations/
│   ├── scanner/
│   └── admin/
│
├── layouts/
│   ├── OrganizerLayout.tsx
│   ├── ScannerLayout.tsx
│   └── AdminLayout.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useEvent.ts
│   ├── useGuests.ts
│   └── useCheckIn.ts
│
├── services/
│   ├── eventService.ts
│   ├── guestService.ts
│   ├── invitationService.ts
│   ├── checkInService.ts
│   └── staffService.ts
│
├── lib/
│   ├── supabase.ts
│   └── queryClient.ts
│
├── types/
│   ├── database.ts
│   ├── event.ts
│   ├── guest.ts
│   └── invitation.ts
│
└── utils/
    ├── qr.ts
    ├── dates.ts
    └── validation.ts
```

---

## 56. Development Starting Point

Cursor should begin with only:

### Milestone 1

Create:

```text
React + Vite + TypeScript
Tailwind
React Router
Supabase client
Authentication
OrganizerLayout
Dashboard
Events table
Create Event page
Event List page
```

Then stop.

Do not begin QR implementation until the event and guest foundations are working.

---

## 57. Product Principle

Every feature should answer one of these questions:

**Who is invited?**

**How many people are permitted?**

**Has this credential been authorized?**

**Who has already entered?**

**Who performed the admission?**

**At which gate?**

**When did it happen?**

If the system can answer those questions reliably and securely, it can serve weddings, birthdays, receptions, conferences, corporate events and almost any private event.

---

## 58. Core Product Definition

The product should ultimately be understood as:

> A multi-event guest invitation, RSVP, credential and access-control platform that enables organizers to know exactly who is invited, who is expected, who has arrived and who was admitted, using secure QR credentials or controlled manual check-in.

QR scanning is the fastest admission method.

Manual guest lookup is the resilient fallback.

Both methods must use the same secure backend access-control engine.
