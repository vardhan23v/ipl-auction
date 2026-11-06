/** Instant skeleton while a room page's server data loads (keeps tab switches feeling immediate). */
export default function RoomLoading() {
  const bar = "animate-pulse rounded-xl bg-panel-2/80";
  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-3 md:px-4 md:py-4" aria-busy="true" aria-label="Loading">
      <div className="h-14 border-b border-line/60" />
      <div className={`${bar} mt-3 h-10`} />
      <div className="card mt-3 p-3 md:p-6">
        <div className="grid grid-cols-[88px_1fr] gap-3 md:grid-cols-[220px_1fr] md:gap-6">
          <div className={`${bar} h-[112px] md:h-[260px]`} />
          <div className="flex flex-col gap-2"><div className={`${bar} h-4 w-1/3`} /><div className={`${bar} h-8 w-2/3`} /><div className={`${bar} h-6 w-1/2`} /></div>
        </div>
        <div className={`${bar} mt-3 h-14`} />
      </div>
      <div className="mt-3 grid gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className={`${bar} h-12`} />)}</div>
    </div>
  );
}
