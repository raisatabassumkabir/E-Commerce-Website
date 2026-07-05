// ---------------------------------------------------------------------------
// Gmail API via HTTPS (Bypasses all SMTP port blocks)
//
// WHY this instead of Nodemailer?
//   Nodemailer's OAuth2 STILL uses SMTP (port 465) under the hood. 
//   Render's free tier blocks port 465, causing Nodemailer to hang/timeout.
//   This script uses Google's official REST API via standard HTTPS (port 443),
//   which Render allows perfectly.
//
// Requires: EMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
// ---------------------------------------------------------------------------

const MAX_RETRIES   = 2;
const RETRY_BASE_MS = 1_000;

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
// sleep helper
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Fetch a fresh Access Token using the Refresh Token
// ---------------------------------------------------------------------------
async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${data.error_description || data.error}`);
  }
  
  return data.access_token;
}

// ---------------------------------------------------------------------------
// verifyTransporter (Health Check)
// ---------------------------------------------------------------------------
async function verifyTransporter() {
  if (MISSING.length > 0) {
    console.error(`[Email] ❌ Cannot verify — missing: ${MISSING.join(', ')}.`);
    return false;
  }

  try {
    // Just fetching an access token successfully proves the credentials are valid
    await getAccessToken();
    console.log('[Email] ✅ Gmail API (HTTPS) credentials verified — ready to send emails.');
    return true;
  } catch (err) {
    console.error('[Email] ❌ Gmail API verification FAILED:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// sendEmail — central dispatcher with retry & structured logging
// ---------------------------------------------------------------------------
async function sendEmail({ to, subject, html }) {
  if (MISSING.length > 0) {
    throw new Error(`Cannot send email — missing env vars: ${MISSING.join(', ')}.`);
  }

  const started = Date.now();
  let lastErr   = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1); // 1s → 2s
        console.log(`[Email] Retry ${attempt}/${MAX_RETRIES} for <${to}> in ${delay}ms...`);
        await sleep(delay);
      }

      // 1. Get fresh access token
      const accessToken = await getAccessToken();

      // 2. Construct raw MIME email
      const sender = `"ThreadHaus" <${process.env.EMAIL_USER}>`;
      const rawEmail = `From: ${sender}\r\n` +
                       `To: ${to}\r\n` +
                       `Subject: ${subject}\r\n` +
                       `Content-Type: text/html; charset="UTF-8"\r\n\r\n` +
                       `${html}`;

      // 3. Encode to base64url
      const encodedEmail = Buffer.from(rawEmail)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 4. Send via Gmail REST API (port 443 HTTPS - bypasses Render SMTP block)
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Gmail API request failed');
      }

      console.log(
        `[Email] ✅ Sent to <${to}> in ${Date.now() - started}ms | ` +
        `id=${data.id} | subject="${subject}"`
      );
      return data;

    } catch (err) {
      lastErr = err;
      const isAuthError = err.message.includes('invalid_grant') || err.message.includes('unauthorized_client');
      
      console.error(
        `[Email] ❌ Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for <${to}> ` +
        `after ${Date.now() - started}ms | ${err.message}`
      );

      // Don't retry if credentials are wrong
      if (isAuthError) {
        console.error('[Email] Permanent auth error — skipping retries.');
        break;
      }
    }
  }

  throw new Error(`Email delivery failed to <${to}> after ${MAX_RETRIES + 1} attempt(s): ${lastErr?.message}`);
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
