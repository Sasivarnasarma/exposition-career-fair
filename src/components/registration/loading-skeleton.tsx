export function RegistrationFieldsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading registration form"
      aria-busy="true"
      className="motion-safe:animate-pulse"
    >
      <span className="sr-only">Loading registration form</span>
      <div aria-hidden="true">
        <div className="h-7 w-48 max-w-full rounded-lg bg-secondary" />
        <div className="mt-3 h-4 w-4/5 rounded bg-secondary" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index}>
              <div className="mb-3 h-4 w-24 rounded bg-secondary" />
              <div className="h-12 rounded-xl border border-border bg-background" />
            </div>
          ))}
        </div>
        <div className="mt-9 flex justify-between gap-4 border-t border-border pt-6">
          <div className="h-11 w-20 rounded-xl bg-secondary" />
          <div className="h-11 w-32 rounded-xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}

export function RegistrationSkeleton() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container py-12 sm:py-20"
    >
      <div
        aria-hidden="true"
        className="mb-10 max-w-2xl motion-safe:animate-pulse"
      >
        <div className="h-4 w-44 rounded bg-secondary" />
        <div className="mt-4 h-12 w-4/5 rounded-lg bg-secondary" />
        <div className="mt-5 h-4 w-full rounded bg-secondary" />
        <div className="mt-3 h-4 w-2/3 rounded bg-secondary" />
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:gap-12">
        <aside aria-hidden="true" className="motion-safe:animate-pulse">
          <div className="grid grid-cols-4 gap-3 lg:grid-cols-1 lg:gap-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-3 lg:flex-row"
              >
                <div className="size-10 shrink-0 rounded-full bg-secondary" />
                <div className="h-3 w-12 rounded bg-secondary lg:w-36" />
              </div>
            ))}
          </div>
          <div className="mt-8 hidden aspect-[4/3] rounded-2xl bg-card lg:block" />
        </aside>
        <div className="min-w-0 rounded-3xl border border-border bg-card p-5 sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="mb-8 h-1 rounded-full bg-secondary"
          />
          <RegistrationFieldsSkeleton />
        </div>
      </div>
    </main>
  );
}
