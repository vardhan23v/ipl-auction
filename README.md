<div align="center">

# 🏏 IPL Mega Auction

**Every Player Has a Price. Some Have a Match.**
An open-source, self-hostable IPL franchise auction platform. Anyone signs in, **creates a room**, shares the 6-character code, friends claim the ten franchises and the host runs a live auction — a 273-player pool, ₹120 Cr purse per team, real-time bidding on the official IPL increment ladder, and **Right-To-Match (RTM) cards** that work only on each franchise's fixed list of former players. Works great on phones.

Built in the same stack and visual language as [hpl-auction](https://github.com/vardhan23v/hpl-auction); player pool from the open-source [Crick Auction](https://github.com/Shaurya01836/ipl-auction) dataset (Apache-2.0). Hosted on **Railway** (app + MySQL).

</div>

---

## 🎮 How a game works

1. **Create a room** at `/rooms` (Google or guest sign-in). Pick purse, squad size, timer, RTM cards. You become the **host**.
2. **Share the code** — friends open `/r/CODE` (or type the code on the home page) and land in the room lobby.
3. **Claim franchises** — each manager picks one of the ten franchises; the host can kick/reassign.
4. **Host runs the auction** from the host console: start, queue, timer, SELL / UNSOLD / UNDO, RTM decisions on behalf of absent owners. Managers bid for their own franchise from the Live screen (`/r/CODE/live`) on their phones. Spectators watch the same screen or the projector screen `/r/CODE/display`.

Rooms are independent — many groups can run auctions at once on one deployment. Public rooms are listed on the home page; private rooms are code-only.

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
- **Rooms & lobby (crickauction-style)** — Google or guest sign-in, create or join a room by code, then claim one of the ten franchises; the host can kick/reassign owners.
- **Owner dashboard** — purse, squad, overseas, RTM cards, big BID button with ladder quick-bids and custom jump bids, RTM decision buttons when it's their call, their RTM-eligible list.
- **Host console** — start player (queue or hand-picked), timer start/pause/reset, SELL / UNSOLD / SKIP / NEXT / UNDO, never bid — only a franchise's manager bids, and only for their own team, exactly like crickauction (unclaimed franchises sit out), order the queue by set.
- **Room management (host)** — franchises (names, colours, logos, RTM cards per team), players (CRUD, RTM list editing, assign/move, re-import the pool), drag-to-reorder queue, sold/unsold lists, bid & event log, settings, danger zone (reset / delete room).
- **Platform admin** — `/admin` lists every room and user on the deployment.
- **Room pages** — live room, projector **big screen**, player pool browser, squads, **RTM board**, history, analytics (Recharts), results with a **Franchise Strength** leaderboard — all under `/r/CODE/…`.

## 🚀 Quick start

**Prerequisites:** Node ≥ 20, MySQL 8 (Docker is easiest).

```bash
docker run -d --name ipl-mysql -e MYSQL_ROOT_PASSWORD=iplroot -e MYSQL_DATABASE=ipl -e MYSQL_USER=ipl -e MYSQL_PASSWORD=iplpass -p 3306:3306 mysql:8.4
docker exec ipl-mysql mysql -uroot -piplroot -e "GRANT ALL PRIVILEGES ON *.* TO 'ipl'@'%'; FLUSH PRIVILEGES;"   # Prisma shadow DB
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed          # creates the platform admin account (rooms bring their own pool)
npm run dev              # http://localhost:3000
```

**Sign-in works like crickauction.in:** press **Continue with Google** or **Join as Guest** (just a name), then create a room or join one by code. Inside a room's lobby you claim a free franchise — that makes you its OWNER for that room. The platform admin uses the email + password login:

| Role | Email | Password |
|---|---|---|
| Platform admin | `admin@ipl.local` | `ipl2026` (or `SEED_PASSWORD`) |

Google sign-in appears once `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set (OAuth redirect URI: `<NEXTAUTH_URL>/api/auth/callback/google`); guest sign-in always works. Spectators need no account — `/r/CODE/live` and `/r/CODE/display` are public.

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
Browser ──HTTP──▶ Next.js 16 (App Router) ──┐
   │                                        ├──▶ Prisma ──▶ MySQL (Railway)
   └──WebSocket──▶ Socket.IO ──▶ Auction engine ┘
                   (same Node process — server.ts)
```

- `server.ts` — custom Node server running Next.js and Socket.IO on one port.
- `src/server/auction-engine.ts` — single source of truth, scoped per room (`roomId`). Every mutation runs under a per-room mutex and persists to MySQL. State machine: `WAITING → LIVE ⇄ PAUSED`, `LIVE → PLAYER_LIVE → SOLD | RTM_OFFER → RTM_RAISE → RTM_MATCH → SOLD`, `PLAYER_LIVE → UNSOLD`, `… → COMPLETED`.
- `src/server/socket.ts` — authenticates sockets from the NextAuth JWT, clients `room:join {code}` a Socket.IO room, rate-limits bids, handles `bid:place` and `rtm:action`, broadcasts full snapshots to that room only.
- `src/hooks/useAuction.ts` — client hook: snapshot, offset-corrected countdowns (bid + RTM), SOLD/UNSOLD/RTM flashes.
- `prisma/data/players.json` — the pool (name, role, nationality, set, base price, photo, stats, rating, previous franchise). Copied into every new room by `src/lib/pool.ts`.
- `src/lib/room.ts` / `src/lib/api.ts` — room codes, `getRoomAccess()` (host / owner / spectator), `roomGuard()` for the `/api/rooms/[code]/…` routes.

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
| `SEED_PASSWORD` | optional, password for the seeded platform admin |
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
npm run db:seed      # idempotent: creates/updates the platform admin (SEED_ADMIN_EMAIL, SEED_PASSWORD)
```
