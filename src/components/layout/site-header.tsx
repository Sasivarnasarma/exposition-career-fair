"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { RegistrationLink } from "@/components/landing/registration-link";

const subscribeToMount = () => () => {};
const clientMounted = () => true;
const serverMounted = () => false;

export function SiteHeader() {
  const pathname = usePathname();
  // Keep the shared prerendered header stable until the client route is known.
  const mounted = useSyncExternalStore(
    subscribeToMount,
    clientMounted,
    serverMounted,
  );
  const compact =
    mounted &&
    (pathname.startsWith(routes.register) ||
      pathname.startsWith("/registration"));
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
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={site.mainWebsite}
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "hidden sm:inline-flex",
              })}
            >
              Visit Exposition
              <ArrowUpRight aria-hidden="true" />
            </a>
            <RegistrationLink
              compact
              className="max-[380px]:px-3 max-[380px]:text-[10px]"
            />
          </div>
        )}
      </nav>
    </header>
  );
}
