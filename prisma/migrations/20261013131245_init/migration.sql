-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'AUCTIONEER', 'OWNER', 'SPECTATOR') NOT NULL DEFAULT 'SPECTATOR',
    `teamId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_teamId_key`(`teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Team` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `abbreviation` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#f59e0b',
    `color2` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `ownerName` VARCHAR(191) NULL,
    `ownerEmail` VARCHAR(191) NULL,
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

    UNIQUE INDEX `Team_name_key`(`name`),
    UNIQUE INDEX `Team_abbreviation_key`(`abbreviation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Player` (
    `id` VARCHAR(191) NOT NULL,
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

    UNIQUE INDEX `Player_externalId_key`(`externalId`),
    INDEX `Player_status_idx`(`status`),
    INDEX `Player_queueOrder_idx`(`queueOrder`),
    INDEX `Player_previousTeamId_idx`(`previousTeamId`),
    INDEX `Player_set_idx`(`set`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuctionSettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `auctionName` VARCHAR(191) NOT NULL DEFAULT 'IPL Mega Auction 2026',
    `auctionDate` DATETIME(3) NULL,
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
    `spectatorAccess` BOOLEAN NOT NULL DEFAULT true,
    `unsoldReentry` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Auction` (
    `id` INTEGER NOT NULL DEFAULT 1,
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
    `updatedAt` DATETIME(3) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bid` (
    `id` VARCHAR(191) NOT NULL,
    `playerId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `amount` INTEGER NOT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'BID',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Bid_playerId_createdAt_idx`(`playerId`, `createdAt`),
    INDEX `Bid_teamId_idx`(`teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuctionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `playerId` VARCHAR(191) NULL,
    `teamId` VARCHAR(191) NULL,
    `amount` INTEGER NULL,
    `payload` JSON NULL,
    `undone` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuctionEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SquadPlayer` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `playerId` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `viaRtm` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SquadPlayer_playerId_key`(`playerId`),
    INDEX `SquadPlayer_teamId_idx`(`teamId`),
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
ALTER TABLE `User` ADD CONSTRAINT `User_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Player` ADD CONSTRAINT `Player_soldToId_fkey` FOREIGN KEY (`soldToId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Player` ADD CONSTRAINT `Player_previousTeamId_fkey` FOREIGN KEY (`previousTeamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bid` ADD CONSTRAINT `Bid_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bid` ADD CONSTRAINT `Bid_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bid` ADD CONSTRAINT `Bid_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuctionEvent` ADD CONSTRAINT `AuctionEvent_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuctionEvent` ADD CONSTRAINT `AuctionEvent_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SquadPlayer` ADD CONSTRAINT `SquadPlayer_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SquadPlayer` ADD CONSTRAINT `SquadPlayer_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
