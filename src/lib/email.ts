import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
})

export async function sendMagicLinkEmail(email: string, url: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Sign in to Homework Tracker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Sign in to Homework Tracker</h2>
        <p>Click the link below to sign in to your account:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Sign In
        </a>
        <p>If you didn't request this email, you can safely ignore it.</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('Magic link email sent to:', email)
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}
