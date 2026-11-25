import type { Metadata } from "next";
import { MailCheck, ShieldCheck } from "lucide-react";
import { AcceptInvitation } from "@/components/admin/accept-invitation";
import { Card } from "@/components/ui/card";
export const metadata: Metadata = {
  title: "Accept invitation",
  robots: { index: false, follow: false },
};
export default function AcceptInvitationPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container flex flex-1 items-center justify-center py-12 sm:py-20"
    >
      <Card className="w-full max-w-lg border-primary/20">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="icon-well">
            <MailCheck aria-hidden className="size-5" />
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden className="size-4 text-primary" />
            Organiser invitation
          </span>
        </div>
        <p className="eyebrow">Exposition Career Fair</p>
        <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
          Join the organising team.
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Set up your administrator account using the invitation sent by the
          super administrator.
        </p>
        <AcceptInvitation />
      </Card>
    </main>
  );
}
