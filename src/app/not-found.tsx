import Link from "next/link";
export default function NotFound() {
  return (
    <main className="stadium relative flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="display text-8xl text-gold">404</div>
      <div className="display mt-2 text-3xl">That player isn&rsquo;t in the pool</div>
      <Link href="/" className="btn-ghost mt-6">Back to the auction</Link>
    </main>
  );
}
