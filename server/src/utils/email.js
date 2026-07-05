const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Gmail OAuth2 via Nodemailer — Production-grade
//
// WHY OAuth2 instead of SMTP App Password?
//   Cloud platforms like Render's free tier block ALL outbound SMTP ports
//   (25, 465, 587) at the network level. OAuth2 authenticates over HTTPS
//   and lets Nodemailer call Gmail's API — no blocked ports.
//
// Required environment variables:
//   EMAIL_USER           – Your Gmail address (e.g. yourapp@gmail.com)
//   GMAIL_CLIENT_ID      – OAuth2 Client ID from Google Cloud Console
//   GMAIL_CLIENT_SECRET  – OAuth2 Client Secret
//   GMAIL_REFRESH_TOKEN  – Long-lived refresh token (see setup guide below)
//
// One-time setup (~5 minutes):
//   1. Go to https://console.cloud.google.com/ → create a project
//   2. Enable "Gmail API" (APIs & Services → Enable APIs)
//   3. Create OAuth credentials (APIs & Services → Credentials →
//      Create Credentials → OAuth client ID → Web application)
//   4. Add redirect URI: https://developers.google.com/oauthplayground
//   5. Note down Client ID + Client Secret
//   6. Go to https://developers.google.com/oauthplayground
//   7. Click ⚙ (settings) → "Use your own OAuth credentials"
//      → paste Client ID + Client Secret
//   8. In the left list, find "Gmail API v1" →
//      select scope: https://mail.google.com/ → "Authorize APIs"
//   9. Sign in with your Gmail account → allow access
//  10. Click "Exchange authorization code for tokens"
//  11. Copy the "Refresh token" value → paste as GMAIL_REFRESH_TOKEN
// ---------------------------------------------------------------------------

const MAX_RETRIES    = 2;
const RETRY_BASE_MS  = 1_000;

/** @type {import('nodemailer').Transporter | null} */
let _transporter = null;

// ---------------------------------------------------------------------------
// Startup credential warnings
// ---------------------------------------------------------------------------
const REQUIRED_VARS = ['EMAIL_USER', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'];
const MISSING = REQUIRED_VARS.filter(v => !process.env[v]);

if (MISSING.length > 0) {
  console.warn(
    `[Email] ⚠  WARNING: Missing environment variable(s): ${MISSING.join(', ')}.\n` +
    `         Outbound emails will fail. See the OAuth2 setup guide in .env.example.`
  );
}

// ---------------------------------------------------------------------------
// buildTransporter — create a fresh OAuth2 transporter
// ---------------------------------------------------------------------------
function buildTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      // Nodemailer fetches & auto-refreshes the access token using the
      // refresh token — no manual token management needed.
    },
  });
}

// ---------------------------------------------------------------------------
// getTransporter — lazy singleton
// ---------------------------------------------------------------------------
function getTransporter() {
  if (!_transporter) {
    _transporter = buildTransporter();
  }
  return _transporter;
}

// ---------------------------------------------------------------------------
// verifyTransporter
// Call once at startup to surface credential issues early.
// Non-blocking — logs result, never throws.
// ---------------------------------------------------------------------------
async function verifyTransporter() {
  if (MISSING.length > 0) {
    console.error(`[Email] ❌ Cannot verify — missing: ${MISSING.join(', ')}.`);
    return false;
  }

  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('[Email] ✅ Gmail OAuth2 transporter verified — ready to send emails.');
    return true;
  } catch (err) {
    console.error('[Email] ❌ Gmail OAuth2 verification FAILED:', err.message);
    _transporter = null; // reset so next real send rebuilds
    return false;
  }
}

// ---------------------------------------------------------------------------
// sleep helper
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// isTransientError — whether a failed send should be retried
// ---------------------------------------------------------------------------
function isTransientError(err) {
  // Do NOT retry on permanent auth or recipient errors
  if (err.code === 'EAUTH') return false;
  const code = err.responseCode;
  if (code === 535 || code === 550 || code === 551 || code === 553 || code === 554) return false;

  // Retry on network timeouts, rate-limits (429), 5xx
  return (
    err.code === 'ECONNRESET'   ||
    err.code === 'ETIMEDOUT'    ||
    err.code === 'ESOCKET'      ||
    err.code === 'ECONNREFUSED' ||
    (code !== undefined && code >= 400)
  );
}

