import { z } from 'zod'

// Environment variable schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Integrations
  LINEAR_CLIENT_ID: z.string().optional(),
  LINEAR_CLIENT_SECRET: z.string().optional(),
  LINEAR_WEBHOOK_SECRET: z.string().optional(),

  JIRA_CLIENT_ID: z.string().optional(),
  JIRA_CLIENT_SECRET: z.string().optional(),

  NOTION_CLIENT_ID: z.string().optional(),
  NOTION_CLIENT_SECRET: z.string().optional(),

  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),

  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Pusher
  PUSHER_APP_ID: z.string().optional(),
  PUSHER_KEY: z.string().optional(),
  PUSHER_SECRET: z.string().optional(),
  PUSHER_CLUSTER: z.string().optional(),
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format())
    throw new Error('Invalid environment variables')
  }
  return result.data
}

// Constants
export const APP_NAME = 'NexFlow Enterprise'
export const APP_DESCRIPTION = 'Operational intelligence platform for engineering teams'

// Health score weights
export const HEALTH_SCORE_WEIGHTS = {
  prVelocity: 0.25,
  taskCompletion: 0.25,
  blockerImpact: 0.2,
  teamCapacity: 0.15,
  burndownAccuracy: 0.15,
}

// Bottleneck thresholds
export const BOTTLENECK_THRESHOLDS = {
  stuckPR: {
    daysWithoutActivity: 3,
    unresolvedCommentsThreshold: 1,
  },
  staleTask: {
    daysInProgress: 7,
  },
  dependencyBlock: {
    blockedTasksThreshold: 2,
  },
}

// Agent defaults
export const AGENT_DEFAULTS = {
  taskReassigner: {
    overloadThreshold: 5, // tasks per person
    skillMatchWeight: 0.7,
    availabilityWeight: 0.3,
  },
  nudgeSender: {
    reminderIntervalHours: 24,
    maxReminders: 3,
    quietHoursStart: 22,
    quietHoursEnd: 8,
  },
  scopeAdjuster: {
    scopeCreepThreshold: 0.2, // 20% over original estimate
    deferralPriorityThreshold: 'MEDIUM',
  },
}

// Retention policies
export const RETENTION = {
  behavioralMetricsDays: 90,
  notificationsDays: 30,
  predictionsDays: 180,
}
