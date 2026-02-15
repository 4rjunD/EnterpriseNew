import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.EMAIL_FROM || 'NexFlow <notifications@nexflow.dev>'
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

// Password Reset Email
export async function sendPasswordResetEmail(email: string, token: string, userName?: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #ededed; padding: 40px 20px; }
          .container { max-width: 480px; margin: 0 auto; }
          .logo { font-size: 18px; font-weight: 600; margin-bottom: 32px; }
          h1 { font-size: 24px; font-weight: 600; margin-bottom: 16px; }
          p { font-size: 14px; line-height: 1.6; color: #888; margin-bottom: 24px; }
          .button { display: inline-block; background: #ededed; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a1a; font-size: 12px; color: #555; }
          .code { font-family: monospace; background: #1a1a1a; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">NexFlow</div>
          <h1>Reset your password</h1>
          <p>Hi${userName ? ` ${userName}` : ''},</p>
          <p>We received a request to reset your password. Click the button below to choose a new one:</p>
          <p><a href="${resetUrl}" class="button">Reset Password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <div class="footer">
            <p>Can't click the button? Copy this link:<br><span class="code">${resetUrl}</span></p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Reset your NexFlow password',
    html,
  })
}

// Email Verification
export async function sendVerificationEmail(email: string, token: string, userName?: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #ededed; padding: 40px 20px; }
          .container { max-width: 480px; margin: 0 auto; }
          .logo { font-size: 18px; font-weight: 600; margin-bottom: 32px; }
          h1 { font-size: 24px; font-weight: 600; margin-bottom: 16px; }
          p { font-size: 14px; line-height: 1.6; color: #888; margin-bottom: 24px; }
          .button { display: inline-block; background: #ededed; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a1a; font-size: 12px; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">NexFlow</div>
          <h1>Verify your email</h1>
          <p>Hi${userName ? ` ${userName}` : ''},</p>
          <p>Welcome to NexFlow! Please verify your email address to get started:</p>
          <p><a href="${verifyUrl}" class="button">Verify Email</a></p>
          <p>This link expires in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create a NexFlow account, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Verify your NexFlow email',
    html,
  })
}

// Team Invitation Email
export async function sendInvitationEmail(
  email: string,
  token: string,
  inviterName: string,
  orgName: string,
  role: string
) {
  const inviteUrl = `${APP_URL}/invite/${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #ededed; padding: 40px 20px; }
          .container { max-width: 480px; margin: 0 auto; }
          .logo { font-size: 18px; font-weight: 600; margin-bottom: 32px; }
          h1 { font-size: 24px; font-weight: 600; margin-bottom: 16px; }
          p { font-size: 14px; line-height: 1.6; color: #888; margin-bottom: 24px; }
          .button { display: inline-block; background: #ededed; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; }
          .highlight { color: #ededed; font-weight: 500; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a1a; font-size: 12px; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">NexFlow</div>
          <h1>You're invited to join ${orgName}</h1>
          <p><span class="highlight">${inviterName}</span> has invited you to join <span class="highlight">${orgName}</span> on NexFlow as a <span class="highlight">${role}</span>.</p>
          <p>NexFlow is an AI-powered engineering management platform that helps teams ship faster.</p>
          <p><a href="${inviteUrl}" class="button">Accept Invitation</a></p>
          <p>This invitation expires in 7 days.</p>
          <div class="footer">
            <p>If you don't want to join, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to ${orgName} on NexFlow`,
    html,
  })
}

// Account Deletion Confirmation
export async function sendAccountDeletedEmail(email: string, userName?: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #ededed; padding: 40px 20px; }
          .container { max-width: 480px; margin: 0 auto; }
          .logo { font-size: 18px; font-weight: 600; margin-bottom: 32px; }
          h1 { font-size: 24px; font-weight: 600; margin-bottom: 16px; }
          p { font-size: 14px; line-height: 1.6; color: #888; margin-bottom: 24px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a1a; font-size: 12px; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">NexFlow</div>
          <h1>Account deleted</h1>
          <p>Hi${userName ? ` ${userName}` : ''},</p>
          <p>Your NexFlow account has been successfully deleted. All your personal data has been removed from our systems.</p>
          <p>We're sorry to see you go. If you ever want to come back, you're always welcome to create a new account.</p>
          <div class="footer">
            <p>If you didn't request this deletion, please contact support immediately.</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Your NexFlow account has been deleted',
    html,
  })
}
