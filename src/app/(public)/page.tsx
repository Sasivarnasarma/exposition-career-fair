import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowUpRight,
  MessagesSquare,
  UsersRound,
} from "lucide-react";
import {
  EventGallery,
  EventSlideshow,
  NextPhotoPreview,
} from "@/components/landing/event-slideshow";
import { RegistrationLink } from "@/components/landing/registration-link";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { absolute: `${site.name} ${site.year} | ${site.edition}` },
  description: `Explore career paths and connect with the professional world at ${site.name} ${site.year}, organised by IMSSA, ${site.university}, in collaboration with ${site.collaborator}.`,
  openGraph: {
    title: `${site.name} ${site.year}`,
    description:
      "Your next career opportunity starts here. Explore the Exposition Career Fair.",
    type: "website",
  },
};

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1}>
      <section
        aria-labelledby="hero-title"
        className="site-container pt-10 pb-14 sm:pt-16 lg:pt-20 lg:pb-20"
      >
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14 xl:gap-20">
          <div className="min-w-0">
            <p className="hero-enter mb-6 flex items-center gap-3 text-sm text-primary">
              <span aria-hidden className="h-px w-8 bg-primary/60" />
              Exposition Career Fair {site.year}
            </p>
            <h1
              id="hero-title"
              className="hero-enter hero-enter-1 max-w-[13ch] font-display text-[clamp(2.75rem,5.2vw,5.1rem)] leading-[1.06]"
            >
              Your next chapter starts with a conversation.
            </h1>
            <p className="hero-enter hero-enter-2 mt-7 max-w-[48ch] text-base leading-8 text-muted-foreground">
              Explore career paths, meet potential employers and discover where
              your skills could take you.
            </p>
            <p className="hero-enter hero-enter-2 mt-3 text-sm leading-7 text-muted-foreground">
              For undergraduates and recent graduates.
            </p>
            <div className="hero-enter hero-enter-3 mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <RegistrationLink />
              <a
                href="#fair-gallery"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-foreground transition-colors hover:text-primary"
              >
                View photos{" "}
                <ArrowDown aria-hidden className="size-4 lg:-rotate-90" />
              </a>
            </div>
            <Partnerships className="hidden lg:grid" />
          </div>
          <EventGallery>
            <div
              id="fair-gallery"
              className="hero-enter hero-enter-2 relative min-w-0 scroll-mt-8 pb-14 pl-4 sm:pb-16 sm:pl-8"
            >
              <figure className="group relative overflow-hidden rounded-[1.5rem] border border-border bg-card">
                <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[1.1/1] lg:aspect-[4/5]">
                  <EventSlideshow />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/5"
                  />
                </div>
                <figcaption className="pointer-events-none absolute right-5 bottom-8 left-[43%] text-white sm:right-7 sm:bottom-10">
                  <p className="mb-2 text-xs text-white/85">
                    From the previous fair
                  </p>
                  <p className="max-w-[16ch] text-lg leading-snug font-medium sm:text-2xl">
                    Real conversations. New perspectives.
                  </p>
                </figcaption>
              </figure>
              <div className="absolute bottom-0 left-0 w-[42%]">
                <NextPhotoPreview />
              </div>
              <p className="mt-4 ml-auto max-w-[50%] text-right text-xs leading-5 text-muted-foreground">
                A look back at the people and possibilities.
              </p>
            </div>
          </EventGallery>
        </div>
        <Partnerships className="grid lg:hidden" />
      </section>
      <section
        id="previous-fair"
        aria-labelledby="previous-heading"
        className="site-container scroll-mt-8 border-y border-border py-10 sm:py-12"
      >
        <div className="grid gap-8 sm:grid-cols-[1.25fr_1fr_1fr] sm:items-center sm:gap-10">
          <div>
            <p className="text-sm text-primary">The previous Career Fair</p>
            <h2
              id="previous-heading"
              className="mt-3 font-display text-3xl leading-tight sm:text-4xl"
            >
              A fair full of first conversations.
            </h2>
          </div>
          <div className="flex items-start gap-4 sm:border-l sm:border-border sm:pl-8">
            <UsersRound
              aria-hidden
              className="mt-2 size-6 shrink-0 text-primary"
              strokeWidth={1.5}
            />
            <div>
              <p className="text-4xl font-medium tracking-tight tabular-nums">
                300+
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Student registrations
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 sm:border-l sm:border-border sm:pl-8">
            <MessagesSquare
              aria-hidden
              className="mt-2 size-6 shrink-0 text-primary"
              strokeWidth={1.5}
            />
            <div>
              <p className="text-4xl font-medium tracking-tight tabular-nums">
                400+
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Interviews facilitated
              </p>
            </div>
          </div>
        </div>
        <p className="mt-7 max-w-3xl text-xs leading-6 text-muted-foreground">
          Figures and photographs reflect the previous event. Upcoming
          opportunities and participating employers will be announced
          separately.
        </p>
      </section>
      <section
        aria-labelledby="closing-title"
        className="site-container py-14 sm:py-20"
      >
        <div className="grid gap-8 rounded-2xl border border-border bg-card px-6 py-9 sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
          <div className="max-w-2xl">
            <h2
              id="closing-title"
              className="font-display text-3xl leading-tight sm:text-5xl"
            >
              Make room for your next opportunity.
            </h2>
            <p className="mt-4 max-w-[56ch] text-sm leading-7 text-muted-foreground">
              {site.registrationOpen
                ? "Tell the organising team about yourself and the opportunities you are looking for."
                : "Explore what you will need to pre-register. Submission will be available when registration opens."}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <RegistrationLink />
            <a
              href={site.mainWebsite}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-primary"
            >
              Discover Exposition{" "}
              <ArrowUpRight aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function Partnerships({ className }: { className: string }) {
  return (
    <div
      className={`mt-10 grid-cols-2 gap-4 border-t border-border pt-6 ${className}`}
    >
      <div>
        <p className="text-xs text-muted-foreground">In collaboration with</p>
        <p className="mt-1 text-sm font-medium">{site.collaborator}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Organised by IMSSA</p>
        <p className="mt-1 text-sm font-medium">{site.university}</p>
      </div>
    </div>
  );
}
