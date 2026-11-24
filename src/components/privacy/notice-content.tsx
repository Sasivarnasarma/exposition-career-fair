import { privacy } from "@/config/privacy";
import { site } from "@/config/site";

const sections = [
  [
    "Who handles your information",
    `${site.organiser}, ${site.university}, organises the Exposition Career Fair. The organising team manages candidate information for this event.`,
  ],
  [
    "What we collect",
    "We collect your name, email, contact number, district, academic details, graduation year, career and opportunity preferences, referral source, and confirmations and consent choices. Profile links, specialization, GPA and its scale are optional. We do not request NIC numbers or a full residential address. Candidates do not need an account.",
  ],
  [
    "Why we use it",
    "We use these details to organise the Career Fair, prepare candidate information, communicate about your registration, verify email ownership, and understand participation. Event-update consent is optional and recorded separately from privacy agreement. Pre-registration does not guarantee an interview or employment.",
  ],
  [
    "Access and employer sharing",
    "Access is limited to authorised organisers through administrator roles. Organisers may export details for the event workflow and must protect those copies. This release does not authorise future employer sharing; any later sharing requires separate, clear permission.",
  ],
  [
    "Service providers",
    "The site is hosted using Vercel. PostgreSQL records are stored through Supabase. Resend processes transactional email. Cloudflare Turnstile helps protect registration, login and email-request endpoints from abuse. These services may process information outside Sri Lanka under their service arrangements. We do not sell candidate data.",
  ],
  [
    "Security and browser storage",
    "We use verified database encryption in transit, server-side access checks and abuse controls. Administrator sessions and short-lived registration receipts use HTTP-only cookies. Drafts may stay in session storage in your current browser tab for up to 24 hours; clear your draft on a shared device. Security-check tokens are never saved in drafts. One-time email links are protected in storage.",
  ],
  [
    "Retention and deletion",
    `Candidate data is retained for ${privacy.retentionDaysAfterEvent} days after the Career Fair, then deleted or anonymised. The organising team must include associated consent, verification and pending email records and organiser exports in this process. Provider backups may retain copies until normal expiry. Minimal administrative audit records may remain to document authorised actions. The final event date will be announced separately.`,
  ],
  [
    "Your requests and choices",
    "Contact the organising team to request access, correction or deletion, or to change your event-update preference. We may request enough information to verify the request and protect other candidates. Joining an optional WhatsApp community is separate and subject to WhatsApp's privacy practices.",
  ],
  [
    "Notice changes",
    "We record the notice version accepted with each registration. If purposes or sharing arrangements change, we will update this notice and obtain additional permission where needed.",
  ],
];

export function PrivacyNoticeContent() {
  return (
    <>
      <p className="mt-4 text-xs text-muted-foreground">
        Updated {privacy.updated} - version {privacy.version}
      </p>
      <div className="mt-9 space-y-8">
        {sections.map(([heading, body]) => (
          <section key={heading}>
            <h2 className="text-lg font-semibold">{heading}</h2>
            <p className="mt-3 text-sm leading-8 text-muted-foreground">
              {body}
            </p>
          </section>
        ))}
      </div>
      <section className="mt-9 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <h2 className="font-semibold">Contact the organisers</h2>
        <a
          href={`mailto:${privacy.contactEmail}`}
          className="mt-2 inline-flex min-h-11 items-center text-sm break-all text-primary underline"
        >
          {privacy.contactEmail}
        </a>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          Use the subject Career Fair privacy request. This is the published
          general organising contact.
        </p>
      </section>
    </>
  );
}
