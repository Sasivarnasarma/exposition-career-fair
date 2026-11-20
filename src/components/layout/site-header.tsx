"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { site } from "@/config/site";

export function SiteHeader() {
  const compact = usePathname().startsWith(routes.register);
  return (
    <header className="site-container pt-4 sm:pt-6">
      <nav
        aria-label="Main navigation"
        className="flex min-h-20 flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-card/85 px-4 py-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:rounded-full sm:px-7"
      >
        <Brand />
        {compact ? (
          <Link
            href={routes.home}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft aria-hidden="true" />
            Career Fair
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <a
              href={site.mainWebsite}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Visit Exposition
              <ArrowUpRight aria-hidden="true" />
            </a>
            {site.registrationOpen && (
              <Link
                href={routes.register}
                className={buttonVariants({ size: "sm" })}
              >
                Pre-register
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
