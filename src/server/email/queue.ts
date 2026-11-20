import "server-only";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { site } from "../../config/site";
import { renderEmail, type EmailKind } from "./templates";
import { encryptEmailPayload } from "./crypto";
import { emailSender } from "./config";
export const messageSchema = z
  .object({
    from: z.string(),
    to: z.array(z.email()).length(1),
    subject: z.string().max(300),
    html: z.string().max(131072),
    text: z.string().max(65536),
  })
  .strict();
export type EmailMessage = z.infer<typeof messageSchema>;
export type QueuedEmailInput = {
  kind: EmailKind;
  to: string;
  recipientName: string;
  actionUrl: string;
  reference?: string;
  dedupeKey: string;
  registrationId?: string;
  mainWebsite?: string;
  whatsappUrl?: string | null;
  expiresAt?: Date;
};
export function prepareEmail(input: QueuedEmailInput): EmailMessage {
  const recipient = z.email().parse(input.to);
  const rendered = renderEmail({
    ...input,
    mainWebsite: input.mainWebsite || site.mainWebsite,
    whatsappUrl: input.whatsappUrl ?? site.whatsappCommunityUrl,
  });
  return messageSchema.parse({
    from: emailSender(),
    to: [recipient],
    ...rendered,
  });
}
export async function queueEmail(
  tx: Prisma.TransactionClient,
  input: QueuedEmailInput,
) {
  const payloadCiphertext = encryptEmailPayload(prepareEmail(input));
  return tx.emailJob.upsert({
    where: { dedupeKey: input.dedupeKey },
    update: {},
    create: {
      kind: input.kind,
      registrationId: input.registrationId,
      dedupeKey: input.dedupeKey,
      expiresAt: input.expiresAt,
      payloadCiphertext,
    },
  });
}
