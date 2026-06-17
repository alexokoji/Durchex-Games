import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

function buildTransporter(): Transporter | null {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  transporter = buildTransporter();
  return transporter;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Send via the Resend HTTP API (no SDK dependency — keeps the lockfile lean). */
async function sendViaResend({ to, subject, html, text }: SendArgs): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.resend.from,
      to: [to],
      subject,
      html,
      text: text ?? stripHtml(html),
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`resend_${res.status}: ${t.slice(0, 200)}`);
  }
}

/**
 * Sends an email via Resend (preferred), then SMTP, then a dev console log —
 * so the flow works end-to-end whether or not a provider is configured.
 */
export async function sendMail({ to, subject, html, text }: SendArgs): Promise<void> {
  if (env.resend.enabled) { await sendViaResend({ to, subject, html, text }); return; }
  const t = getTransporter();
  if (!t) {
    console.log('\n[email · dev]', JSON.stringify({ to, subject, text: text ?? stripHtml(html) }, null, 2), '\n');
    return;
  }
  await t.sendMail({
    from: env.smtp.from,
    to, subject, html,
    text: text ?? stripHtml(html),
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Branded template shell ────────────────────────────────────────────────
// Email-safe HTML: tables + inline styles (no <style>, no flexbox/grid), so it
// renders consistently across Gmail/Outlook/Apple Mail. Dark, on-brand styling
// with the logo header and a professional footer.

const BRAND = {
  name:    process.env.EMAIL_BRAND_NAME || 'DUCHEXiGAMES',
  siteUrl: env.clientUrl,
  // Public URL of the logo (email clients can't read local assets). Override
  // with EMAIL_LOGO_URL; defaults to the web app's /assets/logo.png.
  logoUrl: process.env.EMAIL_LOGO_URL || `${env.clientUrl.replace(/\/$/, '')}/assets/logo.png`,
  support: process.env.SUPPORT_EMAIL || 'support@durchexigames.xyz',
  accent:  '#00ff88',
  accent2: '#00d4ff',
  bg:      '#0a0c10',
  panel:   '#11151c',
  border:  '#1f2937',
  text:    '#e8eaf0',
  muted:   '#8b9bb0',
  faint:   '#5b6b80',
};

interface WrapOpts { title: string; preheader?: string; contentHtml: string }

/** Wrap body content in the branded header/footer shell. */
export function wrapEmail({ title, preheader, contentHtml }: WrapOpts): string {
  const host = BRAND.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};-webkit-text-size-adjust:100%;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.bg};">${escape(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:${BRAND.panel};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tr><td align="center" style="padding:22px 28px;background:linear-gradient(135deg,#0e1217,#11151c);border-bottom:1px solid ${BRAND.border};">
        <img src="${BRAND.logoUrl}" alt="${escape(BRAND.name)}" height="40" style="display:block;height:40px;width:auto;border:0;outline:none;text-decoration:none;">
      </td></tr>
      <tr><td style="padding:30px 32px;color:${BRAND.text};font-size:15px;line-height:1.6;">
        ${contentHtml}
      </td></tr>
      <tr><td align="center" style="padding:20px 32px;background:#0c0f14;border-top:1px solid ${BRAND.border};color:${BRAND.muted};font-size:12px;line-height:1.6;">
        <p style="margin:0 0 6px;">© ${new Date().getFullYear()} ${escape(BRAND.name)}. All rights reserved.</p>
        <p style="margin:0 0 6px;">
          <a href="${BRAND.siteUrl}" style="color:${BRAND.accent2};text-decoration:none;">${escape(host)}</a>
          &nbsp;&middot;&nbsp;
          <a href="mailto:${BRAND.support}" style="color:${BRAND.accent2};text-decoration:none;">${escape(BRAND.support)}</a>
        </p>
        <p style="margin:0;color:${BRAND.faint};">You're receiving this because you have a ${escape(BRAND.name)} account. Please gamble responsibly. 18+.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#ffffff;">${escape(text)}</h1>`;
}
function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;color:${BRAND.muted};">${html}</p>`;
}
function ctaButton(href: string, label: string, color = BRAND.accent): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;"><tr>
    <td style="border-radius:10px;background:${color};">
      <a href="${href}" style="display:inline-block;padding:13px 28px;color:#001b10;font-weight:800;font-size:15px;text-decoration:none;border-radius:10px;">${escape(label)}</a>
    </td></tr></table>`;
}
function fineprint(html: string): string {
  return `<p style="margin:14px 0 0;color:${BRAND.faint};font-size:13px;line-height:1.5;">${html}</p>`;
}

// ─── Templates ──────────────────────────────────────────────────────────────

export function verificationCodeTemplate(username: string, code: string): { subject: string; html: string } {
  const content =
    heading('Verify your email') +
    paragraph(`Hi <b style="color:${BRAND.text};">${escape(username)}</b>, use the code below to verify your email and unlock deposits &amp; withdrawals.`) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;"><tr>
       <td align="center" style="padding:20px;background:#0c0f14;border:1px solid ${BRAND.border};border-radius:12px;">
         <div style="font-family:'Courier New',monospace;font-size:36px;font-weight:900;letter-spacing:12px;color:${BRAND.accent};">${escape(code)}</div>
       </td></tr></table>` +
    fineprint('This code expires in 20 minutes. If you didn&rsquo;t sign up, you can safely ignore this email.');
  return {
    subject: `${code} is your ${BRAND.name} verification code`,
    html: wrapEmail({ title: 'Verify your email', preheader: `Your verification code is ${code}`, contentHtml: content }),
  };
}

export function verificationEmailTemplate(username: string, link: string): { subject: string; html: string } {
  const content =
    heading(`Welcome, ${username}`) +
    paragraph('Confirm your email to unlock deposits &amp; withdrawals.') +
    ctaButton(link, 'Verify email') +
    fineprint(`If the button doesn&rsquo;t work, paste this link:<br><a href="${link}" style="color:${BRAND.accent2};word-break:break-all;">${link}</a>`) +
    fineprint('If you didn&rsquo;t sign up, you can safely ignore this email. The link expires in 24 hours.');
  return {
    subject: `Verify your ${BRAND.name} email`,
    html: wrapEmail({ title: 'Verify your email', preheader: 'Confirm your email address', contentHtml: content }),
  };
}

export function passwordResetTemplate(username: string, link: string): { subject: string; html: string } {
  const content =
    heading('Reset your password') +
    paragraph(`Hi <b style="color:${BRAND.text};">${escape(username)}</b>, tap the button below to choose a new password. This link expires in 60 minutes.`) +
    ctaButton(link, 'Reset password', BRAND.accent2) +
    fineprint(`If the button doesn&rsquo;t work, paste this link:<br><a href="${link}" style="color:${BRAND.accent2};word-break:break-all;">${link}</a>`) +
    fineprint('If you didn&rsquo;t request this, ignore this email &mdash; your password won&rsquo;t change.');
  return {
    subject: `Reset your ${BRAND.name} password`,
    html: wrapEmail({ title: 'Reset your password', preheader: 'Reset your password', contentHtml: content }),
  };
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string));
}
