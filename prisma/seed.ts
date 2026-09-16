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
