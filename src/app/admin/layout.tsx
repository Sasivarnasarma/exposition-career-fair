import type { Metadata } from "next";
import { Brand } from "@/components/layout/brand";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: "Organiser access",
    template: "%s | Exposition Organisers",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="site-container flex items-center justify-between gap-4 py-6">
        <Brand />
        <span className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground">
          Organiser workspace
        </span>
      </header>
      {children}
      <footer className="site-container flex flex-wrap items-center justify-between gap-4 py-6 text-xs text-muted-foreground">
        <p>Exposition · Authorised organising committee</p>
        <a
          href={site.mainWebsite}
          className="inline-flex min-h-11 items-center rounded-sm hover:text-primary"
        >
          Visit Exposition
        </a>
      </footer>
    </div>
  );
}
