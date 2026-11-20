import { site } from "@/config/site";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/config/routes";

export const metadata: Metadata = { title: "Pre-registration" };

export default function RegisterPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container flex flex-1 items-center justify-center py-20"
    >
      <Card className="w-full max-w-xl">
        <p className="eyebrow">Career Fair {site.year}</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Pre-registration opens soon.
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          We’re getting ready to welcome you. Please check back for the opening
          of pre-registration.
        </p>
        <Link
          href={routes.home}
          className={buttonVariants({ variant: "outline", className: "mt-8" })}
        >
          <ArrowLeft aria-hidden="true" />
          Back to the Career Fair
        </Link>
      </Card>
    </main>
  );
}
