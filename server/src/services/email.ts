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

// ─── templates ───────────────────────────────────────────────────────────

export function verificationEmailTemplate(username: string, link: string): { subject: string; html: string } {
  return {
    subject: 'Verify your DUCHEXiGAMES email',
    html: `
      <div style="font-family: sans-serif; padding: 24px; background:#0a0c10; color:#e8eaf0">
        <h2 style="color:#00ff88">Welcome, ${escape(username)}</h2>
        <p>Tap the link below to verify your email and unlock deposits & withdrawals:</p>
        <p><a href="${link}" style="background:#00ff88;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:800">Verify email</a></p>
        <p style="font-size:12px;color:#7b8ba0">If you didn't sign up, you can safely ignore this email. The link expires in 24 hours.</p>
      </div>`,
  };
}

export function verificationCodeTemplate(username: string, code: string): { subject: string; html: string } {
  return {
    subject: `${code} is your DUCHEXiGAMES verification code`,
    html: `
      <div style="font-family: sans-serif; padding: 24px; background:#0a0c10; color:#e8eaf0; text-align:center">
        <h2 style="color:#00ff88">Welcome, ${escape(username)}</h2>
        <p>Enter this code to verify your email and unlock deposits &amp; withdrawals:</p>
        <p style="font-size:34px; font-weight:900; letter-spacing:10px; color:#00ff88; margin:18px 0; font-family:monospace">${escape(code)}</p>
        <p style="font-size:12px;color:#7b8ba0">This code expires in 20 minutes. If you didn't sign up, you can safely ignore this email.</p>
      </div>`,
  };
}

export function passwordResetTemplate(username: string, link: string): { subject: string; html: string } {
  return {
    subject: 'Reset your DUCHEXiGAMES password',
    html: `
      <div style="font-family: sans-serif; padding: 24px; background:#0a0c10; color:#e8eaf0">
        <h2 style="color:#00d4ff">Password reset, ${escape(username)}</h2>
        <p>Tap the link below to choose a new password. It expires in 60 minutes:</p>
        <p><a href="${link}" style="background:#00d4ff;color:#000;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:800">Reset password</a></p>
        <p style="font-size:12px;color:#7b8ba0">If you didn't request this, ignore this email — your password won't change.</p>
      </div>`,
  };
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string));
}
