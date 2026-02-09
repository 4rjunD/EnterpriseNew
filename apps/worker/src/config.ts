import { z } from 'zod'

const workerEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // OpenAI (optional for AI features)
  OPENAI_API_KEY: z.string().optional(),

  // Token encryption key (required for secure token storage)
  TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),

  // Health check server
  HEALTH_CHECK_PORT: z.coerce.number().default(9090),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Worker settings
  WORKER_CONCURRENCY_SYNC: z.coerce.number().default(5),
  WORKER_CONCURRENCY_ANALYSIS: z.coerce.number().default(3),
  WORKER_CONCURRENCY_AGENTS: z.coerce.number().default(2),

  // External integrations (optional)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
})

function validateEnv() {
  const result = workerEnvSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }

  return result.data
}

export const env = validateEnv()

// Type-safe environment access
export type WorkerEnv = z.infer<typeof workerEnvSchema>

// Feature flags based on environment
export const features = {
  smsEnabled: Boolean(
    env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER
  ),
  slackEnabled: Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET),
  tokenEncryptionEnabled: Boolean(env.TOKEN_ENCRYPTION_KEY),
  aiEnabled: Boolean(env.OPENAI_API_KEY),
}

// Log configuration on startup (only in development)
if (env.NODE_ENV === 'development') {
  console.log('Worker configuration loaded:')
  console.log(`  - Redis: ${env.REDIS_URL}`)
  console.log(`  - Health check port: ${env.HEALTH_CHECK_PORT}`)
  console.log(`  - Features: SMS=${features.smsEnabled}, Slack=${features.slackEnabled}, AI=${features.aiEnabled}`)
}
