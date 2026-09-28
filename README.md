# Anbaram

Anbaram helps a District Collector's office keep track of donated goods — clothes,
blankets, stationery, books and more — as they move from the places where people
drop them off to the centres that hand them out to people who need them.

Before this, most of that tracking lived in phone calls, WhatsApp messages and
paper registers. Anbaram puts it in one place, so the office can see what was
collected, where it went, whether it arrived in good shape, and which places are
running low.

## How it works

There are three kinds of people involved, and each has their own app. All three
talk to the same Supabase database.

| Who | App | What they do |
|---|---|---|
| **Collection point officer** | Mobile app | Weighs what was donated, takes photos, and sends it off as a shipment (a "batch") to a distribution centre. |
| **Distribution centre officer** | Mobile app | Confirms each shipment when it arrives, notes if anything was damaged, and marks items as out of stock when they run out. |
| **Collector's office (admin)** | Web dashboard — **this repo** | Approves officers, manages places, watches shipments, sorts out problems and downloads reports. |

A typical day looks like this:

1. A collection point sends a batch → it shows up on the dashboard as **Sent**.
2. The distribution centre receives it → it becomes **Received**. If it arrived
   damaged, a **Flag** is raised automatically for the office to look at.
3. When a centre runs out of something, it shows up under **Requests**,
   and the office picks a collection point to send more.

## What's in this repo

```
Anbaram/
├── collector-dashboard/     The web dashboard (React + Vite)
├── supabase/
│   ├── migrations/          Database changes, run in order (001, 002, 003)
│   ├── functions/           Edge Function for signed Cloudinary photo uploads
│   └── tests/               rls_checks.sql — checks the security rules
├── anbaram_schema.sql       The full database: tables, views, triggers, security rules
├── anbaram_migration_collection_requests.sql
└── anbaram_feature_table_mapping.md   Which screen reads/writes which table
```

The two mobile apps are built separately and are not part of this repository.

## The dashboard

Screens in the dashboard:

- **Home** — totals by category, open flags, recent shipments, and which
  collection points are late
- **Officers** — approve or reject new sign-ups, assign them to a place, move or remove them
- **Collection Points** and **Distribution Centers** — add and edit places, upload a photo, see their history
- **Requests** — what each centre has run out of, and which collection point has been asked to send more
- **Shipments** — find any batch by its code and see its full journey
- **Flags** — damaged shipments waiting to be looked at; mark them as done
- **Reports** — monthly, quarterly and yearly numbers, with an **Export to Excel** button

The wording on screen is kept deliberately simple, because many of the people
using it are not comfortable with technical English.

Built with React 19, Vite, Tailwind CSS, TanStack Query, React Router, Recharts and
SheetJS. It's plain JavaScript — no TypeScript — so it's easy to pick up and edit.

## Getting started

You'll need **Node.js 20 or newer** and a **Supabase project**.

### 1. Set up the database

In the Supabase SQL Editor (with the role set to `postgres`), run these files in order:

1. `anbaram_schema.sql`
2. `supabase/migrations/001_security_fixes.sql`
3. `supabase/migrations/002_officer_assignment_rpcs.sql`
4. `anbaram_migration_collection_requests.sql`
5. `supabase/migrations/003_collection_requests_fixes.sql`

Want to be sure the security rules are working? Run `supabase/tests/rls_checks.sql`.
It changes nothing and prints a PASS/FAIL table.

### 2. Create your first admin

In Supabase, go to **Authentication → Users → Add user** and create an account
(tick "Auto confirm"). Copy its user ID, then run:

```sql
insert into public.admins (id, full_name, designation)
values ('<user-id>', 'Your Name', 'Collector');
```

Only people listed in `admins` can sign in to the dashboard. Officer accounts
from the mobile apps are turned away.

### 3. Run the dashboard

```bash
cd collector-dashboard
cp .env.example .env.local    # then fill in your Supabase URL and anon key
npm install
npm run dev
```

Open http://localhost:5173 and sign in with the admin account you just made.

> **Keep your keys safe.** `.env.local` is ignored by Git and never gets uploaded.
> Only ever put the *anon / publishable* key in it — never the `service_role`
> key or your Cloudinary API secret. Anything starting with `VITE_` ends up in the browser.

### Photos (optional)

To let admins upload photos of each place, add your Cloudinary cloud name and an
**unsigned** upload preset to `.env.local`. For a locked-down setup, deploy the
`cloudinary-sign` Edge Function instead — see
[collector-dashboard/README.md](collector-dashboard/README.md) for both options.

## Useful commands

Run these inside `collector-dashboard/`:

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dashboard locally |
| `npm run build` | Builds the production version into `dist/` |
| `npm run lint` | Catches typos, unused code and hook mistakes — run it after every change |
| `npm run format` | Tidies up the code formatting |

## A few things worth knowing

- **Security lives in the database.** Every table has row-level security, so even
  if someone pokes at the API directly, officers only see their own place and only
  admins see everything.
- **Some things happen on their own.** Batch codes (like `CP-014-B07`), a
  collection point's "last collected" date, and damage flags are all set by
  database triggers — the apps don't have to remember to do it.
- **SheetJS is bundled locally** in `collector-dashboard/vendor/`, because the copy
  on npm is out of date. Please don't delete that folder.

## Contributing

Found something broken, or have an idea? Open an issue or send a pull request.
If you change the database, add a new numbered file to `supabase/migrations/`
rather than editing an old one, and update `anbaram_feature_table_mapping.md` if
a screen starts using a different table.
