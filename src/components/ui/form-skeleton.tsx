import { Card } from "./card";

export function FormSkeleton({
  fields = 2,
  label = "Loading form",
}: {
  fields?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-label={label} className="mt-8 space-y-6">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="space-y-6 motion-safe:animate-pulse">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="grid gap-3">
            <div className="h-4 w-28 rounded bg-secondary" />
            <div className="h-12 rounded-xl border border-border bg-secondary/50" />
          </div>
        ))}
        <div className="h-12 rounded-xl bg-primary/15" />
      </div>
    </div>
  );
}

export function StatusPageSkeleton({
  label = "Loading page",
}: {
  label?: string;
}) {
  return (
    <main
      id="main-content"
      className="site-container flex flex-1 items-center justify-center py-12 sm:py-20"
    >
      <Card className="w-full max-w-2xl">
        <div aria-hidden className="space-y-5 motion-safe:animate-pulse">
          <div className="size-14 rounded-2xl bg-primary/10" />
          <div className="h-9 w-3/4 rounded bg-secondary" />
          <div className="h-4 w-full rounded bg-secondary" />
        </div>
        <FormSkeleton label={label} />
      </Card>
    </main>
  );
}
