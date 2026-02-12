// Memory Manager for AI Agent
// ============================================================================

import { prisma, MemoryType } from '@nexflow/database'
import type { MemoryEntry } from './types'

export class MemoryManager {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  /**
   * Store a memory entry
   */
  async store(
    type: MemoryType,
    key: string,
    content: string,
    options?: { metadata?: Record<string, unknown>; expiresAt?: Date }
  ): Promise<void> {
    await prisma.agentMemory.upsert({
      where: {
        organizationId_type_key: {
          organizationId: this.organizationId,
          type,
          key,
        },
      },
      update: {
        content,
        metadata: (options?.metadata ?? undefined) as object | undefined,
        expiresAt: options?.expiresAt ?? null,
        updatedAt: new Date(),
      },
      create: {
        organizationId: this.organizationId,
        type,
        key,
        content,
        metadata: (options?.metadata ?? undefined) as object | undefined,
        expiresAt: options?.expiresAt ?? null,
      },
    })
  }

  /**
   * Retrieve a memory entry
   */
  async get(type: MemoryType, key: string): Promise<string | null> {
    const entry = await prisma.agentMemory.findUnique({
      where: {
        organizationId_type_key: {
          organizationId: this.organizationId,
          type,
          key,
        },
      },
    })

    if (!entry) return null

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      await this.delete(type, key)
      return null
    }

    return entry.content
  }

  /**
   * Get all memories of a type
   */
  async getAll(type: MemoryType): Promise<MemoryEntry[]> {
    const entries = await prisma.agentMemory.findMany({
      where: {
        organizationId: this.organizationId,
        type,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { updatedAt: 'desc' },
    })

    return entries.map((e) => ({
      key: e.key,
      content: e.content,
      metadata: e.metadata as Record<string, unknown> | undefined,
      expiresAt: e.expiresAt ?? undefined,
    }))
  }

  /**
   * Delete a memory entry
   */
  async delete(type: MemoryType, key: string): Promise<void> {
    await prisma.agentMemory.deleteMany({
      where: {
        organizationId: this.organizationId,
        type,
        key,
      },
    })
  }

  /**
   * Get project context from memory or database
   */
  async getProjectContext(): Promise<string> {
    // First check memory cache
    const cached = await this.get(MemoryType.CONTEXT, 'project-context')
    if (cached) return cached

    // Fetch from database
    const ctx = await prisma.projectContext.findFirst({
      where: { organizationId: this.organizationId },
    })

    if (!ctx) {
      return 'No project context available.'
    }

    const parts: string[] = []
    parts.push(`Building: ${ctx.buildingDescription}`)

    if (ctx.goals && ctx.goals.length > 0) {
      parts.push(`Goals: ${ctx.goals.join(', ')}`)
    }

    if (ctx.milestones) {
      const milestones = ctx.milestones as Array<{ name: string; targetDate: string }>
      if (milestones.length > 0) {
        parts.push(
          `Milestones: ${milestones.map((m) => `${m.name} (${m.targetDate})`).join(', ')}`
        )
      }
    }

    if (ctx.techStack && ctx.techStack.length > 0) {
      parts.push(`Tech Stack: ${ctx.techStack.join(', ')}`)
    }

    const contextString = parts.join('\n')

    // Cache for 5 minutes
    await this.store(MemoryType.CONTEXT, 'project-context', contextString, {
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })

    return contextString
  }

  /**
   * Store a learned pattern
   */
  async learnPattern(key: string, pattern: string, confidence: number): Promise<void> {
    await this.store(MemoryType.LEARNED, key, pattern, {
      metadata: { confidence, learnedAt: new Date().toISOString() },
    })
  }

  /**
   * Get learned patterns
   */
  async getLearnedPatterns(): Promise<Array<{ key: string; pattern: string; confidence: number }>> {
    const entries = await this.getAll(MemoryType.LEARNED)
    return entries.map((e) => ({
      key: e.key,
      pattern: e.content,
      confidence: (e.metadata?.confidence as number) ?? 0.5,
    }))
  }

  /**
   * Record a decision for future reference
   */
  async recordDecision(
    key: string,
    decision: string,
    context: Record<string, unknown>
  ): Promise<void> {
    await this.store(MemoryType.DECISION, key, decision, {
      metadata: { ...context, recordedAt: new Date().toISOString() },
    })
  }

  /**
   * Get recent decisions
   */
  async getRecentDecisions(limit = 10): Promise<Array<{ key: string; decision: string }>> {
    const entries = await prisma.agentMemory.findMany({
      where: {
        organizationId: this.organizationId,
        type: MemoryType.DECISION,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    return entries.map((e) => ({
      key: e.key,
      decision: e.content,
    }))
  }

  /**
   * Clean up expired memories
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.agentMemory.deleteMany({
      where: {
        organizationId: this.organizationId,
        expiresAt: { lt: new Date() },
      },
    })
    return result.count
  }
}
