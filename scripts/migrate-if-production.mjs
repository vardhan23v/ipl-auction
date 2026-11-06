// Vercel build step: apply Prisma migrations only for PRODUCTION builds. Preview builds (pull requests) share the
// same Supabase database, so they must never change its schema before the change is merged.
import { execSync } from "node:child_process";
const env = process.env.VERCEL_ENV;
if (env === "production" || !env) {
  console.log(`[migrate] ${env ?? "local"} build: running prisma migrate deploy`);
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(`[migrate] ${env} build: skipping migrations (only production builds migrate)`);
}
