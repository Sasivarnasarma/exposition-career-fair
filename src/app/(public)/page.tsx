import Link from "next/link";
import { ArrowUpRight, MoveUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/config/site";

export default function Home() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative site-container flex flex-1 flex-col justify-center py-20 sm:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-16 right-0 -z-10 size-64 rounded-full bg-primary/8 blur-[100px] sm:size-96"
      />
      <div className="mb-10 flex items-center gap-3 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        <span className="h-px w-9 bg-primary" />
        {site.edition} · Career Fair {site.year}
      </div>
      <div className="max-w-4xl">
        <p className="mb-5 text-sm font-medium text-primary">
          In collaboration with {site.collaborator}
        </p>
        <h1 className="text-5xl leading-[1.06] font-extrabold tracking-[-0.045em] sm:text-7xl lg:text-8xl">
          Your next chapter.
          <br />
          <span className="gold-text">A world of possibility.</span>
        </h1>
        <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
          A place for university talent to connect with the professional world.
          The next Exposition Career Fair experience is taking shape.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-5 py-3 text-sm text-primary">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary"
            />
            Pre-registration opens soon
          </span>
          <Link
            href={site.mainWebsite}
            className={buttonVariants({ variant: "ghost" })}
          >
            Explore Exposition
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="mt-16 flex items-center gap-4 text-xs tracking-wider text-muted-foreground uppercase">
        <MoveUpRight aria-hidden="true" className="size-5 text-primary" />
        University of Kelaniya · IMSSA
      </div>
    </main>
  );
}
