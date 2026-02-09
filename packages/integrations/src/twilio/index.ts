// @ts-ignore - Twilio types are complex, using loose typing
import Twilio from 'twilio'

interface TwilioConfig {
  accountSid?: string
  authToken?: string
  fromNumber?: string
  verifyServiceSid?: string
}

interface SendSMSResult {
  sid: string
  status: string
}

interface VerificationResult {
  status: 'pending' | 'approved' | 'canceled' | 'failed'
}

export class TwilioClient {
  private client: Twilio.Twilio | null = null
  private fromNumber: string | null = null
  private verifyServiceSid: string | null = null

  constructor(config?: TwilioConfig) {
    const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID
    const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN
    this.fromNumber = config?.fromNumber || process.env.TWILIO_FROM_NUMBER || null
    this.verifyServiceSid = config?.verifyServiceSid || process.env.TWILIO_VERIFY_SERVICE_SID || null

    if (accountSid && authToken) {
      this.client = Twilio(accountSid, authToken)
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.client && this.fromNumber)
  }

  get isVerifyConfigured(): boolean {
    return Boolean(this.client && this.verifyServiceSid)
  }

  /**
   * Send a raw SMS message
   */
  async sendSMS(to: string, body: string): Promise<SendSMSResult> {
    if (!this.client || !this.fromNumber) {
      throw new Error('Twilio not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER')
    }

    const message = await this.client.messages.create({
      body,
      from: this.fromNumber,
      to: this.normalizePhoneNumber(to),
    })

    return {
      sid: message.sid,
      status: message.status,
    }
  }

  /**
   * Send a nudge notification via SMS
   */
  async sendNudge(
    to: string,
    type: 'task' | 'pr',
    title: string,
    url: string
  ): Promise<SendSMSResult> {
    const body =
      type === 'task'
        ? `[NexFlow] Task needs attention: "${this.truncate(title, 50)}". View: ${url}`
        : `[NexFlow] PR needs review: "${this.truncate(title, 50)}". View: ${url}`

    return this.sendSMS(to, body)
  }

  /**
   * Send a task reassignment notification via SMS
   */
  async sendReassignment(
    to: string,
    taskTitle: string,
    url: string,
    fromUser?: string
  ): Promise<SendSMSResult> {
    const body = fromUser
      ? `[NexFlow] Task reassigned to you from ${fromUser}: "${this.truncate(taskTitle, 40)}". View: ${url}`
      : `[NexFlow] Task assigned to you: "${this.truncate(taskTitle, 50)}". View: ${url}`

    return this.sendSMS(to, body)
  }

  /**
   * Send a critical alert via SMS
   */
  async sendCriticalAlert(
    to: string,
    title: string,
    message: string,
    url?: string
  ): Promise<SendSMSResult> {
    let body = `[NexFlow CRITICAL] ${title}: ${this.truncate(message, 100)}`
    if (url) {
      body += ` View: ${url}`
    }

    return this.sendSMS(to, body)
  }

  /**
   * Send a verification code to verify phone number ownership
   */
  async sendVerificationCode(phoneNumber: string): Promise<VerificationResult> {
    if (!this.client || !this.verifyServiceSid) {
      throw new Error('Twilio Verify not configured. Missing TWILIO_VERIFY_SERVICE_SID')
    }

    const verification = await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verifications.create({
        to: this.normalizePhoneNumber(phoneNumber),
        channel: 'sms',
      })

    return {
      status: verification.status as VerificationResult['status'],
    }
  }

  /**
   * Verify a code submitted by the user
   */
  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    if (!this.client || !this.verifyServiceSid) {
      throw new Error('Twilio Verify not configured. Missing TWILIO_VERIFY_SERVICE_SID')
    }

    try {
      const check = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: this.normalizePhoneNumber(phoneNumber),
          code,
        })

      return check.status === 'approved'
    } catch (error) {
      // Verification check failed (e.g., code expired or invalid)
      console.error('Twilio verification check failed:', error)
      return false
    }
  }

  /**
   * Get account balance (for monitoring)
   */
  async getBalance(): Promise<{ balance: string; currency: string } | null> {
    if (!this.client) {
      return null
    }

    try {
      const balance = await this.client.balance.fetch()
      return {
        balance: balance.balance,
        currency: balance.currency,
      }
    } catch {
      return null
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '')

    // If no + prefix, assume US number and add +1
    if (!normalized.startsWith('+')) {
      normalized = `+1${normalized}`
    }

    return normalized
  }

  /**
   * Truncate text to max length with ellipsis
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }
    return text.slice(0, maxLength - 3) + '...'
  }
}

// Export a singleton for easy use
let twilioClient: TwilioClient | null = null

export function getTwilioClient(): TwilioClient {
  if (!twilioClient) {
    twilioClient = new TwilioClient()
  }
  return twilioClient
}
