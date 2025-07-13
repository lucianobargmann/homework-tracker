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
    subject: 'MetaCTO - Sign in to Homework Tracker',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%); color: white; border-radius: 8px; overflow: hidden;">
        <!-- Header with MetaCTO branding -->
        <div style="background-color: #16213e; padding: 30px; text-align: center; border-bottom: 2px solid #F18700;">
          <div style="color: #F18700; font-size: 28px; font-weight: bold; margin-bottom: 10px;">
            MetaCTO
          </div>
          <div style="color: #f8f9fa; font-size: 18px;">
            Homework Tracker
          </div>
        </div>

        <!-- Main content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: white; margin-bottom: 20px; font-size: 24px;">Welcome to Your Coding Assignment</h2>
          <p style="color: #f8f9fa; line-height: 1.6; margin-bottom: 30px;">
            Click the button below to sign in and access your coding assignment platform:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${url}" style="display: inline-block; padding: 15px 30px; background-color: #F18700; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; transition: background-color 0.3s;">
              Sign In to Platform
            </a>
          </div>

          <div style="background-color: rgba(241, 135, 0, 0.1); border: 1px solid #F18700; border-radius: 6px; padding: 20px; margin: 30px 0;">
            <p style="color: #F18700; margin: 0; font-weight: bold; margin-bottom: 10px;">Important:</p>
            <ul style="color: #f8f9fa; margin: 0; padding-left: 20px;">
              <li>This is a timed exercise with a goal of 2 hours completion</li>
              <li>Make sure you have uninterrupted time available</li>
              <li>The timer starts when you begin the assignment</li>
            </ul>
          </div>

          <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin-top: 30px;">
            If you didn't request this email, you can safely ignore it.<br>
            This link will expire in 24 hours for security purposes.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #0f0f23; padding: 20px 30px; text-align: center; border-top: 1px solid #16213e;">
          <p style="color: #6c757d; margin: 0; font-size: 12px;">
            © 2025 MetaCTO. All rights reserved.
          </p>
        </div>
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
