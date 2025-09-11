import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

// Global singleton for the transporter
const globalForTransporter = globalThis as unknown as {
  _emailTransporter: Transporter | undefined
  _transporterInitialized: boolean | undefined
}

// Lazy initialization function for the transporter
function getTransporter(): Transporter {
  // Return existing transporter if already initialized
  if (globalForTransporter._emailTransporter) {
    return globalForTransporter._emailTransporter
  }

  // Initialize only once
  if (!globalForTransporter._transporterInitialized) {
    globalForTransporter._transporterInitialized = true
    
    // Check if SMTP credentials are provided, otherwise default to Mailpit
    const hasSmtpCredentials = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS

    // Debug SMTP environment variables (only log once)
    console.log('🔧 SMTP Configuration Debug (Singleton Init):')
    console.log('SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET')
    console.log('SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET')
    console.log('SMTP_USER:', process.env.SMTP_USER || 'NOT SET')
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***HIDDEN***' : 'NOT SET')
    console.log('SMTP_FROM:', process.env.SMTP_FROM || 'NOT SET')
    console.log('Using Mailpit fallback:', !hasSmtpCredentials)

    const smtpConfig = hasSmtpCredentials ? {
      // Production SMTP configuration
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Add timeout and debugging options
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 10000, // 10 seconds
      logger: false, // Set to true for detailed SMTP logs
      debug: false, // Set to true for debug output
    } : {
      // Mailpit configuration for development/testing
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: false,
      auth: undefined,
      // Add timeout and debugging options
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 10000, // 10 seconds
      logger: false, // Set to true for detailed SMTP logs
      debug: false, // Set to true for debug output
    }

    const transporter = nodemailer.createTransport(smtpConfig)

    // Verify SMTP connection on startup (only once)
    transporter.verify((error: any) => {
      if (error) {
        console.error('❌ SMTP connection verification failed:', error)
      } else {
        console.log('✅ SMTP server connection verified successfully (Singleton)')
      }
    })

    // Store in global for reuse
    globalForTransporter._emailTransporter = transporter
  }

  return globalForTransporter._emailTransporter!
}

export async function sendMagicLinkEmail(email: string, url: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@homework-tracker.local',
    to: email,
    subject: 'MetaCTO - Sign in to Homework Tracker',
    html: `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 20px;">
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #ffffff; border-radius: 8px; overflow: hidden;">
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
              <div style="background-color: #1a1a2e; padding: 40px 30px;">
                <h2 style="color: #ffffff; margin-bottom: 20px; font-size: 24px;">Welcome to Your Coding Assignment</h2>
                <p style="color: #f8f9fa; line-height: 1.6; margin-bottom: 30px;">
                  Click the button below to sign in and access your coding assignment platform:
                </p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${url}" style="display: inline-block; padding: 15px 30px; background-color: #F18700; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Sign In to Platform
                  </a>
                </div>

                <div style="background-color: #0f0f23; border: 1px solid #F18700; border-radius: 6px; padding: 20px; margin: 30px 0;">
                  <p style="color: #F18700; margin: 0; font-weight: bold; margin-bottom: 10px;">Important:</p>
                  <ul style="color: #f8f9fa; margin: 0; padding-left: 20px;">
                    <li style="color: #f8f9fa;">This is a timed exercise with a goal of 2 hours completion</li>
                    <li style="color: #f8f9fa;">Make sure you have uninterrupted time available</li>
                    <li style="color: #f8f9fa;">The timer starts when you begin the assignment</li>
                  </ul>
                </div>

                <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                  If you didn't request this email, you can safely ignore it.<br>
                  This link will expire in 24 hours for security purposes.
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #0f0f23; padding: 20px 30px; text-align: center; border-top: 1px solid #16213e;">
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                  © 2025 MetaCTO. All rights reserved.
                </p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    `,
  }

  try {
    const info = await getTransporter().sendMail(mailOptions)
    console.log('✅ Magic link email sent successfully!')
    console.log('Message ID:', info.messageId)
    console.log('Response:', info.response)
    console.log('Sent to:', email)
  } catch (error: any) {
    console.error('❌ Error sending email:', error)
    console.error('Error code:', error.code)
    console.error('SMTP Response:', error.response)
    console.error('Response code:', error.responseCode)
    console.error('Command:', error.command)
    
    // Log additional details for debugging
    if (error.response) {
      console.error('Full SMTP error response:', error.response)
    }
    
    throw error
  }
}

