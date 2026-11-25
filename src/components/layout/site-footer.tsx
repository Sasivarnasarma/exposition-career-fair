import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import { site } from "@/config/site";
import { PrivacyNoticeTrigger } from "@/components/privacy/notice-dialog";

const socials = [
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/theexposition",
    mark: "in",
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/Exposition.MIT",
    mark: "f",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/exposition_lk/",
    mark: "ig",
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@ExpositionMIT",
    mark: "yt",
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-primary/20 bg-black text-muted-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden text-center font-display text-[clamp(4rem,16vw,15rem)] leading-none whitespace-nowrap text-primary/[0.035]"
      >
        Exposition
      </div>
      <div className="relative site-container pt-10 pb-6 sm:pt-14">
        <div className="grid gap-10 pb-9 md:grid-cols-2 md:gap-16">
          <div>
            <Link
              href={site.mainWebsite}
              aria-label="Visit Exposition"
              className="inline-flex rounded-lg"
            >
              <Image
                src="/images/brand/exposition-issue-22.svg"
                width={350}
                height={77}
                alt="Exposition Issue 22"
                className="h-auto w-60 sm:w-80"
              />
            </Link>
            <p className="mt-5 max-w-md text-sm leading-7 sm:text-base">
              The university and industry engagement platform of the Department
              of Industrial Management, University of Kelaniya.
            </p>
            <p className="mt-3 max-w-md text-xs leading-6">
              Career Fair organised by the {site.organiser}.
            </p>
          </div>
          <div className="md:text-right">
            <h2 className="text-sm font-medium text-primary">Contact us</h2>
            <address className="mt-4 text-sm leading-7 not-italic">
              Department of Industrial Management (MIT)
              <br />
              Faculty of Science, University of Kelaniya
              <br />
              Kelaniya 11600, Sri Lanka
            </address>
            {site.contactEmail && (
              <a
                href={`mailto:${site.contactEmail}`}
                className="mt-2 inline-flex min-h-11 max-w-full items-center rounded-lg text-sm font-medium break-all text-foreground transition-colors hover:text-primary"
              >
                {site.contactEmail}
              </a>
            )}
            <nav
              aria-label="Exposition social media"
              className="mt-3 flex flex-wrap gap-3 md:justify-end"
            >
              {socials.map(({ name, href, mark }) => (
                <a
                  key={name}
                  href={href}
                  aria-label={`${name} (opens in a new tab)`}
                  title={name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <SocialMark mark={mark} />
                </a>
              ))}
            </nav>
          </div>
        </div>
        <nav
          aria-label="Footer navigation"
          className="grid grid-cols-2 gap-x-6 border-y border-border py-3 text-sm md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-8"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg hover:text-primary"
          >
            Career Fair
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center rounded-lg hover:text-primary"
          >
            Register
          </Link>
          <Link
            href="/#fair-gallery"
            className="inline-flex min-h-11 items-center rounded-lg hover:text-primary"
          >
            Previous fair photos
          </Link>
          <Link
            href="/verify-email"
            className="inline-flex min-h-11 items-center rounded-lg hover:text-primary"
          >
            Verify email
          </Link>
          <PrivacyNoticeTrigger
            className="inline-flex min-h-11 items-center rounded-lg text-left hover:text-primary"
            label="Privacy notice"
          />
          <a
            href={site.mainWebsite}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg hover:text-primary"
          >
            Visit Exposition <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </nav>
        <div className="flex flex-col justify-between gap-4 pt-5 text-xs leading-6 sm:flex-row sm:items-center">
          <p>© Exposition. All rights reserved.</p>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <p>Faculty of Science, University of Kelaniya</p>
            <a
              href="#site-top"
              aria-label="Back to top"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border hover:border-primary hover:text-primary"
            >
              <ArrowUp aria-hidden className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialMark({ mark }: { mark: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="currentColor"
    >
      {mark === "f" ? (
        <path d="M14 22v-9h3l.5-4H14V7c0-1.1.3-2 2-2h2V1.4A25 25 0 0 0 15 1c-3 0-5 1.8-5 5v3H7v4h3v9z" />
      ) : mark === "in" ? (
        <>
          <path d="M3 8h4v13H3zm6 0h4v2c.7-1.4 2-2.3 4-2.3 3.2 0 4 2.1 4 5.3v8h-4v-7c0-1.8-.2-3-2-3s-2 1.4-2 3v7H9z" />
          <circle cx="5" cy="4" r="2.2" />
        </>
      ) : mark === "ig" ? (
        <>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="12"
            cy="12"
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="17.5" cy="6.5" r="1.2" />
        </>
      ) : (
        <>
          <rect x="2" y="5" width="20" height="14" rx="4" />
          <path d="m10 9 6 3-6 3z" fill="var(--background)" />
        </>
      )}
    </svg>
  );
}
