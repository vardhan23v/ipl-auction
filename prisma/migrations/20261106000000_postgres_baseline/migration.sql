-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('POOL', 'WAITING', 'LIVE', 'SOLD', 'UNSOLD', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PlayingRole" AS ENUM ('BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER');

-- CreateEnum
CREATE TYPE "AuctionState" AS ENUM ('WAITING', 'LIVE', 'PAUSED', 'PLAYER_LIVE', 'RTM_OFFER', 'RTM_RAISE', 'RTM_MATCH', 'SOLD', 'UNSOLD', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "image" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "startingPurse" INTEGER NOT NULL DEFAULT 12000,
    "maxSquadSize" INTEGER NOT NULL DEFAULT 25,
    "minSquadSize" INTEGER NOT NULL DEFAULT 18,
    "maxOverseas" INTEGER NOT NULL DEFAULT 8,
    "bidIncrement" INTEGER NOT NULL DEFAULT 0,
    "timerSeconds" INTEGER NOT NULL DEFAULT 15,
    "rtmTimerSeconds" INTEGER NOT NULL DEFAULT 20,
    "autoTimer" BOOLEAN NOT NULL DEFAULT true,
    "autoSell" BOOLEAN NOT NULL DEFAULT true,
    "rtmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultRtmCards" INTEGER NOT NULL DEFAULT 2,
    "unsoldReentry" BOOLEAN NOT NULL DEFAULT true,
    "state" "AuctionState" NOT NULL DEFAULT 'WAITING',
    "currentPlayerId" TEXT,
    "currentBid" INTEGER NOT NULL DEFAULT 0,
    "highestTeamId" TEXT,
    "highestBidId" TEXT,
    "timerEndsAt" TIMESTAMP(3),
    "timerRemainingMs" INTEGER,
    "timerRunning" BOOLEAN NOT NULL DEFAULT false,
    "rtmTeamId" TEXT,
    "rtmBidderTeamId" TEXT,
    "rtmFinalAmount" INTEGER,
    "rtmDeadlineAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SPECTATOR',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#f59e0b',
    "color2" TEXT,
    "logoUrl" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "startingPurse" INTEGER NOT NULL DEFAULT 12000,
    "purse" INTEGER NOT NULL DEFAULT 12000,
    "spent" INTEGER NOT NULL DEFAULT 0,
    "squadCount" INTEGER NOT NULL DEFAULT 0,
    "overseasCount" INTEGER NOT NULL DEFAULT 0,
    "rtmTotal" INTEGER NOT NULL DEFAULT 2,
    "rtmUsed" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "role" "PlayingRole" NOT NULL DEFAULT 'BATSMAN',
    "nationality" TEXT NOT NULL DEFAULT 'India',
    "overseas" BOOLEAN NOT NULL DEFAULT false,
    "capped" BOOLEAN NOT NULL DEFAULT true,
    "set" TEXT NOT NULL DEFAULT 'Set 1',
    "basePrice" INTEGER NOT NULL DEFAULT 30,
    "rating" INTEGER,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "average" DOUBLE PRECISION,
    "strikeRate" DOUBLE PRECISION,
    "economy" DOUBLE PRECISION,
    "highScore" TEXT,
    "bestBowling" TEXT,
    "bio" TEXT,
    "status" "PlayerStatus" NOT NULL DEFAULT 'POOL',
    "queueOrder" INTEGER,
    "soldPrice" INTEGER,
    "soldToId" TEXT,
    "soldAt" TIMESTAMP(3),
    "previousTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'BID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionEvent" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "playerId" TEXT,
    "teamId" TEXT,
    "amount" INTEGER,
    "payload" JSONB,
    "undone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadPlayer" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "viaRtm" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_isPublic_lastActiveAt_idx" ON "Room"("isPublic", "lastActiveAt");

-- CreateIndex
CREATE INDEX "Room_hostId_idx" ON "Room"("hostId");

-- CreateIndex
CREATE INDEX "RoomMember_userId_idx" ON "RoomMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMember_roomId_userId_key" ON "RoomMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "Team_ownerId_idx" ON "Team"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_roomId_abbreviation_key" ON "Team"("roomId", "abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "Team_roomId_ownerId_key" ON "Team"("roomId", "ownerId");

-- CreateIndex
CREATE INDEX "Player_roomId_status_idx" ON "Player"("roomId", "status");

-- CreateIndex
CREATE INDEX "Player_roomId_queueOrder_idx" ON "Player"("roomId", "queueOrder");

-- CreateIndex
CREATE INDEX "Player_previousTeamId_idx" ON "Player"("previousTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_roomId_externalId_key" ON "Player"("roomId", "externalId");

-- CreateIndex
CREATE INDEX "Bid_playerId_createdAt_idx" ON "Bid"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "Bid_teamId_idx" ON "Bid"("teamId");

-- CreateIndex
CREATE INDEX "Bid_roomId_createdAt_idx" ON "Bid"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "AuctionEvent_roomId_createdAt_idx" ON "AuctionEvent"("roomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SquadPlayer_playerId_key" ON "SquadPlayer"("playerId");

-- CreateIndex
CREATE INDEX "SquadPlayer_teamId_idx" ON "SquadPlayer"("teamId");

-- CreateIndex
CREATE INDEX "SquadPlayer_roomId_idx" ON "SquadPlayer"("roomId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_soldToId_fkey" FOREIGN KEY ("soldToId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_previousTeamId_fkey" FOREIGN KEY ("previousTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionEvent" ADD CONSTRAINT "AuctionEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionEvent" ADD CONSTRAINT "AuctionEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionEvent" ADD CONSTRAINT "AuctionEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Supabase exposes the public schema through its REST API with the public anon key.
-- Enable RLS with no policies so only the server (Prisma, table owner) can read or write these tables.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Player" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bid" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuctionEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SquadPlayer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
