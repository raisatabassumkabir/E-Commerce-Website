const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Transporter — Gmail SMTP via Nodemailer
// Requires the following environment variables to be set:
//   EMAIL_USER  – your Gmail address  (e.g. yourapp@gmail.com)
//   EMAIL_PASS  – your Gmail App Password (NOT your account password)
//                 Generate one at: https://myaccount.google.com/apppasswords
//
// Port 587 (STARTTLS) is used instead of 465 (SSL) because Render's free
// tier blocks outbound connections on port 465 at the firewall level,
// causing ENETUNREACH / Connection timeout errors. Port 587 is explicitly
// left open by Render for transactional email delivery.
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // false = STARTTLS on port 587 (true would force SSL on 465)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Bypasses strict certificate checks in hosted environments
  },
});


// Warn early at startup so missing config is obvious in logs
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn(
    '[Nodemailer] WARNING: EMAIL_USER or EMAIL_PASS is not set. ' +
    'Outbound emails will fail until these environment variables are configured.'
  );
}

// ---------------------------------------------------------------------------
// sendVerificationEmail
// Sends an account-activation link to the newly registered user.
//
// @param {string} email  – Recipient email address
// @param {string} name   – Recipient display name
// @param {string} token  – Email verification token
// ---------------------------------------------------------------------------
const sendVerificationEmail = async (email, name, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Email Address – ThreadHaus',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #1a202c; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Welcome to our community, ${name}!</h2>
        <p style="font-size: 16px; color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
          Thank you for signing up. Please click the button below to verify your email address and activate your account:
        </p>
        <div style="text-align: center; margin-bottom: 28px;">
          <a href="${verifyUrl}"
             style="background-color: #3182ce; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="font-size: 14px; color: #718096; line-height: 1.5; margin-bottom: 8px;">
          Or copy and paste this URL into your browser:
        </p>
        <p style="font-size: 14px; color: #3182ce; word-break: break-all; margin-bottom: 24px;">
          ${verifyUrl}
        </p>
        <p style="font-size: 14px; color: #718096; line-height: 1.5; margin-bottom: 24px;">
          This verification link will expire in <strong>24 hours</strong>.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #a0aec0; line-height: 1.4;">
          If you did not create an account with ThreadHaus, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Nodemailer] Verification email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[Nodemailer] sendVerificationEmail failed:', err.message);
    throw new Error(
      err.message || 'Failed to send verification email. Please try again later.'
    );
  }
};

// ---------------------------------------------------------------------------
// sendResetPasswordEmail  (also exported as sendPasswordResetEmail)
// Sends a one-time password-reset link to the requesting user.
//
// @param {string} email  – Recipient email address
// @param {string} name   – Recipient display name
// @param {string} token  – Password reset token
// ---------------------------------------------------------------------------
const sendResetPasswordEmail = async (email, name, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Reset Your Password – ThreadHaus',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #1a202c; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Reset Your Password</h2>
        <p style="font-size: 16px; color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
          Hello <strong>${name}</strong>, you are receiving this because you (or someone else) requested a password reset for your ThreadHaus account.
        </p>
        <p style="font-size: 16px; color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
          Please click the button below to complete the process. This link is valid for <strong>1 hour</strong>:
        </p>
        <div style="text-align: center; margin-bottom: 28px;">
          <a href="${resetUrl}"
             style="background-color: #e53e3e; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; color: #718096; line-height: 1.5; margin-bottom: 8px;">
          Or copy and paste this URL into your browser:
        </p>
        <p style="font-size: 14px; color: #3182ce; word-break: break-all; margin-bottom: 24px;">
          ${resetUrl}
        </p>
        <p style="font-size: 14px; color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
          If you did not request a password reset, please ignore this email — your password will remain unchanged.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #a0aec0; line-height: 1.4;">
          Please do not reply directly to this email.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Nodemailer] Password reset email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[Nodemailer] sendResetPasswordEmail failed:', err.message);
    throw new Error(
      err.message || 'Failed to send password reset email. Please try again later.'
    );
  }
};

// Alias so callers using either naming convention work without changes
const sendPasswordResetEmail = sendResetPasswordEmail;

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,   // used by authController.js
  sendPasswordResetEmail,   // alias — matches the requirement spec name
};
