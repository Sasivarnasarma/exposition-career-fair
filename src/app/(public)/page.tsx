import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUpRight,
  MessagesSquare,
  Sparkle,
  UsersRound,
} from "lucide-react";
import conversation from "@/assets/images/previous-fair-conversation.webp";
import candidates from "@/assets/images/previous-fair-candidates.webp";
import { Reveal } from "@/components/landing/reveal";
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
        className="relative site-container pt-12 pb-10 sm:pt-16 lg:pt-20"
      >
        <div
          aria-hidden="true"
          className="hero-halo pointer-events-none absolute inset-0 -z-10"
        />
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_1fr] lg:gap-10 xl:gap-16">
          <div className="min-w-0">
            <div className="hero-enter mb-7 flex items-center gap-3 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase sm:text-xs">
              <span aria-hidden="true" className="h-px w-8 bg-primary/70" />
              Exposition {site.edition} · Career Fair {site.year}
            </div>
            <h1
              id="hero-title"
              className="hero-enter hero-enter-1 text-[clamp(2.7rem,5.1vw,4.6rem)] leading-[1.06] font-extrabold tracking-[-0.055em]"
            >
              Your next career
              <br />
              <span className="gold-text">opportunity</span>
              <br />
              starts here.
            </h1>
            <p className="hero-enter hero-enter-2 mt-7 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              Exposition Career Fair connects aspiring undergraduates and fresh
              graduates with the professional world, creating opportunities to
              explore career paths, engage with potential employers and discover
              where your skills can take you.
            </p>
            <div className="hero-enter hero-enter-3 mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <RegistrationLink />
              <a
                href="#previous-fair"
                className="group inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                A look back
                <ArrowDown
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-y-1 motion-reduce:transform-none"
                />
              </a>
            </div>
            {!site.registrationOpen && (
              <p className="hero-enter hero-enter-3 mt-3 text-xs text-muted-foreground">
                Pre-registration opens soon.
              </p>
            )}
            <div className="hero-enter hero-enter-4 mt-10 flex items-center gap-4 border-t border-border pt-6">
              <span aria-hidden="true" className="h-8 w-px bg-primary/60" />
              <div>
                <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  In collaboration with
                </p>
                <p className="mt-1 text-base font-semibold text-primary">
                  {site.collaborator}
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Organised by IMSSA · {site.university}
                </p>
              </div>
            </div>
          </div>
          <Reveal
            delay={0.12}
            className="relative min-w-0 pb-8 pl-5 sm:pl-9 lg:pt-6"
          >
            <div
              aria-hidden="true"
              className="absolute top-0 right-3 h-[80%] w-[88%] rotate-[5deg] rounded-[2rem] border border-primary/25 bg-primary/3"
            />
            <figure className="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-card shadow-2xl shadow-black/40">
              <div className="relative aspect-[1/1.05] overflow-hidden sm:aspect-[1.15/1] lg:aspect-[1/1.05]">
                <Image
                  src={conversation}
                  alt="A candidate speaking with representatives at the previous Exposition Career Fair"
                  fill
                  preload
                  sizes="(max-width: 639px) calc(100vw - 52px), (max-width: 1023px) calc(100vw - 100px), (max-width: 1400px) 45vw, 580px"
                  placeholder="blur"
                  className="object-cover object-[60%_center] transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/0 to-black/10"
                />
              </div>
              <figcaption className="absolute right-4 bottom-6 left-[46%] text-white sm:right-6">
                <span className="mb-3 inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.17em] uppercase">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-primary"
                  />
                  From the previous fair
                </span>
                <p className="max-w-[18ch] text-base leading-tight font-semibold tracking-tight min-[400px]:text-xl sm:text-2xl">
                  Real conversations.
                  <br />
                  New perspectives.
                </p>
              </figcaption>
            </figure>
            <Reveal
              hover
              delay={0.22}
              className="absolute -bottom-4 -left-1 w-[44%] sm:-bottom-6 sm:left-0"
            >
              <figure className="overflow-hidden rounded-2xl border-[5px] border-background bg-card shadow-xl shadow-black/40">
                <div className="relative aspect-[1.25/1]">
                  <Image
                    src={candidates}
                    alt="Students exploring career information together at the previous Career Fair"
                    fill
                    sizes="(max-width: 1023px) 42vw, 250px"
                    placeholder="blur"
                    className="object-cover object-[50%_40%]"
                  />
                </div>
                <figcaption className="px-3 py-3 text-[10px] font-medium text-muted-foreground">
                  A glimpse of the last edition
                </figcaption>
              </figure>
            </Reveal>
            <div
              aria-hidden="true"
              className="absolute -top-2 right-0 flex size-16 items-center justify-center rounded-full border border-primary/30 bg-background shadow-xl sm:size-20"
            >
              <Sparkle
                className="hero-spark size-8 text-primary sm:size-10"
                strokeWidth={1}
              />
            </div>
            <p className="mt-5 ml-auto max-w-[48%] text-right text-[10px] leading-5 text-muted-foreground sm:text-xs">
              One conversation can open
              <br />a whole new direction.
            </p>
          </Reveal>
        </div>
        <Reveal
          className="mt-16 border-t border-b border-border py-7 sm:mt-20"
          delay={0.1}
        >
          <div
            id="previous-fair"
            className="grid scroll-mt-8 gap-7 sm:grid-cols-[1fr_1fr_1fr] sm:items-center sm:gap-6"
          >
            <div>
              <p className="eyebrow">The previous Career Fair</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                A foundation to build on.
              </h2>
            </div>
            <div className="flex items-center gap-5 sm:justify-center sm:border-l sm:border-border">
              <UsersRound
                aria-hidden="true"
                className="size-7 shrink-0 text-primary/80"
                strokeWidth={1.25}
              />
              <div>
                <p className="text-4xl font-semibold tracking-[-0.05em] text-primary sm:text-5xl">
                  300<span className="text-2xl">+</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Student registrations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 sm:justify-center sm:border-l sm:border-border">
              <MessagesSquare
                aria-hidden="true"
                className="size-7 shrink-0 text-primary/80"
                strokeWidth={1.25}
              />
              <div>
                <p className="text-4xl font-semibold tracking-[-0.05em] text-primary sm:text-5xl">
                  400<span className="text-2xl">+</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Interviews facilitated
                </p>
              </div>
            </div>
          </div>
          <p className="mt-5 text-[11px] leading-5 text-muted-foreground">
            Figures and photographs reflect the previous event. Upcoming
            opportunities and participating employers will be announced
            separately.
          </p>
        </Reveal>
      </section>
      <section
        aria-labelledby="closing-title"
        className="site-container py-7 sm:py-10"
      >
        <Reveal className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-card px-6 py-10 sm:px-10 lg:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full border border-primary/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-12 size-72 rounded-full border border-primary/10"
          />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <p className="eyebrow">Exposition Career Fair {site.year}</p>
              <h2
                id="closing-title"
                className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.04em] sm:text-4xl"
              >
                Ready to take your
                <br className="hidden sm:block" /> next career step
                <span className="text-primary">?</span>
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {site.registrationOpen
                  ? "Pre-register now and stay connected with the opportunities ahead."
                  : "Stay connected with the opportunities ahead. Pre-registration will open soon."}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3">
              <RegistrationLink />
              <a
                href={site.mainWebsite}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                Discover the Exposition story
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
