# Hvaler Olympics 🏊🚣🎯

The official games of the archipelago. Profiles, yearly olympics, activities with
rank-based scoring, team events, history and backfilling of past years.

## Stack

- **TanStack Start** (React) — SSR framework, file-based routing, server functions
- **TanStack Query** — data fetching/caching on top of the server functions
- **TanStack Table** — sortable leaderboard
- **Clerk** — authentication
- **Cloudflare Workers + KV** — runtime and storage (binding: `OLYMPICS_KV`)
- **Tailwind CSS v4**, **bun** as package manager

## Local development

1. Install dependencies:

   ```bash
   bun install
   ```

2. Create a [Clerk application](https://dashboard.clerk.com) and copy the keys:

   ```bash
   cp .env.example .env            # VITE_CLERK_PUBLISHABLE_KEY (client bundle)
   cp .dev.vars.example .dev.vars  # CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY (worker)
   ```

3. Start the dev server (runs in workerd via the Cloudflare Vite plugin, with a
   local KV simulation — no Cloudflare account needed for dev):

   ```bash
   bun run dev
   ```

The **first person to sign in becomes admin** ("the olympic committee") and can
create games, activities and enter results. To promote more admins, edit the
`admins` key in KV (a JSON array of Clerk user ids).

## Deploy to Cloudflare

1. Create the KV namespace and put its id into `wrangler.jsonc`:

   ```bash
   bunx wrangler kv namespace create OLYMPICS_KV
   ```

2. Set the Clerk keys for production:

   ```bash
   bunx wrangler secret put CLERK_SECRET_KEY
   ```

   Put your `pk_live_…` key in `wrangler.jsonc` under `vars.CLERK_PUBLISHABLE_KEY`,
   and in `.env` as `VITE_CLERK_PUBLISHABLE_KEY` before building (it is inlined
   into the client bundle).

3. Ship it:

   ```bash
   bun run deploy
   ```

## How it works

### Domain model (KV keys)

| Key | Value |
|---|---|
| `profile:{clerkUserId}` | athlete profile (name, emoji, isAdmin) |
| `event:{year}` | one olympics per year: name, motto, status, participant ids |
| `activity:{year}:{id}` | discipline: kind, scoring config, teams, raw results |
| `admins` | JSON array of Clerk user ids |

### Scoring

Each activity stores **raw results** (a number per athlete or team) and a
**points distribution** (`10, 8, 6, …` — first number to 1st place). Rankings are
computed on read:

- `time` — fastest wins (entered as `1:23.4` or seconds)
- `count` — strokes/attempts, lowest or highest wins (configurable)
- `points` — highest score wins
- `guess` — closest to a target value wins

Ties share the better rank and its points. For **team activities**, every member
of a team receives the team's points in full. The event leaderboard sums points
across all activities marked *scored*, with gold/silver/bronze counts as
tie-breakers.

### Backfilling history

Admins can create an event for **any year** (Admin → "Light a new torch"), mark
it *completed*, add activities and type in the old results — the record books go
back as far as your memory does.
