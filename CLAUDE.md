# IPL Mega Auction — notes for agents

- Stack mirrors `vardhan23v/hpl-auction`: Next.js 16 App Router + TS + Tailwind 4, Prisma 6 + MySQL, Socket.IO on a custom `server.ts`, NextAuth JWT. Dark "stadium" theme in `src/app/globals.css` (gold money, red live, purple RTM).
- Money is integer **lakhs** everywhere (₹1 Cr = 100). Format with `money()` from `src/lib/format.ts`.
- All auction mutations go through `src/server/auction-engine.ts` (mutex + DB transactions). Never mutate purses/squads from routes directly; admin assignment is the one exception and must keep `overseasCount`/`rtmUsed` consistent.
- RTM: `Player.previousTeamId` is the fixed RTM list; states `RTM_OFFER → RTM_RAISE → RTM_MATCH`; owners act via socket `rtm:action` or `POST /api/auction/rtm`.
- Roles: ADMIN, AUCTIONEER, OWNER (one franchise), SPECTATOR. Route guards live in `src/proxy.ts`.
- Local DB: Docker `ipl-mysql` (see README). Don't push to GitHub from an agent — the user pushes.
