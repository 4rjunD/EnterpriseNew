import { logger } from './logger'

type CircuitState = 'closed' | 'open' | 'half-open'

interface CircuitBreakerOptions {
  failureThreshold: number
  successThreshold: number
  timeout: number // ms before transitioning from open to half-open
  volumeThreshold?: number // minimum calls before opening circuit
}

interface CircuitStats {
  failures: number
  successes: number
  consecutiveSuccesses: number
  lastFailureTime: number | null
  totalCalls: number
}

export class CircuitBreaker {
  private name: string
  private options: Required<CircuitBreakerOptions>
  private state: CircuitState = 'closed'
  private stats: CircuitStats = {
    failures: 0,
    successes: 0,
    consecutiveSuccesses: 0,
    lastFailureTime: null,
    totalCalls: 0,
  }

  constructor(name: string, options: CircuitBreakerOptions) {
    this.name = name
    this.options = {
      volumeThreshold: 5,
      ...options,
    }
  }

  get currentState(): CircuitState {
    return this.state
  }

  get stats_(): CircuitStats {
    return { ...this.stats }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from open to half-open
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open')
      } else {
        logger.circuit.rejected(this.name)
        throw new CircuitOpenError(this.name)
      }
    }

    this.stats.totalCalls++

    try {
      const result = await fn()
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }

  /**
   * Execute with fallback if circuit is open or call fails
   */
  async executeWithFallback<T>(fn: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
    try {
      return await this.execute(fn)
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        return fallback()
      }
      throw error
    }
  }

  /**
   * Record a successful call
   */
  private recordSuccess(): void {
    this.stats.successes++
    this.stats.consecutiveSuccesses++

    if (this.state === 'half-open') {
      if (this.stats.consecutiveSuccesses >= this.options.successThreshold) {
        this.transitionTo('closed')
      }
    }
  }

  /**
   * Record a failed call
   */
  private recordFailure(): void {
    this.stats.failures++
    this.stats.consecutiveSuccesses = 0
    this.stats.lastFailureTime = Date.now()

    if (this.state === 'half-open') {
      // Any failure in half-open state immediately opens the circuit
      this.transitionTo('open')
    } else if (this.state === 'closed') {
      // Check if we should open the circuit
      if (this.shouldOpen()) {
        this.transitionTo('open')
      }
    }
  }

  /**
   * Check if circuit should open based on failure rate
   */
  private shouldOpen(): boolean {
    // Need minimum volume before opening
    if (this.stats.totalCalls < this.options.volumeThreshold) {
      return false
    }

    return this.stats.failures >= this.options.failureThreshold
  }

  /**
   * Check if we should attempt to reset (transition to half-open)
   */
  private shouldAttemptReset(): boolean {
    if (!this.stats.lastFailureTime) return true
    return Date.now() - this.stats.lastFailureTime >= this.options.timeout
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state
    this.state = newState

    if (newState === 'closed') {
      // Reset stats when closing
      this.stats = {
        failures: 0,
        successes: 0,
        consecutiveSuccesses: 0,
        lastFailureTime: null,
        totalCalls: 0,
      }
      logger.circuit.closed(this.name)
    } else if (newState === 'open') {
      logger.circuit.opened(this.name, this.stats.failures)
    } else if (newState === 'half-open') {
      this.stats.consecutiveSuccesses = 0
      logger.circuit.halfOpen(this.name)
    }
  }

  /**
   * Manually reset the circuit to closed state
   */
  reset(): void {
    this.transitionTo('closed')
  }

  /**
   * Get health status for monitoring
   */
  getHealth(): {
    name: string
    state: CircuitState
    failures: number
    successes: number
    lastFailure: Date | null
  } {
    return {
      name: this.name,
      state: this.state,
      failures: this.stats.failures,
      successes: this.stats.successes,
      lastFailure: this.stats.lastFailureTime ? new Date(this.stats.lastFailureTime) : null,
    }
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  constructor(circuitName: string) {
    super(`Circuit breaker '${circuitName}' is open`)
    this.name = 'CircuitOpenError'
  }
}

/**
 * Pre-configured circuit breakers for external services
 */
export const circuitBreakers = {
  linear: new CircuitBreaker('linear-api', {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000, // 30 seconds
  }),

  github: new CircuitBreaker('github-api', {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000, // 30 seconds
  }),

  openai: new CircuitBreaker('openai-api', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000, // 60 seconds (AI APIs can be slow to recover)
  }),

  slack: new CircuitBreaker('slack-api', {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000, // 30 seconds
  }),

  twilio: new CircuitBreaker('twilio-api', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
  }),
}

/**
 * Get health status of all circuit breakers
 */
export function getCircuitBreakerHealth() {
  return Object.entries(circuitBreakers).map(([, breaker]) => breaker.getHealth())
}

/**
 * Wrap a function with circuit breaker protection
 */
export function withCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
  breaker: CircuitBreaker,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    return breaker.execute(() => fn(...args))
  }) as T
}
