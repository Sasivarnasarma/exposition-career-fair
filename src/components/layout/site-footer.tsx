import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="site-container mt-auto pt-12 pb-8">
      <div className="flex flex-col justify-between gap-6 border-t border-border pt-7 text-sm text-muted-foreground sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">
            {site.name} · {site.edition}
          </p>
          <p className="max-w-md text-xs leading-6">
            Organised by {site.organiser}, {site.university}.
          </p>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-6">
          <Link
            href={routes.privacy}
            className="inline-flex min-h-11 items-center rounded-sm hover:text-primary"
          >
            Privacy notice
          </Link>
          <a
            href={site.mainWebsite}
            className="inline-flex min-h-11 items-center gap-1 rounded-sm hover:text-primary"
          >
            Exposition
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </nav>
      </div>
    </footer>
  );
}
