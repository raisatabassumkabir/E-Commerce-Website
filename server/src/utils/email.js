const nodemailer = require('nodemailer');
const dns = require('dns').promises;

// ---------------------------------------------------------------------------
// Gmail SMTP via Nodemailer — Production-grade
//
// Required environment variables:
//   EMAIL_USER  – Your Gmail address        (e.g. yourapp@gmail.com)
//   EMAIL_PASS  – A Gmail App Password      (NOT your account password)
//                 1. Enable 2-Step Verification on your Google account
//                 2. Visit https://myaccount.google.com/apppasswords
//                 3. Create an app password → copy the 16-char code → paste here
//
// IPv6 Fix (critical on Render / Railway / Fly.io free tiers):
//   Nodemailer resolves hostnames using Node's default resolver which picks
//   IPv6 first. Most cloud free tiers have no IPv6 → ENETUNREACH.
//   Solution: resolve smtp.gmail.com to IPv4 BEFORE creating the transporter,
//   then pass the raw IP as `host` and keep `tls.servername` as the domain
//   so TLS certificate validation still passes.
// ---------------------------------------------------------------------------

const SMTP_DOMAIN      = 'smtp.gmail.com';
const SMTP_PORT        = 587;              // STARTTLS
const CONN_TIMEOUT_MS  = 20_000;
const GREET_TIMEOUT_MS = 20_000;
const SOCK_TIMEOUT_MS  = 45_000;
const MAX_RETRIES      = 2;               // 2 retries → 3 total attempts
const RETRY_BASE_MS    = 1_000;           // exponential back-off base

/** @type {import('nodemailer').Transporter | null} */
let _transporter = null;

/** @type {string | null} Cached IPv4 address for smtp.gmail.com */
let _resolvedIp = null;

// ---------------------------------------------------------------------------
// Startup credential warnings
// ---------------------------------------------------------------------------
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn(
    '[Email] ⚠  WARNING: EMAIL_USER or EMAIL_PASS is not set.\n' +
    '         Outbound emails will fail. Steps to fix:\n' +
    '         1. Enable 2-Step Verification on your Google account.\n' +
    '         2. Go to https://myaccount.google.com/apppasswords\n' +
    '         3. Create an App Password and paste it as EMAIL_PASS.\n' +
    '         4. Set EMAIL_USER to your full Gmail address.'
  );
}

// ---------------------------------------------------------------------------
// resolveSmtpIpv4
// Resolves smtp.gmail.com to its first IPv4 address and caches the result.
// On failure, falls back to the hostname (may still fail on IPv6-only hosts).
// ---------------------------------------------------------------------------
async function resolveSmtpIpv4() {
  if (_resolvedIp) return _resolvedIp;

  try {
    const addresses = await dns.resolve4(SMTP_DOMAIN);
    if (addresses && addresses.length > 0) {
      _resolvedIp = addresses[0];
      console.log(`[Email] DNS resolved ${SMTP_DOMAIN} → ${_resolvedIp} (IPv4 forced)`);
      return _resolvedIp;
    }
  } catch (err) {
    console.warn(
      `[Email] dns.resolve4(${SMTP_DOMAIN}) failed: ${err.message}. ` +
      `Falling back to hostname — may fail on IPv6-only hosts.`
    );
  }

  return SMTP_DOMAIN; // fallback
}

// ---------------------------------------------------------------------------
// buildTransporter — create a fresh Nodemailer transporter
// ---------------------------------------------------------------------------
async function buildTransporter() {
  const host = await resolveSmtpIpv4();

  return nodemailer.createTransport({
    host,                        // IPv4 address (or hostname as fallback)
    port: SMTP_PORT,
    secure: false,               // STARTTLS — do NOT use port 465 on free tiers
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,  // Gmail App Password
    },
    tls: {
      // When host is an IP, Node.js cannot infer the servername for SNI/cert
      // validation — we must set it explicitly so TLS doesn't fail.
      servername: SMTP_DOMAIN,
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
    connectionTimeout: CONN_TIMEOUT_MS,
    greetingTimeout:   GREET_TIMEOUT_MS,
    socketTimeout:     SOCK_TIMEOUT_MS,
    pool: false,      // Pooling not needed for low-volume transactional email
  });
}

