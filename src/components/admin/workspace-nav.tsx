"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UsersRound, ShieldCheck } from "lucide-react";
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
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-card p-1 lg:flex lg:flex-col lg:gap-2 lg:rounded-none lg:bg-transparent lg:p-0"
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
              "group relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition-colors lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-sm",
              active
                ? "border-primary/20 bg-primary/10 text-primary lg:before:absolute lg:before:inset-y-3 lg:before:left-0 lg:before:w-0.5 lg:before:rounded-full lg:before:bg-primary"
                : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
