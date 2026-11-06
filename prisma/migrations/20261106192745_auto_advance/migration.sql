-- AlterTable
ALTER TABLE `Room` ADD COLUMN `nextPlayerAt` DATETIME(3) NULL,
    ADD COLUMN `nextPlayerGapSeconds` INTEGER NOT NULL DEFAULT 4;