// ---------------------------------------------------------------------------
// getTransporter — lazy singleton with auto-reset on retry
// ---------------------------------------------------------------------------
async function getTransporter() {
  if (!_transporter) {
    _transporter = await buildTransporter();
  }
  return _transporter;
}

// ---------------------------------------------------------------------------
// verifyTransporter
// Call once at server startup to catch missing credentials early.
// Non-blocking — logs result and returns boolean; never throws.
// ---------------------------------------------------------------------------
async function verifyTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[Email] ❌ Cannot verify SMTP — EMAIL_USER/EMAIL_PASS missing.');
    return false;
  }

  try {
    const transporter = await getTransporter();
    await transporter.verify();
    console.log('[Email] ✅ SMTP transporter verified — ready to send emails.');
    return true;
  } catch (err) {
    console.error('[Email] ❌ SMTP transporter verification FAILED:', err.message);
    // Reset so the next real send attempt rebuilds from scratch
    _transporter = null;
    _resolvedIp   = null;
    return false;
  }
}

// ---------------------------------------------------------------------------
// sleep helper
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// isTransientError — decides whether a failed send should be retried
// ---------------------------------------------------------------------------
function isTransientError(err) {
  // Permanent: bad credentials, invalid recipient, policy blocks
  const PERMANENT_CODES = [
    535, // Authentication credentials invalid
    550, // Recipient address rejected
    551, // User not local
    553, // Mailbox name not allowed
    554, // Transaction failed (policy)
  ];
  if (PERMANENT_CODES.includes(err.responseCode)) return false;
  if (err.code === 'EAUTH') return false; // Auth failure

  // Retry on: network errors, timeouts, server-side 4xx rate-limits, 5xx
  return (
    err.code === 'ECONNREFUSED'  ||
    err.code === 'ECONNRESET'    ||
    err.code === 'ENETUNREACH'   ||
    err.code === 'ETIMEDOUT'     ||
    err.code === 'ESOCKET'       ||
    (err.responseCode && err.responseCode >= 400)
  );
}

// ---------------------------------------------------------------------------
// sendEmail — central dispatcher with retry & structured logging
//
// @param {{ to: string, subject: string, html: string, from?: string }} opts
// @returns {Promise<object>} Nodemailer send result (contains messageId)
// ---------------------------------------------------------------------------
async function sendEmail({ to, subject, html, from }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      'EMAIL_USER and EMAIL_PASS must be set. ' +
      'Use a Gmail App Password (not your account password). ' +
      'See https://myaccount.google.com/apppasswords'
    );
  }

  const sender  = from || `"ThreadHaus" <${process.env.EMAIL_USER}>`;
  const started = Date.now();
  let lastErr   = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential back-off: 1 s → 2 s
        const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.log(`[Email] Retry ${attempt}/${MAX_RETRIES} for <${to}> in ${delay}ms...`);
        await sleep(delay);

        // Rebuild transporter + re-resolve DNS on every retry
        _transporter = null;
        _resolvedIp  = null;
      }

      const transporter = await getTransporter();
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

  // All attempts exhausted
  throw new Error(
    `Email delivery failed to <${to}> after ${MAX_RETRIES + 1} attempt(s): ` +
    `${lastErr?.message}`
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
        <p style="font-size:14px;color:#718096;line-height:1.5;margin-bottom:8px;">Or copy and paste this URL into your browser:</p>
        <p style="font-size:14px;color:#3182ce;word-break:break-all;margin-bottom:24px;">${verifyUrl}</p>
        <p style="font-size:14px;color:#718096;line-height:1.5;margin-bottom:24px;">
          This link will expire in <strong>24 hours</strong>.
        </p>
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
          Click the button below to set a new password. This link expires in <strong>1 hour</strong>:
        </p>
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${resetUrl}"
             style="background-color:#e53e3e;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:500;font-size:16px;display:inline-block;">
            Reset Password
          </a>
        </div>
        <p style="font-size:14px;color:#718096;line-height:1.5;margin-bottom:8px;">Or copy and paste this URL into your browser:</p>
        <p style="font-size:14px;color:#3182ce;word-break:break-all;margin-bottom:24px;">${resetUrl}</p>
        <p style="font-size:14px;color:#4a5568;line-height:1.6;margin-bottom:24px;">
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
  sendResetPasswordEmail,   // used by authController.js
  sendPasswordResetEmail,   // alias
  verifyTransporter,        // call at startup for health-check
};
