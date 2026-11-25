import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import Link from "next/link";
import { CheckCircle2, ArrowUpRight } from "lucide-react";
import { readReceipt, receiptCookieName } from "@/server/registrations/receipt";
import { registrationSettings } from "@/server/registrations/config";
import { site } from "@/config/site";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusPageSkeleton } from "@/components/ui/form-skeleton";
import { buttonVariants } from "@/components/ui/button";
export const metadata: Metadata = {
  title: "Registration receipt",
  robots: { index: false, follow: false },
};
export const instant = false;
async function Receipt() {
  await connection();
  const receipt = readReceipt(
    (await cookies()).get(receiptCookieName)?.value,
    registrationSettings().eventId,
  );
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container flex flex-1 items-center justify-center py-16"
    >
      <Card className="w-full max-w-2xl">
        {receipt ? (
          <>
            <span className="mb-7 icon-well">
              <CheckCircle2 aria-hidden className="size-7" />
            </span>
            <p className="eyebrow">Your next step starts here</p>
            <h1 className="mt-4 font-display text-4xl leading-tight sm:text-4xl">
              You&apos;re pre-registered.
            </h1>
            <p className="mt-5 leading-8 text-muted-foreground">
              Your information has been saved. Keep the reference below for your
              records.
            </p>
            <div className="my-7 rounded-2xl border border-primary/25 bg-primary/5 p-5">
              <p className="text-xs tracking-widest text-muted-foreground uppercase">
                Registration reference
              </p>
              <p className="mt-3 font-mono text-sm leading-7 break-all text-primary">
                {receipt.reference}
              </p>
              <div className="mt-2">
                <CopyButton value={receipt.reference} />
              </div>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Pre-registration does not guarantee an interview or a position.
              Your confirmation email includes a link to verify your email
              address.
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Email delivery may take a few minutes. Your registration is
              already saved, even if the message is delayed. If it hasn’t
              arrived, request another verification email below.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">Registration receipt</p>
            <h1 className="mt-4 font-display text-4xl leading-tight">
              No current receipt found.
            </h1>
            <p className="mt-5 leading-8 text-muted-foreground">
              This receipt may have expired or belongs to another browser. If
              you have already registered, keep your saved reference and avoid
              submitting again.
            </p>
          </>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {receipt && (
            <>
              <Link href="/verify-email" className={buttonVariants()}>
                Verify or resend email
              </Link>
              {site.whatsappCommunityUrl && (
                <a
                  href={site.whatsappCommunityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Join the WhatsApp community
                  <ArrowUpRight aria-hidden />
                </a>
              )}
            </>
          )}
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to the Career Fair
          </Link>
        </div>
      </Card>
    </main>
  );
}
export default function SuccessPage() {
  return (
    <Suspense fallback={<StatusPageSkeleton label="Loading your receipt" />}>
      <Receipt />
    </Suspense>
  );
}
