import type { Metadata } from "next";
import { StatusPageSkeleton } from "@/components/ui/form-skeleton";
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
      fallback={<StatusPageSkeleton label="Preparing email verification" />}
    >
      <VerificationScreen />
    </Suspense>
  );
}
