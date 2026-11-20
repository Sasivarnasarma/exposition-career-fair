import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authenticatedAdmin } from "@/server/auth/permissions";
import { Card } from "@/components/ui/card";
import { SignOut } from "@/components/admin/sign-out";
// Authentication redirects depend on the incoming session, so navigation may wait.
export const instant = false;

async function Workspace() {
  const admin = await authenticatedAdmin(await headers());
  if (!admin) redirect("/admin/login?reason=session");
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container flex-1 py-16"
    >
      <Card className="max-w-2xl">
        <ShieldCheck aria-hidden className="mb-6 size-8 text-primary" />
        <p className="eyebrow">Exposition organisers</p>
        <h1 className="mt-4 text-3xl font-bold">Organiser workspace</h1>
        <p className="mt-4 mb-8 leading-7 text-muted-foreground">
          You are signed in as{" "}
          {admin.role === "SUPER_ADMIN"
            ? "a super administrator"
            : "an administrator"}
          .
        </p>
        <SignOut />
      </Card>
    </main>
  );
}
export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="site-container py-16">
          Loading workspace...
        </p>
      }
    >
      <Workspace />
    </Suspense>
  );
}
