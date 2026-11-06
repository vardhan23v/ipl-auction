/** Seed: a platform admin account. Rooms (with their teams and player pool) are created by users in the app. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  const pw = process.env.SEED_PASSWORD ?? "ipl2026";
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@ipl.local";
  await prisma.user.upsert({ where: { email }, update: {}, create: { name: "Platform Admin", email, role: "ADMIN", passwordHash: await bcrypt.hash(pw, 10) } });
  console.log(`Platform admin: ${email} (password: ${pw}). Create an auction room at /rooms.`);
}
main().finally(() => prisma.$disconnect());
