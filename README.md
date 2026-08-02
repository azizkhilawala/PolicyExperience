# PolicyExperience — Illumio Policy Authoring

Full-stack application for writing, reviewing, and provisioning microsegmentation policy.

## Setup

Requires Node.js >= 20.

```bash
npm install
npm run seed    # Seed the database with demo data
npm run dev     # Start client (5173) and server (3001)
```

Open http://localhost:5173

## Demo Users

- **Alex Chen** (Author) — standard policy writer
- **Morgan Davis** (Global Admin) — can unlock rulesets

Switch users via Settings page or the TopNav avatar menu.

## Seed Data

5 policies covering all states:
- HRM Production Access — provisioned, enabled
- ERP Database Access — draft, enabled
- K8s Frontend Services — pending, enabled
- Global Deny Logging — provisioned, disabled
- Payment Gateway — draft, locked by Morgan Davis

## Tech Stack

- **Frontend:** React + Vite + Astryx Design System (neutral theme)
- **Backend:** Express + better-sqlite3
- **Monorepo:** npm workspaces

## Project Structure

- `client/` — React frontend (Astryx components)
- `server/` — Express API + SQLite database
- `docs/` — Design specs and implementation plans