export async function sendApprovalEmail(email: string, candidateName?: string) {
  const meetingLink = 'https://outlook.office.com/bookwithme/user/5f59da77db9549898433113400b1b22c@ninjio.com/meetingtype/GGeR899eXU61X60Vsff5Kw2?anonymous&ep=mlink'
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@homework-tracker.local',
    to: email,
    subject: 'Congratulations! You have been approved for the next step',
    html: `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 20px;">
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #ffffff; border-radius: 8px; overflow: hidden;">
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
              <div style="background-color: #1a1a2e; padding: 40px 30px;">
                <h2 style="color: #ffffff; margin-bottom: 20px; font-size: 24px;">🎉 Congratulations!</h2>
                <p style="color: #f8f9fa; line-height: 1.6; margin-bottom: 30px;">
                  ${candidateName ? `Hi ${candidateName},` : 'Hello,'}<br><br>
                  We're pleased to inform you that your coding assignment has been approved! Your submission demonstrated the skills and approach we're looking for.
                </p>

                <div style="background-color: #0f0f23; border: 1px solid #22c55e; border-radius: 6px; padding: 20px; margin: 30px 0;">
                  <p style="color: #22c55e; margin: 0; font-weight: bold; margin-bottom: 15px;">Next Steps:</p>
                  <p style="color: #f8f9fa; margin: 0; line-height: 1.6;">
                    Please schedule a meeting with our team to discuss your experience and the next steps in our interview process.
                  </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${meetingLink}" style="display: inline-block; padding: 15px 30px; background-color: #F18700; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Schedule Your Meeting
                  </a>
                </div>

                <p style="color: #f8f9fa; line-height: 1.6; margin-bottom: 20px;">
                  We look forward to speaking with you soon and learning more about your experience with the assignment.
                </p>

                <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                  If you have any questions, please don't hesitate to reach out to our team.
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #0f0f23; padding: 20px 30px; text-align: center; border-top: 1px solid #16213e;">
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                  © 2025 MetaCTO. All rights reserved.
                </p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    `,
  }

  try {
    const info = await getTransporter().sendMail(mailOptions)
    console.log('✅ Approval email sent successfully!')
    console.log('Message ID:', info.messageId)
    console.log('Response:', info.response)
    console.log('Sent to:', email)
  } catch (error: any) {
    console.error('❌ Error sending approval email:', error)
    console.error('Error code:', error.code)
    console.error('SMTP Response:', error.response)
    console.error('Response code:', error.responseCode)
    console.error('Command:', error.command)
    
    if (error.response) {
      console.error('Full SMTP error response:', error.response)
    }
    
    throw error
  }
}

export async function sendRejectionEmail(email: string, candidateName?: string) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@homework-tracker.local',
    to: email,
    subject: 'Thank you for your submission',
    html: `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 20px;">
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #ffffff; border-radius: 8px; overflow: hidden;">
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
              <div style="background-color: #1a1a2e; padding: 40px 30px;">
                <h2 style="color: #ffffff; margin-bottom: 20px; font-size: 24px;">Thank You for Your Time</h2>
                <p style="color: #f8f9fa; line-height: 1.6; margin-bottom: 30px;">
                  ${candidateName ? `Hi ${candidateName},` : 'Hello,'}<br><br>
                  Thank you for taking the time to complete our coding assignment. We appreciate the effort you put into your submission and the time you dedicated to this process.
                </p>

                <p style="color: #f8f9fa; line-height: 1.6; margin-bottom: 30px;">
                  After careful review, we have decided to move forward with other candidates whose experience more closely aligns with our current needs. This decision in no way reflects on your skills or potential as a developer.
                </p>

                <div style="background-color: #0f0f23; border: 1px solid #F18700; border-radius: 6px; padding: 20px; margin: 30px 0;">
                  <p style="color: #F18700; margin: 0; font-weight: bold; margin-bottom: 15px;">We encourage you to:</p>
                  <ul style="color: #f8f9fa; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li style="color: #f8f9fa;">Continue developing your skills and working on interesting projects</li>
                    <li style="color: #f8f9fa;">Keep an eye on our future job postings as we are always growing</li>
                    <li style="color: #f8f9fa;">Stay connected with the development community</li>
                  </ul>
                </div>

                <p style="color: #f8f9fa; line-height: 1.6; margin-bottom: 20px;">
                  We wish you the best of luck in your job search and future endeavors. Thank you again for your interest in MetaCTO.
                </p>

                <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                  Best regards,<br>
                  The MetaCTO Team
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #0f0f23; padding: 20px 30px; text-align: center; border-top: 1px solid #16213e;">
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                  © 2025 MetaCTO. All rights reserved.
                </p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    `,
  }

  try {
    const info = await getTransporter().sendMail(mailOptions)
    console.log('✅ Rejection email sent successfully!')
    console.log('Message ID:', info.messageId)
    console.log('Response:', info.response)
    console.log('Sent to:', email)
  } catch (error: any) {
    console.error('❌ Error sending rejection email:', error)
    console.error('Error code:', error.code)
    console.error('SMTP Response:', error.response)
    console.error('Response code:', error.responseCode)
    console.error('Command:', error.command)
    
    if (error.response) {
      console.error('Full SMTP error response:', error.response)
    }
    
    throw error
  }
}