import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { ShieldCheck } from "lucide-react";
import { authenticatedAdmin } from "@/server/auth/permissions";
import { getAdminManagement } from "@/server/admin/management";
import { AdminManagement } from "@/components/admin/admin-management";

export const metadata: Metadata = { title: "Administrators" };
export const instant = false;
async function Accounts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const requestHeaders = await headers();
  const actor = await authenticatedAdmin(requestHeaders, "admins:manage");
  if (!actor)
    return (
      <section className="rounded-3xl border border-border bg-card p-8">
        <ShieldCheck className="mb-5 size-8 text-primary" aria-hidden />
        <h1 className="text-2xl font-semibold">
          Super-administrator access required
        </h1>
        <p className="mt-3 text-muted-foreground">
          Administrator accounts are managed by the super administrator.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex min-h-11 items-center text-primary underline underline-offset-4"
        >
          Return to overview
        </Link>
      </section>
    );
  const params = await searchParams;
  const data = await getAdminManagement(requestHeaders, {
    page: Number(params.page),
    invitationPage: Number(params.invitationPage),
  });
  return <AdminManagement data={data} />;
}
export default function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="rounded-3xl border border-border bg-card p-8 text-muted-foreground"
        >
          Loading administrator accounts…
        </div>
      }
    >
      <Accounts searchParams={searchParams} />
    </Suspense>
  );
}
