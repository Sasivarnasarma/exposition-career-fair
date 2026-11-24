import type { Metadata } from "next";
import { site } from "@/config/site";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { registrationOptions } from "@/server/registrations/options";
import { RegistrationForm } from "@/components/registration/form";
import { RegistrationSkeleton } from "@/components/registration/loading-skeleton";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
export const metadata: Metadata = {
  title: "Pre-registration",
  robots: { index: false, follow: false },
};
export const instant = false;
async function Registration() {
  await connection();
  if (!site.registrationOpen)
    return (
      <Status
        title="Registration is currently closed."
        description="Please check back for updates."
      />
    );
  let options;
  try {
    options = await registrationOptions();
  } catch {
    return (
      <Status
        title="Registration is temporarily unavailable."
        description="Please try again shortly. Your information has not been submitted."
      />
    );
  }
  if (!options.canSubmit)
    return (
      <Status
        title="Registration is currently closed."
        description="Please check back for updates."
      />
    );
  return (
    <>
      <noscript>
        <p className="site-container py-8">
          Please enable JavaScript to complete the registration form.
        </p>
      </noscript>
      <RegistrationForm options={options} />
    </>
  );
}
function Status({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container flex flex-1 items-center justify-center py-20"
    >
      <Card className="max-w-2xl">
        <p className="eyebrow">Exposition Career Fair</p>
        <h1 className="mt-4 font-display text-4xl leading-tight">{title}</h1>
        <p className="mt-4 leading-8 text-muted-foreground">{description}</p>
        <Link
          href="/"
          className={buttonVariants({ variant: "outline", className: "mt-8" })}
        >
          Back to the Career Fair
        </Link>
      </Card>
    </main>
  );
}
export default function RegistrationPage() {
  return (
    <Suspense fallback={<RegistrationSkeleton />}>
      <Registration />
    </Suspense>
  );
}
