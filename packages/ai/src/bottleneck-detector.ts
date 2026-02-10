import { prisma, BottleneckType, BottleneckSeverity, BottleneckStatus, TaskStatus, PRStatus, CIStatus } from '@nexflow/database'
import { BOTTLENECK_THRESHOLDS } from '@nexflow/config'

export class BottleneckDetector {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  async runDetection(): Promise<void> {
    await Promise.all([
      this.detectStuckPRs(),
      this.detectStaleTasks(),
      this.detectDependencyBlocks(),
    ])
  }

  private async detectStuckPRs(): Promise<void> {
    const { daysWithoutActivity, unresolvedCommentsThreshold } = BOTTLENECK_THRESHOLDS.stuckPR
    const cutoffDate = new Date(Date.now() - daysWithoutActivity * 24 * 60 * 60 * 1000)

    const prs = await prisma.pullRequest.findMany({
      where: {
        project: { organizationId: this.organizationId },
        status: PRStatus.OPEN,
        OR: [
          { lastActivityAt: { lt: cutoffDate } },
          { unresolvedComments: { gte: unresolvedCommentsThreshold } },
          { ciStatus: CIStatus.FAILING },
        ],
      },
      include: {
        project: true,
        author: true,
      },
    })

    for (const pr of prs) {
      // Calculate severity
      let severity: BottleneckSeverity = BottleneckSeverity.MEDIUM
      const factors: string[] = []

      if (pr.lastActivityAt && pr.lastActivityAt < cutoffDate) {
        const daysSinceActivity = Math.floor(
          (Date.now() - pr.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        factors.push(`${daysSinceActivity} days without activity`)
        if (daysSinceActivity > daysWithoutActivity * 2) {
          severity = BottleneckSeverity.CRITICAL
        } else if (daysSinceActivity > daysWithoutActivity * 1.5) {
          severity = BottleneckSeverity.HIGH
        }
      }

      if (pr.unresolvedComments >= unresolvedCommentsThreshold) {
        factors.push(`${pr.unresolvedComments} unresolved comments`)
        if (severity !== BottleneckSeverity.CRITICAL) {
          severity = BottleneckSeverity.HIGH
        }
      }

      if (pr.ciStatus === CIStatus.FAILING) {
        factors.push('CI is failing')
        if (severity !== BottleneckSeverity.CRITICAL) {
          severity = BottleneckSeverity.HIGH
        }
      }

      // Mark PR as stuck
      await prisma.pullRequest.update({
        where: { id: pr.id },
        data: {
          isStuck: true,
          stuckAt: pr.stuckAt || new Date(),
        },
      })

      // Create or update bottleneck
      await prisma.bottleneck.upsert({
        where: {
          id: `stuck-pr-${pr.id}`,
        },
        create: {
          id: `stuck-pr-${pr.id}`,
          type: BottleneckType.STUCK_PR,
          severity,
          title: `PR #${pr.number} is stuck`,
          description: factors.join('. '),
          impact: pr.project ? `Blocking progress on ${pr.project.name}` : undefined,
          status: BottleneckStatus.ACTIVE,
          pullRequestId: pr.id,
          projectId: pr.projectId,
        },
        update: {
          severity,
          description: factors.join('. '),
        },
      })
    }

    // Resolve bottlenecks for PRs that are no longer stuck
    await prisma.bottleneck.updateMany({
      where: {
        type: BottleneckType.STUCK_PR,
        status: BottleneckStatus.ACTIVE,
        pullRequest: {
          OR: [
            { status: { not: PRStatus.OPEN } },
            {
              lastActivityAt: { gte: cutoffDate },
              unresolvedComments: { lt: unresolvedCommentsThreshold },
              ciStatus: { not: CIStatus.FAILING },
            },
          ],
        },
      },
      data: {
        status: BottleneckStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    })
  }

  private async detectStaleTasks(): Promise<void> {
    const { daysInProgress } = BOTTLENECK_THRESHOLDS.staleTask
    const cutoffDate = new Date(Date.now() - daysInProgress * 24 * 60 * 60 * 1000)

    const tasks = await prisma.task.findMany({
      where: {
        project: { organizationId: this.organizationId },
        status: TaskStatus.IN_PROGRESS,
        updatedAt: { lt: cutoffDate },
      },
      include: {
        project: true,
        assignee: true,
      },
    })

    for (const task of tasks) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      let severity: BottleneckSeverity = BottleneckSeverity.MEDIUM
      if (daysSinceUpdate > daysInProgress * 3) {
        severity = BottleneckSeverity.CRITICAL
      } else if (daysSinceUpdate > daysInProgress * 2) {
        severity = BottleneckSeverity.HIGH
      }

      // Mark task as stale
      await prisma.task.update({
        where: { id: task.id },
        data: {
          isStale: true,
          staleAt: task.staleAt || new Date(),
        },
      })

      // Create or update bottleneck
      await prisma.bottleneck.upsert({
        where: {
          id: `stale-task-${task.id}`,
        },
        create: {
          id: `stale-task-${task.id}`,
          type: BottleneckType.STALE_TASK,
          severity,
          title: `Task stale for ${daysSinceUpdate} days`,
          description: `"${task.title}" has been in progress without updates`,
          impact: task.blocksIds.length > 0 ? `Blocking ${task.blocksIds.length} other task(s)` : undefined,
          status: BottleneckStatus.ACTIVE,
          taskId: task.id,
          projectId: task.projectId,
        },
        update: {
          severity,
          title: `Task stale for ${daysSinceUpdate} days`,
        },
      })
    }

    // Resolve bottlenecks for tasks that are no longer stale
    await prisma.bottleneck.updateMany({
      where: {
        type: BottleneckType.STALE_TASK,
        status: BottleneckStatus.ACTIVE,
        task: {
          OR: [
            { status: { not: TaskStatus.IN_PROGRESS } },
            { updatedAt: { gte: cutoffDate } },
          ],
        },
      },
      data: {
        status: BottleneckStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    })
  }

  private async detectDependencyBlocks(): Promise<void> {
    const { blockedTasksThreshold } = BOTTLENECK_THRESHOLDS.dependencyBlock

    // Find tasks that are blocking multiple other tasks
    const tasks = await prisma.task.findMany({
      where: {
        project: { organizationId: this.organizationId },
        status: { not: TaskStatus.DONE },
      },
    })

    // Build dependency graph
    const blockingCounts: Record<string, { task: typeof tasks[0]; count: number }> = {}

    for (const task of tasks) {
      for (const blockedById of task.blockedByIds) {
        if (!blockingCounts[blockedById]) {
          const blockingTask = tasks.find((t) => t.id === blockedById)
          if (blockingTask) {
            blockingCounts[blockedById] = { task: blockingTask, count: 0 }
          }
        }
        if (blockingCounts[blockedById]) {
          blockingCounts[blockedById].count++
        }
      }
    }

    // Create bottlenecks for tasks blocking many others
    for (const [taskId, { task, count }] of Object.entries(blockingCounts)) {
      if (count < blockedTasksThreshold) continue

      let severity: BottleneckSeverity = BottleneckSeverity.MEDIUM
      if (count >= blockedTasksThreshold * 3) {
        severity = BottleneckSeverity.CRITICAL
      } else if (count >= blockedTasksThreshold * 2) {
        severity = BottleneckSeverity.HIGH
      }

      await prisma.bottleneck.upsert({
        where: {
          id: `dep-block-${taskId}`,
        },
        create: {
          id: `dep-block-${taskId}`,
          type: BottleneckType.DEPENDENCY_BLOCK,
          severity,
          title: `Task blocking ${count} other tasks`,
          description: `"${task.title}" is a dependency for multiple tasks`,
          impact: `${count} tasks are waiting on this to complete`,
          status: BottleneckStatus.ACTIVE,
          taskId,
          projectId: task.projectId,
        },
        update: {
          severity,
          title: `Task blocking ${count} other tasks`,
        },
      })
    }

    // Resolve dependency blocks that are no longer blocking
    const blockingTaskIds = Object.keys(blockingCounts).filter(
      (id) => blockingCounts[id].count >= blockedTasksThreshold
    )

    await prisma.bottleneck.updateMany({
      where: {
        type: BottleneckType.DEPENDENCY_BLOCK,
        status: BottleneckStatus.ACTIVE,
        taskId: { notIn: blockingTaskIds },
      },
      data: {
        status: BottleneckStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    })
  }
}
