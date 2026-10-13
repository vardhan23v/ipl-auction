"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="display text-5xl text-live">Something broke</div>
      <p className="mt-2 max-w-md text-sm text-muted">{error.message}</p>
      <button className="btn-gold mt-6" onClick={reset}>Try again</button>
    </main>
  );
}
