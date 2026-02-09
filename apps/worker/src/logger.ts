import { env } from './config'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  queue?: string
  jobId?: string
  jobName?: string
  duration?: number
  organizationId?: string
  error?: Error | unknown
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  stack?: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LOG_LEVEL = env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug

function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: env.NODE_ENV === 'development' ? error.stack : undefined,
    }
  }
  return { message: String(error) }
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  if (context) {
    // Extract error separately for special handling
    const { error, ...restContext } = context

    if (Object.keys(restContext).length > 0) {
      entry.context = restContext
    }

    if (error) {
      const { message: errMsg, stack } = formatError(error)
      entry.context = { ...entry.context, error: errMsg }
      if (stack) {
        entry.stack = stack
      }
    }
  }

  return entry
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  if (LOG_LEVELS[level] < MIN_LOG_LEVEL) {
    return
  }

  const entry = createLogEntry(level, message, context)

  if (env.NODE_ENV === 'production') {
    // JSON output for production (easier to parse by log aggregators)
    console.log(JSON.stringify(entry))
  } else {
    // Pretty output for development
    const levelColor = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    }[level]
    const reset = '\x1b[0m'

    let output = `${entry.timestamp} ${levelColor}[${level.toUpperCase()}]${reset} ${message}`

    if (entry.context) {
      output += ` ${JSON.stringify(entry.context)}`
    }

    if (entry.stack) {
      output += `\n${entry.stack}`
    }

    console.log(output)
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),

  // Job-specific logging helpers
  job: {
    start: (queue: string, jobId: string, jobName: string, data?: Record<string, unknown>) => {
      log('info', `Job started: ${jobName}`, { queue, jobId, jobName, ...data })
    },
    completed: (queue: string, jobId: string, jobName: string, duration: number) => {
      log('info', `Job completed: ${jobName}`, { queue, jobId, jobName, duration })
    },
    failed: (queue: string, jobId: string, jobName: string, error: unknown, duration?: number) => {
      log('error', `Job failed: ${jobName}`, { queue, jobId, jobName, error, duration })
    },
    progress: (queue: string, jobId: string, message: string, data?: Record<string, unknown>) => {
      log('debug', `Job progress: ${message}`, { queue, jobId, ...data })
    },
  },

  // Health check logging
  health: {
    checkFailed: (check: string, error: unknown) => {
      log('error', `Health check failed: ${check}`, { check, error })
    },
    checkPassed: (check: string, latencyMs?: number) => {
      log('debug', `Health check passed: ${check}`, { check, latencyMs })
    },
  },

  // Circuit breaker logging
  circuit: {
    opened: (name: string, failureCount: number) => {
      log('warn', `Circuit breaker opened: ${name}`, { circuitBreaker: name, failureCount })
    },
    closed: (name: string) => {
      log('info', `Circuit breaker closed: ${name}`, { circuitBreaker: name })
    },
    halfOpen: (name: string) => {
      log('info', `Circuit breaker half-open: ${name}`, { circuitBreaker: name })
    },
    rejected: (name: string) => {
      log('warn', `Circuit breaker rejected call: ${name}`, { circuitBreaker: name })
    },
  },

  // External API logging
  api: {
    request: (service: string, method: string, path: string) => {
      log('debug', `API request: ${service}`, { service, method, path })
    },
    response: (service: string, statusCode: number, duration: number) => {
      log('debug', `API response: ${service}`, { service, statusCode, duration })
    },
    error: (service: string, error: unknown, duration?: number) => {
      log('error', `API error: ${service}`, { service, error, duration })
    },
  },
}

export type Logger = typeof logger
