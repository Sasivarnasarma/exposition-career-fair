import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PrivacyNoticeContent } from "@/components/privacy/notice-content";
export const metadata: Metadata = { title: "Privacy notice" };
export default function PrivacyPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container flex-1 py-12 sm:py-20"
    >
      <Card className="mx-auto max-w-3xl">
        <p className="eyebrow">Your information</p>
        <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
          Privacy notice
        </h1>
        <PrivacyNoticeContent />
      </Card>
    </main>
  );
}
