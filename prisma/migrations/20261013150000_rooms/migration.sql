-- Multi-room rewrite: the singleton auction becomes per-Room. Existing (seed-only) auction data is dropped.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `Bid`, `AuctionEvent`, `SquadPlayer`, `Player`, `Team`, `Auction`, `AuctionSettings`, `AuditLog`, `User`;
SET FOREIGN_KEY_CHECKS = 1;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `image` TEXT NULL,
    `isGuest` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Room` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `hostId` VARCHAR(191) NOT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `startingPurse` INTEGER NOT NULL DEFAULT 12000,
    `maxSquadSize` INTEGER NOT NULL DEFAULT 25,
    `minSquadSize` INTEGER NOT NULL DEFAULT 18,
    `maxOverseas` INTEGER NOT NULL DEFAULT 8,
    `bidIncrement` INTEGER NOT NULL DEFAULT 0,
    `timerSeconds` INTEGER NOT NULL DEFAULT 15,
    `rtmTimerSeconds` INTEGER NOT NULL DEFAULT 20,
    `autoTimer` BOOLEAN NOT NULL DEFAULT true,
    `autoSell` BOOLEAN NOT NULL DEFAULT true,
    `rtmEnabled` BOOLEAN NOT NULL DEFAULT true,
    `defaultRtmCards` INTEGER NOT NULL DEFAULT 2,
    `unsoldReentry` BOOLEAN NOT NULL DEFAULT true,
    `state` ENUM('WAITING', 'LIVE', 'PAUSED', 'PLAYER_LIVE', 'RTM_OFFER', 'RTM_RAISE', 'RTM_MATCH', 'SOLD', 'UNSOLD', 'COMPLETED') NOT NULL DEFAULT 'WAITING',
    `currentPlayerId` VARCHAR(191) NULL,
    `currentBid` INTEGER NOT NULL DEFAULT 0,
    `highestTeamId` VARCHAR(191) NULL,
    `highestBidId` VARCHAR(191) NULL,
    `timerEndsAt` DATETIME(3) NULL,
    `timerRemainingMs` INTEGER NULL,
    `timerRunning` BOOLEAN NOT NULL DEFAULT false,
    `rtmTeamId` VARCHAR(191) NULL,
    `rtmBidderTeamId` VARCHAR(191) NULL,
    `rtmFinalAmount` INTEGER NULL,
    `rtmDeadlineAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Room_code_key`(`code`),
    INDEX `Room_isPublic_lastActiveAt_idx`(`isPublic`, `lastActiveAt`),
    INDEX `Room_hostId_idx`(`hostId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomMember` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'SPECTATOR',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RoomMember_userId_idx`(`userId`),
    UNIQUE INDEX `RoomMember_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Team` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `abbreviation` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#f59e0b',
    `color2` VARCHAR(191) NULL,
    `logoUrl` TEXT NULL,
    `ownerId` VARCHAR(191) NULL,
    `ownerName` VARCHAR(191) NULL,
    `startingPurse` INTEGER NOT NULL DEFAULT 12000,
    `purse` INTEGER NOT NULL DEFAULT 12000,
    `spent` INTEGER NOT NULL DEFAULT 0,
    `squadCount` INTEGER NOT NULL DEFAULT 0,
    `overseasCount` INTEGER NOT NULL DEFAULT 0,
    `rtmTotal` INTEGER NOT NULL DEFAULT 2,
    `rtmUsed` INTEGER NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Team_ownerId_idx`(`ownerId`),
    UNIQUE INDEX `Team_roomId_abbreviation_key`(`roomId`, `abbreviation`),
    UNIQUE INDEX `Team_roomId_ownerId_key`(`roomId`, `ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Player` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `photoUrl` TEXT NULL,
    `role` ENUM('BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER') NOT NULL DEFAULT 'BATSMAN',
    `nationality` VARCHAR(191) NOT NULL DEFAULT 'India',
    `overseas` BOOLEAN NOT NULL DEFAULT false,
    `capped` BOOLEAN NOT NULL DEFAULT true,
    `set` VARCHAR(191) NOT NULL DEFAULT 'Set 1',
    `basePrice` INTEGER NOT NULL DEFAULT 30,
    `rating` INTEGER NULL,
    `matches` INTEGER NOT NULL DEFAULT 0,
    `runs` INTEGER NOT NULL DEFAULT 0,
    `wickets` INTEGER NOT NULL DEFAULT 0,
    `average` DOUBLE NULL,
    `strikeRate` DOUBLE NULL,
    `economy` DOUBLE NULL,
    `highScore` VARCHAR(191) NULL,
    `bestBowling` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `status` ENUM('POOL', 'WAITING', 'LIVE', 'SOLD', 'UNSOLD', 'SKIPPED') NOT NULL DEFAULT 'POOL',
    `queueOrder` INTEGER NULL,
    `soldPrice` INTEGER NULL,
    `soldToId` VARCHAR(191) NULL,
    `soldAt` DATETIME(3) NULL,
    `previousTeamId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Player_roomId_status_idx`(`roomId`, `status`),
    INDEX `Player_roomId_queueOrder_idx`(`roomId`, `queueOrder`),
    INDEX `Player_previousTeamId_idx`(`previousTeamId`),
    UNIQUE INDEX `Player_roomId_externalId_key`(`roomId`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bid` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `playerId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `amount` INTEGER NOT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'BID',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Bid_playerId_createdAt_idx`(`playerId`, `createdAt`),
    INDEX `Bid_teamId_idx`(`teamId`),
    INDEX `Bid_roomId_createdAt_idx`(`roomId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuctionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `playerId` VARCHAR(191) NULL,
    `teamId` VARCHAR(191) NULL,
    `amount` INTEGER NULL,
    `payload` JSON NULL,
    `undone` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuctionEvent_roomId_createdAt_idx`(`roomId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SquadPlayer` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `playerId` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `viaRtm` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SquadPlayer_playerId_key`(`playerId`),
    INDEX `SquadPlayer_teamId_idx`(`teamId`),
    INDEX `SquadPlayer_roomId_idx`(`roomId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomMember` ADD CONSTRAINT `RoomMember_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomMember` ADD CONSTRAINT `RoomMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Player` ADD CONSTRAINT `Player_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Player` ADD CONSTRAINT `Player_soldToId_fkey` FOREIGN KEY (`soldToId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Player` ADD CONSTRAINT `Player_previousTeamId_fkey` FOREIGN KEY (`previousTeamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bid` ADD CONSTRAINT `Bid_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bid` ADD CONSTRAINT `Bid_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bid` ADD CONSTRAINT `Bid_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bid` ADD CONSTRAINT `Bid_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuctionEvent` ADD CONSTRAINT `AuctionEvent_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuctionEvent` ADD CONSTRAINT `AuctionEvent_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuctionEvent` ADD CONSTRAINT `AuctionEvent_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SquadPlayer` ADD CONSTRAINT `SquadPlayer_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SquadPlayer` ADD CONSTRAINT `SquadPlayer_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SquadPlayer` ADD CONSTRAINT `SquadPlayer_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

