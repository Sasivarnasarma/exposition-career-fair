import { Suspense } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authenticatedAdmin } from "@/server/auth/permissions";
import { WorkspaceNav } from "@/components/admin/workspace-nav";
import { WorkspaceLoading } from "@/components/admin/workspace-loading";
import { SignOut } from "@/components/admin/sign-out";

export const instant = false;

async function AccessBoundary({ children }: { children: React.ReactNode }) {
  await connection();
  const admin = await authenticatedAdmin(await headers());
  if (!admin) redirect("/admin/login?reason=session");
  return (
    <div className="site-container grid flex-1 gap-6 border-t border-border pt-5 pb-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-10 lg:pt-8">
      <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
        <div className="hidden px-4 lg:block">
          <p className="eyebrow">The organiser desk</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Career Fair workspace
          </p>
        </div>
        <WorkspaceNav superAdmin={admin.role === "SUPER_ADMIN"} />
        <div className="hidden border-t border-border px-4 pt-6 lg:block">
          <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden className="size-4 text-primary" />
            {admin.role === "SUPER_ADMIN"
              ? "Super administrator"
              : "Administrator"}
          </div>
          <SignOut />
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Candidate information is private. Share exports only with authorised
            organisers.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <p className="text-xs text-muted-foreground">
            {admin.role === "SUPER_ADMIN"
              ? "Super administrator"
              : "Administrator"}
          </p>
          <SignOut />
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="min-w-0 pb-8">
        {children}
      </main>
    </div>
  );
}
export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="site-container flex-1 py-10">
          <WorkspaceLoading />
        </main>
      }
    >
      <AccessBoundary>{children}</AccessBoundary>
    </Suspense>
  );
}
