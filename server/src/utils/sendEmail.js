import nodemailer from 'nodemailer';

/**
 * Send an email using the configured SMTP transport.
 * In development, if email credentials are not set, logs the email
 * to the console instead of throwing an error.
 *
 * @param {{ to: string, subject: string, text?: string, html?: string }} options
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, NODE_ENV } = process.env;

  // In non-production environments, fall back to console logging when
  // credentials are not configured — never throw.
  if (NODE_ENV !== 'production' && (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS)) {
    console.warn('[sendEmail] Email credentials not set — logging email instead of sending.');
    console.log('------- EMAIL -------');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    if (text) console.log(`Text:\n${text}`);
    if (html) console.log(`HTML:\n${html}`);
    console.log('---------------------');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT || '587', 10),
    secure: parseInt(EMAIL_PORT || '587', 10) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"PROWASH" <${EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

export default sendEmail;
