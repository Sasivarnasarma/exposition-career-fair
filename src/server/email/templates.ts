export type EmailKind =
  | "REGISTRATION_CONFIRMATION"
  | "CANDIDATE_VERIFICATION"
  | "ADMIN_INVITATION"
  | "ADMIN_PASSWORD_RESET";

export type EmailTemplateInput = {
  kind: EmailKind;
  recipientName: string;
  actionUrl: string;
  reference?: string;
  mainWebsite: string;
  whatsappUrl?: string | null;
  logoUrl?: string;
};

type Copy = {
  subject: string;
  eyebrow: string;
  heading: string;
  introduction: string;
  action: string;
  explanation: string;
  ignore: string;
};
const copy: Record<EmailKind, Copy> = {
  REGISTRATION_CONFIRMATION: {
    subject: "Your Exposition Career Fair pre-registration",
    eyebrow: "Registration confirmed",
    heading: "You are pre-registered.",
    introduction:
      "Your Career Fair information has been saved. Please verify your email address so the organising team can confirm that it belongs to you.",
    action: "Verify my email",
    explanation:
      "Pre-registration and email verification are separate steps. Neither guarantees an interview, a position, or participation by a particular employer.",
    ignore:
      "If you did not pre-register, do not use this link. You can ignore this message.",
  },
  CANDIDATE_VERIFICATION: {
    subject: "Verify your Exposition Career Fair email",
    eyebrow: "Email verification",
    heading: "One more step.",
    introduction:
      "Use the link below to verify the email address on your Career Fair pre-registration. Your saved registration remains separate from its email-verification status.",
    action: "Verify my email",
    explanation:
      "Email verification confirms ownership of this address. It does not guarantee an interview or a position.",
    ignore:
      "If you did not request this email, do not use this link. You can ignore this message.",
  },
  ADMIN_INVITATION: {
    subject: "Your Exposition organiser invitation",
    eyebrow: "Organiser access",
    heading: "You are invited.",
    introduction:
      "You have been invited to join the Exposition Career Fair organising workspace. Use your personal invitation link to complete account setup.",
    action: "Accept invitation",
    explanation:
      "This invitation is intended only for its recipient. The link expires and can be used once. Keep it private.",
    ignore:
      "If you were not expecting an invitation, do not use this link. Contact the organising committee through a known channel.",
  },
  ADMIN_PASSWORD_RESET: {
    subject: "Reset your Exposition organiser password",
    eyebrow: "Organiser access",
    heading: "Reset your password.",
    introduction:
      "A password reset was requested for your organiser account. Use the link below to choose a new password.",
    action: "Reset password",
    explanation:
      "This password-reset link expires and can be used once. Keep it private. Your password will change only after you complete the reset.",
    ignore:
      "If you did not request a password reset, do not use this link. You can ignore this message.",
  },
};

const htmlEntities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) => htmlEntities[character] ?? character,
  );
}
function safeUrl(value: string) {
  try {
    if (/[\u0000-\u0020\u007f]/.test(value)) throw new Error("Invalid URL");
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error("Invalid URL");
    return url.href;
  } catch {
    throw new Error(
      "Email links must be valid HTTP or HTTPS URLs without credentials",
    );
  }
}

