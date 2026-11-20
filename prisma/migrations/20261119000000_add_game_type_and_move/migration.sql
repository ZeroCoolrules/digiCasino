-- Migration: add gameType to Game and move to GameSession
-- Applied by: bob/digicasino-games branch

ALTER TABLE "Game" ADD COLUMN "gameType" TEXT NOT NULL DEFAULT 'slots';
ALTER TABLE "GameSession" ADD COLUMN "move" TEXT;
