"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UsersRound,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkspaceNav({ superAdmin }: { superAdmin: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/registrations", label: "Candidates", icon: UsersRound },
    ...(superAdmin
      ? [{ href: "/admin/admins", label: "Team access", icon: ShieldCheck }]
      : []),
  ];
  return (
    <nav
      aria-label="Organiser workspace"
      className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-12 shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
              active
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {label}
            <ArrowUpRight
              aria-hidden
              className={cn(
                "ml-auto hidden size-3.5 lg:block",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