export function renderEmail(input: EmailTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const content = copy[input.kind];
  if (!content) throw new Error("Unsupported email template");
  const actionUrl = safeUrl(input.actionUrl);
  const mainWebsite = safeUrl(input.mainWebsite);
  const privacyUrl = safeUrl(new URL("/privacy", actionUrl).href);
  const communityUrl = input.whatsappUrl ? safeUrl(input.whatsappUrl) : null;
  const logo = new URL(
    safeUrl(
      input.logoUrl ||
        new URL("/images/brand/exposition-issue-22-email.png", actionUrl).href,
    ),
  );
  if (logo.pathname.endsWith("/exposition-issue-22.svg"))
    logo.pathname = logo.pathname.replace(
      /exposition-issue-22\.svg$/,
      "exposition-issue-22-email.png",
    );
  const logoUrl = logo.href;
  const candidate =
    input.kind === "REGISTRATION_CONFIRMATION" ||
    input.kind === "CANDIDATE_VERIFICATION";
  if (input.kind === "REGISTRATION_CONFIRMATION" && !input.reference?.trim())
    throw new Error("Registration confirmation requires a reference");
  const greeting = input.recipientName.trim()
    ? `Hello ${input.recipientName.trim()},`
    : "Hello,";
  const reference = candidate && input.reference ? input.reference : null;
  const expiry = candidate
    ? "This verification link expires and can be used once. If it no longer works, request a new verification email."
    : "If this link has expired, request a new invitation or password-reset email as appropriate.";
  const paragraph = (value: string) =>
    `<p style="margin:0 0 20px;font-size:16px;line-height:1.75;color:#c7c2ba;">${escapeHtml(value)}</p>`;
  const referenceHtml = reference
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;border:1px solid #514332;border-left:3px solid #e8c896;border-radius:10px;background-color:#1c1915;"><tr><td style="padding:20px;"><p style="margin:0 0 8px;color:#c0b5a5;font-size:11px;letter-spacing:2px;line-height:1.6;">Your registration reference</p><p class="email-reference" style="margin:0;color:#e8c896;font-family:Consolas,monospace;font-size:15px;line-height:1.8;word-break:break-all;">${escapeHtml(reference)}</p></td></tr></table>`
    : "";
  const communityIconUrl = safeUrl(new URL("whatsapp-email.png", logoUrl).href);
  const communityHtml =
    candidate && communityUrl
      ? `<table class="email-community-cta" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;"><tr><td align="center" bgcolor="#14231a" style="border:1px solid #376b48;border-radius:10px;background-color:#14231a;mso-padding-alt:14px 20px;"><a href="${escapeHtml(communityUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 20px;border-radius:10px;color:#b4efc4;font-size:14px;font-weight:700;line-height:1.7;text-align:center;text-decoration:none;mso-padding-alt:0;"><img src="${escapeHtml(communityIconUrl)}" width="22" height="22" alt="" role="presentation" style="display:inline-block;width:22px;height:22px;vertical-align:middle;border:0;">&nbsp;&nbsp;<span style="vertical-align:middle;">Join WhatsApp community</span></a></td></tr></table>`
      : "";
  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"><meta name="color-scheme" content="dark light"><title>${escapeHtml(content.subject)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}table{border-spacing:0}img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}a{word-break:break-word}@media only screen and (max-width:600px){.email-outer{padding:16px 8px!important}.email-padding{padding:28px 22px!important}.email-header{padding:28px 22px!important}.email-footer{padding:26px 22px!important}.email-heading{font-size:29px!important;line-height:1.25!important}.email-logo{width:260px!important;max-width:100%!important;height:auto!important}.email-stack{display:block!important;width:100%!important;max-width:100%!important;text-align:left!important}.email-badge-cell{padding:16px 0 0!important}.email-event-label span{font-size:13px!important}.email-footer-links{padding:18px 0 0!important;text-align:left!important}.email-community-cta{width:100%!important}.email-community-cta a{display:block!important;padding:14px 12px!important}.email-cta{width:100%!important}.email-cta a{display:block!important;padding:16px 12px!important}.email-reference{font-size:13px!important}.email-footer-link{display:inline-block!important;padding:6px 0!important;margin-right:16px!important}}</style></head>
<body style="margin:0;padding:0;width:100%;background-color:#0c0c0c;color:#f5f2eb;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#0c0c0c;mso-hide:all;">${escapeHtml(content.introduction)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0c0c0c" style="width:100%;background-color:#0c0c0c;"><tr><td class="email-outer" align="center" style="padding:40px 16px;">
<!--[if mso]><table role="presentation" width="600" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#141414" style="width:100%;max-width:600px;margin:0 auto;border:1px solid #303030;border-radius:20px;background-color:#141414;">
<tr><td height="4" bgcolor="#b8894f" style="height:4px;font-size:0;line-height:4px;background-color:#b8894f;border-radius:20px 20px 0 0;">&nbsp;</td></tr>
<tr><td class="email-header" style="padding:32px 36px 28px;background-color:#171510;border-radius:16px 16px 0 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="email-stack" valign="middle" style="vertical-align:middle;">
<a href="${escapeHtml(mainWebsite)}" style="display:inline-block;color:#e8c896;text-decoration:none;"><img class="email-logo" src="${escapeHtml(logoUrl)}" width="284" height="62" alt="Exposition Issue 22" style="display:block;width:284px;max-width:100%;height:auto;border:0;color:#e8c896;font-size:26px;"></a><p style="margin:9px 0 0;color:#bcb1a0;font-size:9px;font-weight:400;letter-spacing:2px;line-height:1.8;">CONNECTING TALENT &amp; OPPORTUNITY</p>
</td><td class="email-stack email-badge-cell" align="right" valign="middle" style="padding-left:16px;text-align:right;vertical-align:middle;">
<table class="email-event-label" role="presentation" cellspacing="0" cellpadding="0" border="0" style="display:inline-table;"><tr><td style="padding:0;text-align:left;white-space:nowrap;"><span style="color:#e8c896;font-size:12px;font-weight:700;line-height:1.8;">Career Fair</span><span style="margin-left:10px;padding-left:10px;border-left:1px solid #655139;color:#bcb1a0;font-size:12px;line-height:1.8;">Issue 22</span></td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 36px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td height="1" bgcolor="#514332" style="height:1px;font-size:0;line-height:1px;background-color:#514332;">&nbsp;</td></tr></table></td></tr>
<tr><td class="email-padding" style="padding:36px;">
<p style="margin:0 0 16px;color:#e8c896;font-size:10px;font-weight:700;letter-spacing:2px;line-height:1.8;">${escapeHtml(content.eyebrow)}</p><h1 class="email-heading" style="margin:0 0 28px;font-family:Georgia,serif;font-size:38px;line-height:1.2;font-weight:400;letter-spacing:-0.7px;color:#f5f2eb;">${escapeHtml(content.heading)}</h1>
${paragraph(greeting)}${paragraph(content.introduction)}${referenceHtml}
<table class="email-cta" role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;"><tr><td align="center" bgcolor="#e8c896" style="border:1px solid #e8c896;border-radius:10px;background-color:#e8c896;mso-padding-alt:15px 26px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:15px 26px;border-radius:10px;color:#0a0a0a;font-size:15px;font-weight:700;line-height:1.5;text-align:center;text-decoration:none;mso-padding-alt:0;">${escapeHtml(content.action)}</a></td></tr></table>
${paragraph(expiry)}${paragraph(content.explanation)}${communityHtml}
<p style="margin:28px 0 10px;color:#b9b9b9;font-size:12px;line-height:1.8;">If the button does not work, copy this link into your browser:</p><p style="margin:0;font-size:12px;line-height:1.8;overflow-wrap:anywhere;word-break:break-all;"><a href="${escapeHtml(actionUrl)}" style="color:#e8c896;text-decoration:underline;overflow-wrap:anywhere;word-break:break-all;">${escapeHtml(actionUrl)}</a></p>
</td></tr>
<tr><td style="padding:0 36px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td height="2" bgcolor="#b8894f" style="height:2px;font-size:0;line-height:2px;background-color:#b8894f;">&nbsp;</td></tr></table></td></tr>
<tr><td class="email-footer" bgcolor="#111110" style="padding:28px 36px 30px;background-color:#111110;border-radius:0 0 20px 20px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="email-stack" valign="top" style="vertical-align:top;"><p style="margin:0;color:#e8c896;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.2;">Exposition</p><p style="margin:7px 0 0;color:#f0e7da;font-size:11px;font-weight:700;letter-spacing:1.5px;line-height:1.8;">CAREER FAIR</p></td><td class="email-stack email-footer-links" align="right" valign="middle" style="padding-left:18px;text-align:right;vertical-align:middle;"><a class="email-footer-link" href="${escapeHtml(mainWebsite)}" style="display:inline-block;color:#e8c896;font-size:12px;line-height:1.8;text-decoration:underline;">Visit Exposition</a><span style="color:#514332;font-size:12px;">&nbsp;&nbsp;/&nbsp;&nbsp;</span><a class="email-footer-link" href="${escapeHtml(privacyUrl)}" style="display:inline-block;color:#e8c896;font-size:12px;line-height:1.8;text-decoration:underline;">Privacy notice</a></td></tr></table>
<p style="margin:20px 0 0;color:#c2b9ac;font-size:12px;line-height:1.9;">Exposition Career Fair organising committee<br>Industrial Management Science Students' Association<br>University of Kelaniya</p>
<p style="margin:12px 0 0;font-size:12px;line-height:1.8;"><a href="mailto:exposition.mit@gmail.com" style="color:#e8c896;text-decoration:underline;word-break:break-word;">exposition.mit@gmail.com</a></p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;"><tr><td style="border-top:1px solid #30302b;padding-top:20px;"><p style="margin:0 0 12px;color:#aaa59d;font-size:11px;line-height:1.9;">This is a transactional email about your Career Fair registration or organiser account. Keep personal verification and account-access links private.</p><p style="margin:0;color:#aaa59d;font-size:11px;line-height:1.9;">${escapeHtml(content.ignore)}</p></td></tr></table>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  const text = [
    "EXPOSITION CAREER FAIR",
    content.heading,
    greeting,
    content.introduction,
    reference ? `Registration reference: ${reference}` : null,
    `${content.action}: ${actionUrl}`,
    expiry,
    content.explanation,
    candidate && communityUrl ? `WhatsApp community: ${communityUrl}` : null,
    content.ignore,
    "Exposition Career Fair organising committee",
    "Industrial Management Science Students' Association | University of Kelaniya",
    "Contact: exposition.mit@gmail.com",
    `Visit Exposition: ${mainWebsite}`,
    `Privacy notice: ${privacyUrl}`,
    "This is a transactional email about your Career Fair registration or organiser account. Keep personal verification and account-access links private.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { subject: content.subject, html, text };
}
