export function WorkspaceLoading() {
  return (
    <div
      role="status"
      aria-label="Loading organiser workspace"
      className="space-y-8 py-4"
    >
      <span className="sr-only">Loading organiser workspace...</span>
      <div aria-hidden className="motion-safe:animate-pulse">
        <div className="mb-3 h-3 w-24 rounded bg-primary/20" />
        <div className="h-9 w-64 max-w-full rounded bg-secondary" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
        <div className="mt-8 h-72 rounded-2xl border border-border bg-card" />
      </div>
    </div>
  );
}
