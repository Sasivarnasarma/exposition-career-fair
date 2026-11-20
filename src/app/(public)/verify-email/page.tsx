import type { Metadata } from "next";
import { Suspense } from "react";
import { VerificationScreen } from "@/components/verification/verification-screen";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="site-container flex-1 py-20">
          <p role="status">Preparing email verification...</p>
        </main>
      }
    >
      <VerificationScreen />
    </Suspense>
  );
}
