/**
 * Seed: the platform admin. Creates (or finds) a Supabase Auth email+password user, then its app profile with role ADMIN.
 * Rooms (with their teams and player pool) are created by users in the app.
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + DATABASE_URL (run: `npm run db:seed`, which loads .env).
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first");
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@ipl.local").toLowerCase();
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) throw new Error("Set SEED_PASSWORD (8+ characters) in .env");
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  let id: string | undefined;
  const created = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: "Platform Admin" } });
  if (created.data.user) id = created.data.user.id;
  else {
    // Already exists: find it (paged list; fine for small projects) and reset the password to SEED_PASSWORD.
    for (let page = 1; !id && page <= 20; page++) {
      const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 });
      id = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
      if (!data.users.length) break;
    }
    if (!id) throw new Error(`Could not create or find ${email}: ${created.error?.message}`);
    await sb.auth.admin.updateUserById(id, { password });
  }
  await prisma.user.upsert({ where: { id }, update: { role: "ADMIN", email }, create: { id, name: "Platform Admin", email, role: "ADMIN" } });
  console.log(`Platform admin ready: ${email} — sign in at /login → Admin sign-in.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