// ---------------------------------------------------------------------------
// sendEmail — central dispatcher with retry & structured logging
//
// @param {{ to: string, subject: string, html: string, from?: string }} opts
// @returns {Promise<object>} Nodemailer send result
// ---------------------------------------------------------------------------
async function sendEmail({ to, subject, html, from }) {
  if (MISSING.length > 0) {
    throw new Error(
      `Cannot send email — missing env vars: ${MISSING.join(', ')}. ` +
      `Follow the OAuth2 setup guide in .env.example.`
    );
  }

  const sender  = from || `"ThreadHaus" <${process.env.EMAIL_USER}>`;
  const started = Date.now();
  let lastErr   = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1); // 1s → 2s
        console.log(`[Email] Retry ${attempt}/${MAX_RETRIES} for <${to}> in ${delay}ms...`);
        await sleep(delay);
        _transporter = null; // rebuild transporter on each retry
      }

      const transporter = getTransporter();
      const info = await transporter.sendMail({ from: sender, to, subject, html });

      console.log(
        `[Email] ✅ Sent to <${to}> in ${Date.now() - started}ms | ` +
        `messageId=${info.messageId} | subject="${subject}"`
      );
      return info;

    } catch (err) {
      lastErr = err;
      console.error(
        `[Email] ❌ Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for <${to}> ` +
        `after ${Date.now() - started}ms | code=${err.code ?? 'N/A'} | ` +
        `responseCode=${err.responseCode ?? 'N/A'} | ${err.message}`
      );

      if (!isTransientError(err)) {
        console.error('[Email] Permanent error — skipping retries.');
        break;
      }
    }
  }

  throw new Error(
    `Email delivery failed to <${to}> after ${MAX_RETRIES + 1} attempt(s): ${lastErr?.message}`
  );
}

// ---------------------------------------------------------------------------
// sendVerificationEmail
// ---------------------------------------------------------------------------
async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Verify Your Email Address – ThreadHaus',
    html: `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:30px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;">
        <h2 style="color:#1a202c;font-size:24px;margin-bottom:20px;font-weight:600;">Welcome to our community, ${name}!</h2>
        <p style="font-size:16px;color:#4a5568;line-height:1.6;margin-bottom:24px;">
          Thank you for signing up. Click the button below to verify your email and activate your account:
        </p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${verifyUrl}"
             style="background-color:#3182ce;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:500;font-size:16px;display:inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="font-size:14px;color:#718096;margin-bottom:8px;">Or copy and paste this URL into your browser:</p>
        <p style="font-size:14px;color:#3182ce;word-break:break-all;margin-bottom:24px;">${verifyUrl}</p>
        <p style="font-size:14px;color:#718096;margin-bottom:24px;">This link expires in <strong>24 hours</strong>.</p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="font-size:12px;color:#a0aec0;">If you did not create a ThreadHaus account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// sendResetPasswordEmail
// ---------------------------------------------------------------------------
async function sendResetPasswordEmail(email, name, token) {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

  await sendEmail({
    to: email,
    subject: 'Reset Your Password – ThreadHaus',
    html: `
      <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:30px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;">
        <h2 style="color:#1a202c;font-size:24px;margin-bottom:20px;font-weight:600;">Reset Your Password</h2>
        <p style="font-size:16px;color:#4a5568;line-height:1.6;margin-bottom:24px;">
          Hello <strong>${name}</strong>, we received a request to reset your ThreadHaus account password.
        </p>
        <p style="font-size:16px;color:#4a5568;line-height:1.6;margin-bottom:24px;">
          Click the button below. This link expires in <strong>1 hour</strong>:
        </p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${resetUrl}"
             style="background-color:#e53e3e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:500;font-size:16px;display:inline-block;">
            Reset Password
          </a>
        </div>
        <p style="font-size:14px;color:#718096;margin-bottom:8px;">Or copy and paste this URL into your browser:</p>
        <p style="font-size:14px;color:#3182ce;word-break:break-all;margin-bottom:24px;">${resetUrl}</p>
        <p style="font-size:14px;color:#4a5568;margin-bottom:24px;">
          If you did not request a password reset, you can safely ignore this email — your password will not change.
        </p>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="font-size:12px;color:#a0aec0;">Please do not reply to this email.</p>
      </div>
    `,
  });
}

// Alias so callers using either naming convention work without changes
const sendPasswordResetEmail = sendResetPasswordEmail;

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendPasswordResetEmail,
  verifyTransporter,
};
