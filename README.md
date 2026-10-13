<div align="center">

# 🏏 IPL Mega Auction

**Every Player Has a Price. Some Have a Match.**
A live IPL franchise auction platform — ten franchises, a 273-player pool, ₹120 Cr purse per team, real-time bidding on the official IPL increment ladder, and **Right-To-Match (RTM) cards** that work only on each franchise's fixed list of former players.

Built in the same stack and visual language as [hpl-auction](https://github.com/vardhan23v/hpl-auction); player pool from the open-source [Crick Auction](https://github.com/Shaurya01836/ipl-auction) dataset (Apache-2.0). Hosted on **Railway** (app + MySQL).

</div>

---

## ✨ What's inside

- **Live auction room** — broadcast-style screen: player headshot, stats, set, rating, the current bid as the hero element, highest franchise, live bid feed, all ten purses, RTM cards left, overseas slots, SOLD / UNSOLD / RTM stamps.
- **Server-authoritative bidding** — auction live, player live, timer open, squad < 25, overseas < 8, purse sufficient, IPL ladder increments (₹5 L → ₹10 L → ₹20 L → ₹25 L), owner bids only for their own franchise. The browser is never trusted.
- **Right-To-Match cards (new)** — the IPL 2025 three-step rule, fully server-driven with its own countdown:
  1. **Decision** — the player's previous franchise gets a window to USE a card or PASS.
  2. **Final raise** — the winning bidder may raise the price once (or keep it).
  3. **Match** — the previous franchise matches the final price (card consumed) or declines.
  RTM is only possible for players on a franchise's **fixed list** (`Player.previousTeamId`, pre-filled from IPL 2025 squads, editable per player in the admin panel), needs an unused card, enough purse, and room in the squad and overseas quota. Each step has a timeout with a safe default (pass / keep / decline).
- **Shared countdown + auto-sell** — one server timer; when it hits zero the highest bidder wins (after the RTM window) or the player goes unsold. Can be switched off for a manual auctioneer.
- **Transaction-safe sales** — SELL/MATCH run in one MySQL transaction with `SELECT … FOR UPDATE` row locks: squad entry, purse, overseas count, RTM card, player status, auction event — commit or roll back everything. **UNDO** reverses the last sale including the RTM card.
- **Lobby & sign-in (crickauction-style)** — Google or guest sign-in, then claim one of the ten franchises; the admin can still reassign or create password logins per franchise.
- **Owner dashboard** — purse, squad, overseas, RTM cards, big BID button with ladder quick-bids and custom jump bids, RTM decision buttons when it's their call, their RTM-eligible list.
- **Auctioneer console** — start player (queue or hand-picked), timer start/pause/reset, SELL / UNSOLD / SKIP / NEXT / UNDO, record bids for any franchise, act on RTM decisions on behalf of a franchise, order the queue by set.
- **Admin** — franchises (names, colours, logos, owner logins, RTM cards per team), players (CRUD, RTM list editing, assign/move, re-import the pool), drag-to-reorder queue, sold/unsold lists, bid & event log, users, settings.
- **Public pages** — live room, projector **big screen**, player pool browser, squads, **RTM board**, history, analytics (Recharts), results with a **Franchise Strength** leaderboard.

## 🚀 Quick start

**Prerequisites:** Node ≥ 20, MySQL 8 (Docker is easiest).

```bash
docker run -d --name ipl-mysql -e MYSQL_ROOT_PASSWORD=iplroot -e MYSQL_DATABASE=ipl -e MYSQL_USER=ipl -e MYSQL_PASSWORD=iplpass -p 3306:3306 mysql:8.4
docker exec ipl-mysql mysql -uroot -piplroot -e "GRANT ALL PRIVILEGES ON *.* TO 'ipl'@'%'; FLUSH PRIVILEGES;"   # Prisma shadow DB
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed          # 10 franchises, accounts, 273-player pool with RTM lists
npm run dev              # http://localhost:3000
```

**Sign-in works like crickauction.in:** managers press **Continue with Google** or **Join as Guest** (just a name), land in the **lobby** (`/lobby`) and claim a free franchise — that makes them its OWNER. A franchise taken by another manager is locked. Staff use the email + password login under "Admin / auctioneer sign-in":

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ipl.local` | `ipl2026` |
| Auctioneer | `auctioneer@ipl.local` | `ipl2026` |

Google sign-in appears once `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set (OAuth redirect URI: `<NEXTAUTH_URL>/api/auth/callback/google`); guest sign-in always works. Spectators need no account — `/live` and `/display` are public.

## 📏 Auction rules (defaults, all editable in Settings)

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
Browser ──HTTP──▶ Next.js 16 (App Router) ──┐
   │                                        ├──▶ Prisma ──▶ MySQL (Railway)
   └──WebSocket──▶ Socket.IO ──▶ Auction engine ┘
                   (same Node process — server.ts)
```

- `server.ts` — custom Node server running Next.js and Socket.IO on one port.
- `src/server/auction-engine.ts` — single source of truth. Every mutation runs under a process-wide mutex and persists to MySQL. State machine: `WAITING → LIVE ⇄ PAUSED`, `LIVE → PLAYER_LIVE → SOLD | RTM_OFFER → RTM_RAISE → RTM_MATCH → SOLD`, `PLAYER_LIVE → UNSOLD`, `… → COMPLETED`.
- `src/server/socket.ts` — authenticates sockets from the NextAuth JWT, rate-limits bids, handles `bid:place` and `rtm:action`, broadcasts full snapshots.
- `src/hooks/useAuction.ts` — client hook: snapshot, offset-corrected countdowns (bid + RTM), SOLD/UNSOLD/RTM flashes.
- `prisma/data/players.json` — the pool (name, role, nationality, set, base price, photo, stats, rating, previous franchise).

### Realtime events
`auction:started/paused/resumed/completed` · `player:started/sold/unsold/skipped/next` · `bid:placed/accepted/rejected` · `rtm:offer/raise/match/passed` · `timer:updated` · `team:purseUpdated/squadUpdated` · `auction:undo` · `state:sync` — every event carries the full snapshot.

## ☁️ Deployment on Railway

One service runs the app + WebSockets, alongside Railway **MySQL** on the private network. `railway.json` already holds the build/start commands and the `/api/health` check.

1. Create a Railway project → add **MySQL**.
2. Add a service from this GitHub repo. Variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` (or `mysql://root:…@mysql.railway.internal:3306/railway`) |
| `NEXTAUTH_SECRET` | a long random string |
| `NEXTAUTH_URL` | the public URL of the service |
| `SOCKET_SERVER_URL` | same as `NEXTAUTH_URL` |
| `NODE_ENV` | `production` |
| `SEED_PASSWORD` | optional, password for the seeded staff accounts |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional, enables "Continue with Google" |

3. First deploy runs `prisma migrate deploy`. Seed once from your machine or a Railway shell:

```bash
railway run npm run db:seed
```

Keep exactly **1 replica** — the live engine is a single-process design.

## 🧪 Scripts

```bash
npm run dev          # tsx watch server.ts (Next dev + Socket.IO)
npm run build        # prisma generate && next build
npm start            # production server
npm run typecheck    # tsc --noEmit
npm run db:seed      # idempotent seed; SEED_REPLACE=1 wipes the auction and re-imports the pool
```
