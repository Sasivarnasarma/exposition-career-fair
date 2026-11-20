"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MailPlus,
  ShieldCheck,
  UserRoundCog,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminManagementData } from "@/server/admin/management";

function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
}
function Pagination({
  page,
  total,
  pageSize,
  otherPage,
  type,
}: {
  page: number;
  total: number;
  pageSize: number;
  otherPage: number;
  type: "accounts" | "invitations";
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const url = (target: number) =>
    type === "accounts"
      ? `/admin/admins?page=${target}&invitationPage=${otherPage}`
      : `/admin/admins?page=${otherPage}&invitationPage=${target}`;
  return (
    <nav
      aria-label={`${type === "accounts" ? "Administrator" : "Invitation"} pages`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm"
    >
      <span className="text-muted-foreground">
        {total} {type} · Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Button size="sm" variant="ghost" asChild>
            <Link href={url(page - 1)}>
              <ChevronLeft aria-hidden />
              Previous
            </Link>
          </Button>
        )}
        {page < pages && (
          <Button size="sm" variant="ghost" asChild>
            <Link href={url(page + 1)}>
              Next
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
export function AdminManagement({ data }: { data: AdminManagementData }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [notice, setNotice] = useState<{
    error: boolean;
    message: string;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<{
    kind: "account" | "invitation";
    id: string;
    active?: boolean;
  } | null>(null);
  const confirmationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (confirmation) confirmationRef.current?.focus();
  }, [confirmation]);
  const pending = busy || refreshing;
  async function mutate(
    path: string,
    method: string,
    body?: unknown,
    success = "Change saved.",
  ) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const result = await response.json();
      if (!response.ok) {
        const message =
          typeof result.error?.message === "string"
            ? result.error.message
            : "We could not save this change. Please try again.";
        setNotice({ error: true, message });
        return false;
      }
      setNotice({
        error: false,
        message:
          result.created === false
            ? "A valid invitation already exists. Check its delivery status below."
            : success,
      });
      setConfirmation(null);
      startTransition(() => router.refresh());
      return true;
    } catch {
      setNotice({
        error: true,
        message: "We could not reach the server. Please try again.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function invite(address: string) {
    return mutate(
      "/api/admin/invitations",
      "POST",
      { email: address },
      "Invitation queued. The recipient can use the email link within 48 hours.",
    );
  }
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Committee access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            The people behind the fair.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Invite organisers and manage access to candidate information. New
            invitations always create administrator accounts.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-2 text-xs text-primary">
          <ShieldCheck className="size-4" aria-hidden />
          Super administrator
        </span>
      </div>
      <section
        aria-labelledby="invite-heading"
        className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card p-6 sm:p-8"
      >
        <div className="flex items-start gap-4">
          <span className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
            <MailPlus className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="invite-heading" className="text-xl font-semibold">
              Bring an organiser on board
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Send a secure invitation to set up their account. They can view
              candidates and export registrations; account management stays with
              super administrators.
            </p>
          </div>
        </div>
        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={async (event) => {
            event.preventDefault();
            if (await invite(email)) setEmail("");
          }}
        >
          <div className="flex-1">
            <label
              htmlFor="admin-invite-email"
              className="mb-2 block text-sm font-medium"
            >
              Organiser email
            </label>
            <Input
              id="admin-invite-email"
              type="email"
              autoComplete="off"
              maxLength={254}
              required
              value={email}
              disabled={pending}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="organiser@example.org"
            />
          </div>
          <Button type="submit" disabled={pending} className="sm:min-h-12">
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <MailPlus aria-hidden />
            )}
            Send invitation
          </Button>
        </form>
      </section>
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${notice.error ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-primary/30 bg-primary/5 text-primary"}`}
        >
          {notice.error ? (
            <X className="mt-1 size-4 shrink-0" aria-hidden />
          ) : (
            <Check className="mt-1 size-4 shrink-0" aria-hidden />
          )}
          {notice.message}
        </div>
      )}
      {confirmation && (
        <section
          ref={confirmationRef}
          tabIndex={-1}
          aria-labelledby="confirm-account-change"
          className="rounded-2xl border border-primary/40 bg-accent p-5"
        >
          <h2 id="confirm-account-change" className="font-semibold">
            {confirmation.kind === "invitation"
              ? "Revoke this invitation?"
              : confirmation.active
                ? "Reactivate this administrator?"
                : "Deactivate this administrator?"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {confirmation.kind === "invitation"
              ? "The current link will stop working. You can send a new invitation later."
              : confirmation.active
                ? "They can sign in again with their existing credentials."
                : "They will be signed out and lose access immediately. Any invitations they issued will be revoked."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              disabled={pending}
              size="sm"
              onClick={() =>
                confirmation.kind === "invitation"
                  ? void mutate(
                      `/api/admin/invitations/${encodeURIComponent(confirmation.id)}`,
                      "DELETE",
                      undefined,
                      "Invitation revoked.",
                    )
                  : void mutate(
                      `/api/admin/accounts/${encodeURIComponent(confirmation.id)}`,
                      "PATCH",
                      { active: confirmation.active },
                      confirmation.active
                        ? "Administrator reactivated."
                        : "Administrator deactivated.",
                    )
              }
            >
              {pending && <LoaderCircle className="animate-spin" aria-hidden />}
              Confirm
            </Button>
            <Button
              disabled={pending}
              variant="outline"
              size="sm"
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}
      <section
        aria-labelledby="accounts-heading"
        className="overflow-hidden rounded-3xl border border-border bg-card"
      >
        <div className="flex items-center gap-3 p-5 sm:p-6">
          <UserRoundCog className="size-5 text-primary" aria-hidden />
          <h2 id="accounts-heading" className="text-lg font-semibold">
            Administrators
          </h2>
          <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs tabular-nums">
            {data.total}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <caption className="sr-only">
              Organiser accounts, roles and access controls
            </caption>
            <thead className="border-y border-border bg-background/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Organiser
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Access
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium">
                      {account.name}
                      {account.id === data.actorId && (
                        <span className="ml-2 text-xs text-primary">You</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {account.email}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {account.role === "SUPER_ADMIN"
                      ? "Super administrator"
                      : "Administrator"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-2 text-xs ${account.active ? "text-primary" : "text-muted-foreground"}`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${account.active ? "bg-primary" : "bg-muted-foreground"}`}
                      />
                      {account.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {account.id === data.actorId ? (
                      <span className="text-xs text-muted-foreground">
                        Current account
                      </span>
                    ) : (
                      <Button
                        disabled={pending}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmation({
                            kind: "account",
                            id: account.id,
                            active: !account.active,
                          })
                        }
                        aria-label={`${account.active ? "Deactivate" : "Reactivate"} ${account.email}`}
                      >
                        {account.active ? "Deactivate" : "Reactivate"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          type="accounts"
          page={data.page}
          total={data.total}
          pageSize={data.pageSize}
          otherPage={data.invitationPage}
        />
      </section>
      <section
        aria-labelledby="invitations-heading"
        className="overflow-hidden rounded-3xl border border-border bg-card"
      >
        <div className="p-5 sm:p-6">
          <h2 id="invitations-heading" className="text-lg font-semibold">
            Invitations
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Sent means the email provider accepted the message. It does not
            confirm inbox delivery or account creation.
          </p>
        </div>
        {data.invitations.length === 0 ? (
          <div className="border-t border-border px-6 py-12 text-center">
            <MailPlus
              className="mx-auto mb-4 size-8 text-primary/70"
              aria-hidden
            />
            <p className="font-medium">No invitations yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Invite your first organiser using the form above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <caption className="sr-only">
                Invitations, link status and email delivery
              </caption>
              <thead className="border-y border-border bg-background/40 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Link
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Delivery
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Expires
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-5 py-4">{invitation.email}</td>
                    <td
                      className={`px-5 py-4 text-xs ${invitation.status === "Pending" ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {invitation.status}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {invitation.delivery === "SENT"
                        ? "Sent"
                        : invitation.delivery === "PROCESSING"
                          ? "Sending"
                          : invitation.delivery === "FAILED"
                            ? "Failed"
                            : invitation.delivery === "CANCELLED"
                              ? "Cancelled"
                              : invitation.delivery === "PENDING"
                                ? "Queued"
                                : "Not queued"}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {date(invitation.expiresAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {invitation.status === "Pending" && (
                          <Button
                            disabled={pending}
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmation({
                                kind: "invitation",
                                id: invitation.id,
                              })
                            }
                          >
                            Revoke
                          </Button>
                        )}
                        {invitation.status !== "Accepted" &&
                          (invitation.status !== "Pending" ||
                            ["FAILED", "CANCELLED", "NOT_QUEUED"].includes(
                              invitation.delivery,
                            )) && (
                            <Button
                              disabled={pending}
                              variant="outline"
                              size="sm"
                              onClick={() => void invite(invitation.email)}
                            >
                              Invite again
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          type="invitations"
          page={data.invitationPage}
          total={data.invitationTotal}
          pageSize={data.pageSize}
          otherPage={data.page}
        />
      </section>
      <p className="text-xs leading-6 text-muted-foreground">
        Role changes are controlled manual operations. Keep access limited to
        current organisers and review it after the event.
      </p>
    </div>
  );
}
