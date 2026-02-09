import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32
const KEY_LENGTH = 32

// Derive a key from the encryption key using scrypt
function deriveKey(encryptionKey: string, salt: Buffer): Buffer {
  return scryptSync(encryptionKey, salt, KEY_LENGTH)
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns format: base64(salt:iv:authTag:ciphertext)
 */
export function encrypt(plaintext: string, encryptionKey: string): string {
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error('Encryption key must be at least 32 characters')
  }

  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(encryptionKey, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Combine all components: salt + iv + authTag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted])

  return combined.toString('base64')
}

/**
 * Decrypt a string encrypted with encrypt()
 */
export function decrypt(encryptedData: string, encryptionKey: string): string {
  if (!encryptionKey || encryptionKey.length < 32) {
    throw new Error('Encryption key must be at least 32 characters')
  }

  const combined = Buffer.from(encryptedData, 'base64')

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  )
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

  const key = deriveKey(encryptionKey, salt)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Check if a value appears to be encrypted (base64 encoded with correct length)
 */
export function isEncrypted(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64')
    // Minimum length: salt (32) + iv (16) + authTag (16) + at least 1 byte ciphertext
    return decoded.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1
  } catch {
    return false
  }
}

/**
 * Token encryption helpers for Integration model
 */
export class TokenEncryption {
  private encryptionKey: string | null

  constructor(encryptionKey?: string) {
    this.encryptionKey = encryptionKey || process.env.TOKEN_ENCRYPTION_KEY || null
  }

  get isEnabled(): boolean {
    return Boolean(this.encryptionKey && this.encryptionKey.length >= 32)
  }

  encryptToken(token: string): string {
    if (!this.isEnabled) {
      console.warn('[TokenEncryption] Encryption disabled - storing token in plaintext')
      return token
    }
    return encrypt(token, this.encryptionKey!)
  }

  decryptToken(encryptedToken: string): string {
    if (!this.isEnabled) {
      return encryptedToken
    }

    // Check if the token is actually encrypted
    if (!isEncrypted(encryptedToken)) {
      // Might be a legacy plaintext token
      console.warn('[TokenEncryption] Token appears unencrypted - returning as-is')
      return encryptedToken
    }

    return decrypt(encryptedToken, this.encryptionKey!)
  }

  /**
   * Encrypt integration tokens for storage
   */
  encryptIntegrationTokens(data: {
    accessToken?: string | null
    refreshToken?: string | null
  }): { accessToken?: string | null; refreshToken?: string | null } {
    return {
      accessToken: data.accessToken ? this.encryptToken(data.accessToken) : null,
      refreshToken: data.refreshToken ? this.encryptToken(data.refreshToken) : null,
    }
  }

  /**
   * Decrypt integration tokens for use
   */
  decryptIntegrationTokens(data: {
    accessToken?: string | null
    refreshToken?: string | null
  }): { accessToken?: string | null; refreshToken?: string | null } {
    return {
      accessToken: data.accessToken ? this.decryptToken(data.accessToken) : null,
      refreshToken: data.refreshToken ? this.decryptToken(data.refreshToken) : null,
    }
  }
}

// Default singleton instance
export const tokenEncryption = new TokenEncryption()
