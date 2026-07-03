const { Resend } = require('resend');

// Initialize Resend
// Note: In development or when the API key is not fully configured yet,
// we should handle it gracefully so it doesn't crash the server start,
// but throws a helpful warning.
const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey || resendApiKey === 're_1234567890') {
  console.warn('WARNING: RESEND_API_KEY is not configured with a valid key. Outbound emails will fail.');
}

const resend = new Resend(resendApiKey);

/**
 * Resolves the sender address from environment variables.
 * Priority: FROM_EMAIL → EMAIL_FROM → default fallback
 */
const getFromEmail = () =>
  process.env.FROM_EMAIL || process.env.EMAIL_FROM || 'onboarding@resend.dev';

/**
 * Sends a verification email to the user.
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} token - Verification token
 */
const sendVerificationEmail = async (email, name, token) => {
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  const fromEmail = getFromEmail();

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Verify Your Email - ThreadHaus',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #1a202c; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Welcome to our community, ${name}!</h2>
          <p style="font-size: 16px; color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
            Thank you for signing up. Please click the button below to verify your email address and activate your account:
          </p>
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${verifyUrl}" style="background-color: #3182ce; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; display: inline-block; transition: background-color 0.2s;">
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
            If you did not request this email, you can safely ignore it.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend Error] sendVerificationEmail failed:', error);
      throw new Error(error.message || 'Error sending verification email.');
    }

    return data;
  } catch (err) {
    // If the error is already from the check above, re-throw it as-is
    // Otherwise wrap Resend SDK / network errors in a clean message
    console.error('[Resend Error] sendVerificationEmail exception:', err.message);
    throw new Error(
      err.message || 'Failed to send verification email. Please try again later.'
    );
  }
};

/**
 * Sends a password reset email to the user.
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} token - Reset token
 */
const sendResetPasswordEmail = async (email, name, token) => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const fromEmail = getFromEmail();

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset Your Password - ThreadHaus',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #1a202c; font-size: 24px; margin-bottom: 20px; font-weight: 600;">Reset Your Password</h2>
          <p style="font-size: 16px; color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
            Hello ${name}, you are receiving this because you (or someone else) have requested the reset of the password for your account.
          </p>
          <p style="font-size: 16px; color: #4a5568; line-height: 1.6; margin-bottom: 24px;">
            Please click the button below to complete the process. This link is valid for <strong>1 hour</strong>:
          </p>
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${resetUrl}" style="background-color: #e53e3e; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; display: inline-block; transition: background-color 0.2s;">
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
            If you did not request this, please ignore this email and your password will remain unchanged.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #a0aec0; line-height: 1.4;">
            Please do not reply directly to this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend Error] sendResetPasswordEmail failed:', error);
      throw new Error(error.message || 'Error sending password reset email.');
    }

    return data;
  } catch (err) {
    console.error('[Resend Error] sendResetPasswordEmail exception:', err.message);
    throw new Error(
      err.message || 'Failed to send password reset email. Please try again later.'
    );
  }
};

module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
};
