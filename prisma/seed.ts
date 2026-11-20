// Seeds the initial game catalog. Idempotent (upsert by slug) so it is safe to re-run.
// Run with: npm run db:seed --workspace=apps/api

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GAMES = [
  {
    slug: "demo-slots",
    name: "Demo Slots",
    description: "A classic 3-reel demo slot machine. Virtual credits only.",
    minBet: 10,
    maxBet: 100,
    isActive: true,
    gameType: "slots",
  },
  {
    slug: "dice-roll",
    name: "Dice Roll",
    description:
      "Roll two dice and bet on the total. Choose a target (2–11) and pick UNDER or OVER. " +
      "Exact match loses. Win pays 1.9× your bet. Virtual credits only.",
    minBet: 10,
    maxBet: 500,
    isActive: true,
    gameType: "dice-roll",
  },
  {
    slug: "high-low",
    name: "High-Low Cards",
    description:
      "A card is revealed — guess whether the next card is HIGHER or LOWER (Ace=1, King=13). " +
      "Tie rule: equal cards are a PUSH and your bet is returned. Win pays 1.9× your bet. " +
      "Virtual credits only.",
    minBet: 10,
    maxBet: 500,
    isActive: true,
    gameType: "high-low",
  },
];

async function main() {
  for (const game of GAMES) {
    await prisma.game.upsert({
      where: { slug: game.slug },
      update: game,
      create: game,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${GAMES.length} game(s).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
