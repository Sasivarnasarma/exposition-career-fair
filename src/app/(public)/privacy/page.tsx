import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container flex flex-1 items-center justify-center py-20"
    >
      <Card className="max-w-2xl">
        <p className="eyebrow">Your information</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Privacy notice
        </h1>
        <p className="mt-4 leading-8 text-muted-foreground">
          The registration privacy notice will be published before
          pre-registration opens. Candidate registration is currently
          unavailable.
        </p>
      </Card>
    </main>
  );
}
