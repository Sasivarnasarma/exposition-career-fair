"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
export function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/auth/sign-out", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            if (!response.ok) throw new Error("Sign-out failed");
            router.replace("/admin/login");
            router.refresh();
          } catch {
            setError("Could not sign out. Please try again.");
            setBusy(false);
          }
        }}
      >
        <LogOut aria-hidden />
        {busy ? "Signing out..." : "Sign out"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
