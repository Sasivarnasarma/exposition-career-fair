import { Suspense } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { authenticatedAdmin } from "@/server/auth/permissions";
// Authentication redirects depend on the incoming session, so navigation may wait.
export const instant = false;

async function AccessBoundary({ children }: { children: React.ReactNode }) {
  // Better Auth reads the clock; exclude session validation from prerendering.
  await connection();
  const admin = await authenticatedAdmin(await headers());
  if (!admin) redirect("/admin/login?reason=session");
  return children;
}
export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="site-container flex-1 py-20">
          <p role="status">Checking organiser access...</p>
        </main>
      }
    >
      <AccessBoundary>{children}</AccessBoundary>
    </Suspense>
  );
}
