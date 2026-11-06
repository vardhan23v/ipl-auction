<div align="center">

# 🏏 IPL Mega Auction

**Every Player Has a Price. Some Have a Match.**
An open-source, self-hostable IPL franchise auction platform. Anyone signs in, **creates a room**, shares the 6-character code, friends claim the ten franchises and the host runs a live auction — a 547-player IPL 2026 pool, ₹120 Cr purse per team, real-time bidding on the official IPL increment ladder, and **Right-To-Match (RTM) cards** that work only on each franchise's fixed list of former players. Works great on phones.

Built in the same stack and visual language as [hpl-auction](https://github.com/vardhan23v/hpl-auction); player pool from the open-source [Crick Auction](https://github.com/Shaurya01836/ipl-auction) dataset (Apache-2.0). Hosted on **Vercel** (app) + **Supabase** (Postgres, Auth, Realtime).

[![Play it live](https://img.shields.io/badge/▶%20PLAY%20IT%20LIVE-ipl--web--production.up.railway.app-F5B82E?style=for-the-badge&logo=cricket&logoColor=black)](https://ipl-web-production.up.railway.app)

[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Prisma 6](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_·_Auth_·_Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Hosted_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-F5B82E?style=for-the-badge)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-00C853?style=for-the-badge&logo=github&logoColor=white)](https://github.com/vardhan23v/ipl-auction/pulls)

Sign in with Google or as a guest, create a room, send the code to your friends and start bidding — no install needed.

</div>

---

## 🎮 How a game works

1. **Create a room** at `/rooms` (Google or guest sign-in). Pick purse, squad size, timer, RTM cards. You become the **host**.
2. **Share the code** — friends open `/r/CODE` (or type the code on the home page) and land in the room lobby.
3. **Claim franchises** — each manager picks one of the ten franchises; the host can kick/reassign.
4. **Host runs the auction** from the host console: start, queue, timer, UNSOLD / UNDO — when the clock runs out after bidding, the player is sold automatically. The host never bids — **only a franchise's manager can bid, and only for their own team** (exactly like crickauction). Managers bid from the Live screen (`/r/CODE/live`) on their phones; unclaimed franchises simply sit out. Spectators watch the same screen or the projector screen `/r/CODE/display`.
5. **The creator ends the auction** whenever they like — "End the auction" in the lobby, the live header or the host console. A lot still on the block is voided and the results become final.

Rooms are independent — many groups can run auctions at once on one deployment. Public rooms are listed on the home page; private rooms are code-only.

## ✨ What's inside

- **Live auction room** — broadcast-style screen: player headshot, stats, set, rating, the current bid as the hero element, highest franchise, live bid feed, all ten purses, RTM cards left, overseas slots, SOLD / UNSOLD / RTM stamps.
- **Server-authoritative bidding** — auction live, player live, timer open, squad < 25, overseas < 8, purse sufficient, IPL ladder increments (₹5 L → ₹10 L → ₹20 L → ₹25 L), owner bids only for their own franchise. The browser is never trusted.
- **Right-To-Match cards (new)** — the IPL 2025 three-step rule, fully server-driven with its own countdown:
  1. **Decision** — the player's previous franchise gets a window to USE a card or PASS.
  2. **Final raise** — the winning bidder may raise the price once (or keep it).
  3. **Match** — the previous franchise matches the final price (card consumed) or declines.
  RTM is only possible for players on a franchise's **fixed list** (`Player.previousTeamId`, pre-filled from IPL 2025 squads, editable per player in the admin panel), needs an unused card, enough purse, and room in the squad and overseas quota. Each step has a timeout with a safe default (pass / keep / decline).
- **Shared countdown + auto-sell** — one server timer; when it hits zero the highest bidder wins (after the RTM window) or the player goes unsold. There is no manual SELL button.
- **Transaction-safe sales** — every action runs in one Postgres transaction behind a per-room advisory lock, with `SELECT … FOR UPDATE` row locks on every sale and RTM match: squad entry, purse, overseas count, RTM card, player status, auction event — commit or roll back everything. **UNDO** reverses the last sale including the RTM card.
- **Rooms & lobby (crickauction-style)** — Google or guest sign-in, create or join a room by code, then claim one of the ten franchises; the host can kick/reassign owners.
- **Owner dashboard** — purse, squad, overseas, RTM cards, big BID button with ladder quick-bids and custom jump bids, RTM decision buttons when it's their call, their RTM-eligible list.
- **Host console** — start player (queue or hand-picked), timer start/pause/reset, UNSOLD / SKIP / NEXT / UNDO (sales happen automatically when the clock ends), order the queue by set, end the auction at any time. The host never bids: only a franchise's manager bids, and only for their own team, exactly like crickauction (unclaimed franchises sit out).
- **Room management (host)** — franchises (names, colours, logos, RTM cards per team), players (CRUD, RTM list editing, assign/move, re-import the pool), drag-to-reorder queue, sold/unsold lists, bid & event log, settings, danger zone (reset / delete room).
- **Platform admin** — `/admin` lists every room and user on the deployment.
- **Room pages** — live room, projector **big screen**, player pool browser, squads, **RTM board**, history, analytics (Recharts), results with a **Franchise Strength** leaderboard — all under `/r/CODE/…`.

## 🚀 Quick start

**Prerequisites:** Node ≥ 20 and a free [Supabase](https://supabase.com) project (pick the region closest to your players; set the same region for Vercel functions in `vercel.json`).

1. In Supabase: **Authentication → Sign In / Providers** → enable **Anonymous sign-ins** (guests) and, optionally, **Google** (paste your Google OAuth client ID/secret; in Google Cloud add the redirect URI Supabase shows you). Under **URL Configuration** add `http://localhost:3000/auth/callback` (and later your Vercel URL `https://<app>.vercel.app/auth/callback`).
2. Copy the connection strings and API keys into `.env`:

```bash
cp .env.example .env     # fill DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SEED_PASSWORD
npm install
npx prisma migrate deploy
npm run db:seed          # creates the platform admin (Supabase email+password user, role ADMIN)
npm run dev              # http://localhost:3000
```

**Sign-in works like crickauction.in:** press **Continue with Google** or **Join as Guest** (just a name), then create a room or join one by code. Inside a room's lobby you claim a free franchise — that makes you its OWNER for that room. The platform admin uses **Admin sign-in** with `SEED_ADMIN_EMAIL` / `SEED_PASSWORD`. Spectators need no account — `/r/CODE/live` and `/r/CODE/display` are public.

## 📏 Auction rules (defaults, editable per room by the host)

| Rule | Value |
|---|---|
| Franchises | 10 · ₹120 Cr purse each |
| Squad | max 25 · min 18 · max 8 overseas |
| Base prices | ₹30 L / 50 L / 75 L / 1 Cr / 1.5 Cr / 2 Cr (from the pool) |
| Increments | IPL ladder: ₹5 L below ₹1 Cr · ₹10 L to ₹2 Cr · ₹20 L to ₹5 Cr · ₹25 L above (jump bids in multiples of ₹5 L) |
| Bid timer | 15 s, auto-starts, resets on every bid, auto-sells at zero |
| RTM | 2 cards per franchise · 20 s per decision step |

Money is stored in **lakhs** as integers (₹120 Cr = `12000`).

## 🏗 Architecture

```
Phone ──HTTPS (bids, RTM, host actions)──▶ Vercel · Next.js 16 API ──▶ Prisma ──▶ Supabase Postgres
  ▲                                              │  (per-room advisory lock, one transaction per action)
  └──── Supabase Realtime channel room:CODE ◀────┘  (snapshot broadcast after commit)
```

- **No long-running server.** Everything runs as Vercel functions; live updates go out through Supabase Realtime.
- `src/server/auction-engine.ts` — single source of truth, scoped per room. Every mutation runs in one Postgres transaction that first takes `pg_advisory_xact_lock(hashtext(roomId))`, so concurrent bids from any instance are serialised. Broadcasts are queued and published (with a fresh snapshot) only after commit. State machine: `WAITING → LIVE ⇄ PAUSED`, `LIVE → PLAYER_LIVE → SOLD | RTM_OFFER → RTM_RAISE → RTM_MATCH → SOLD`, `PLAYER_LIVE → UNSOLD`, `… → COMPLETED`.
- **Clocks without timers:** the bidding clock and RTM windows are deadlines in the `Room` row. `settleDue()` applies an expired one (auto-sell / unsold / RTM pass-keep-decline). It runs before every action, on `GET /state`, and on `POST /api/rooms/CODE/tick`, which every live screen calls when its countdown reaches zero.
- `src/lib/realtime-server.ts` publishes via Supabase's HTTP broadcast API; `src/lib/realtime-client.ts` is the shared per-room channel in the browser (broadcast + presence for "N here").
- `src/lib/auth.ts` — Supabase Auth (Google, anonymous guests, admin email+password). The `User` table is the app profile keyed by the Supabase user id; `src/proxy.ts` refreshes the session cookie.
- `src/hooks/useAuction.ts` — client hook: snapshot, optimistic bids, offset-corrected countdowns, SOLD/UNSOLD/RTM flashes.
- `prisma/data/players.json` — the pool. Copied into every new room by `src/lib/pool.ts`.
- All tables have row-level security enabled with no policies: the browser can't read or write them through Supabase's REST API; only the server (Prisma) can.

### Realtime events (channel `room:CODE`)
`auction:started/paused/resumed/completed` · `player:started/sold/unsold/skipped/next` · `bid:accepted` · `rtm:offer/raise/match` · `timer:updated` · `team:purseUpdated` · `room:members` · `auction:undo` · `state:sync` — every event carries the full snapshot.

## ☁️ Deployment (Vercel + Supabase)

1. Supabase project set up as in the quick start (migrations are applied by the Vercel build).
2. On Vercel, import this GitHub repo. `vercel.json` pins functions to `hnd1` (Tokyo — keep it in the same region as your Supabase project) and builds with `npm run vercel-build` (`prisma generate && prisma migrate deploy && next build`).
3. Environment variables (Production + Preview):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase pooled URL, port 6543, `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase direct/session URL, port 5432 (migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key (server only) |

4. Add `https://<your-app>.vercel.app/auth/callback` to Supabase → Authentication → URL Configuration, then run `npm run db:seed` once from your machine to create the admin.

## 🧪 Scripts

```bash
npm run dev          # next dev
npm run build        # prisma generate && next build
npm start            # next start
npm run typecheck    # tsc --noEmit
npm run db:seed      # idempotent: creates/updates the platform admin in Supabase Auth (SEED_ADMIN_EMAIL, SEED_PASSWORD)
npx tsx scripts/check-pool.ts  # validate prisma/data/players.json
```

## 🤝 Contributing

Issues and pull requests are welcome — the auction rules live in `src/server/auction-engine.ts`, the player pool in `prisma/data/players.json`, and every room-scoped page under `src/app/r/[code]/`. See `CLAUDE.md` for the conventions.

## 📄 License

[MIT](LICENSE) © 2026 Vallur Sree Vardhan. Player data from [Crick Auction](https://github.com/Shaurya01836/ipl-auction) (Apache-2.0).
