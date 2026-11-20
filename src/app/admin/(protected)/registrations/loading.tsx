export default function CandidatesLoading() {
  return (
    <div role="status" aria-label="Loading candidates" className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-secondary" />
      <div className="h-40 animate-pulse rounded-3xl border border-border bg-card" />
      <div className="h-80 animate-pulse rounded-3xl border border-border bg-card" />
      <span className="sr-only">Loading candidates…</span>
    </div>
  );
}
