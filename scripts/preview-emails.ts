import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderEmail, type EmailKind } from "../src/server/email/templates";

function previewEmails() {
  const directory = "docs/email-previews";
  mkdirSync(directory, { recursive: true });
  const examples: { kind: EmailKind; actionUrl: string; name: string }[] = [
    {
      kind: "REGISTRATION_CONFIRMATION",
      actionUrl:
        "https://careerfair.example.org/verify-email#token=placeholder",
      name: "registration-confirmation",
    },
    {
      kind: "CANDIDATE_VERIFICATION",
      actionUrl:
        "https://careerfair.example.org/verify-email#token=placeholder",
      name: "candidate-verification",
    },
    {
      kind: "ADMIN_INVITATION",
      actionUrl:
        "https://careerfair.example.org/admin/accept-invitation#token=placeholder",
      name: "admin-invitation",
    },
    {
      kind: "ADMIN_PASSWORD_RESET",
      actionUrl:
        "https://careerfair.example.org/admin/reset-password#token=placeholder",
      name: "admin-password-reset",
    },
  ];
  for (const example of examples) {
    const message = renderEmail({
      kind: example.kind,
      recipientName: "Example Recipient",
      actionUrl: example.actionUrl,
      reference: "EXPO-2027-EXAMPLE-REFERENCE",
      mainWebsite: "https://exposition.lk",
      whatsappUrl: "https://chat.whatsapp.com/example",
    });
    writeFileSync(join(directory, `${example.name}.html`), message.html);
    writeFileSync(
      join(directory, `${example.name}.txt`),
      `${message.subject}\n\n${message.text}\n`,
    );
    console.log(`Created ${example.name} preview`);
  }
}
try {
  previewEmails();
} catch {
  console.error("Email preview generation failed.");
  process.exitCode = 1;
}
