import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL = process.env.EMAIL_FROM || 'NexFlow <noreply@nexflow.dev>'
const APP_URL = process.env.NEXTAUTH_URL || 'https://nexflow-web-rse3.onrender.com'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('Email not configured: RESEND_API_KEY not set')
    return { success: false, error: 'Email not configured' }
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Email send error:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendInvitationEmail(options: {
  to: string
  inviterName: string
  organizationName: string
  inviteToken: string
}): Promise<{ success: boolean; error?: string }> {
  const inviteUrl = `${APP_URL}/invite/${options.inviteToken}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="padding: 40px;">
      <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111;">You're invited to join ${options.organizationName}</h1>

      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #444;">
        ${options.inviterName} has invited you to join their workspace on NexFlow, an AI-powered engineering management platform.
      </p>

      <a href="${inviteUrl}" style="display: inline-block; padding: 14px 28px; background: #111; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px;">
        Accept Invitation
      </a>

      <p style="margin: 32px 0 0; font-size: 14px; color: #666;">
        This invitation expires in 7 days.
      </p>

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;">

      <p style="margin: 0; font-size: 13px; color: #888;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
`

  const text = `
You're invited to join ${options.organizationName}

${options.inviterName} has invited you to join their workspace on NexFlow.

Accept the invitation: ${inviteUrl}

This invitation expires in 7 days.
`

  return sendEmail({
    to: options.to,
    subject: `Join ${options.organizationName} on NexFlow`,
    html,
    text,
  })
}

export async function sendNudgeEmail(options: {
  to: string
  userName: string
  itemType: 'task' | 'pr'
  itemTitle: string
  itemUrl: string
  daysSinceUpdate: number
}): Promise<{ success: boolean; error?: string }> {
  const typeLabel = options.itemType === 'task' ? 'Task' : 'Pull Request'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="padding: 40px;">
      <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111;">Friendly Reminder</h1>

      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #444;">
        Hi ${options.userName},
      </p>

      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #444;">
        This ${typeLabel.toLowerCase()} hasn't been updated in ${options.daysSinceUpdate} days:
      </p>

      <div style="padding: 16px; background: #f9f9f9; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-weight: 500; color: #111;">${options.itemTitle}</p>
      </div>

      <a href="${options.itemUrl}" style="display: inline-block; padding: 14px 28px; background: #111; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px;">
        View ${typeLabel}
      </a>

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;">

      <p style="margin: 0; font-size: 13px; color: #888;">
        This reminder was sent by NexFlow's AI assistant.
      </p>
    </div>
  </div>
</body>
</html>
`

  return sendEmail({
    to: options.to,
    subject: `Reminder: ${typeLabel} needs attention`,
    html,
  })
}
