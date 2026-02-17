import { prisma } from '@nexflow/database'
import Anthropic from '@anthropic-ai/sdk'

interface CompanyContext {
  buildingDescription: string
  goals: string[]
  techStack: string[]
  industry: string | null
  companyStage: string | null
  teamDistribution: string | null
  developmentMethod: string | null
  primaryChallenges: string[]
  riskTolerance: string | null
}

interface GeneratedInsights {
  predictions: Array<{
    type: 'DEADLINE_RISK' | 'BURNOUT_INDICATOR' | 'VELOCITY_FORECAST' | 'SCOPE_CREEP'
    title: string
    description: string
    confidence: number
    reasoning: string
    suggestedAction: string
  }>
  bottlenecks: Array<{
    type: 'STUCK_PR' | 'STALE_TASK' | 'DEPENDENCY_BLOCK' | 'REVIEW_DELAY' | 'CI_FAILURE'
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    title: string
    description: string
    impact: string
  }>
  risks: Array<{
    category: string
    title: string
    description: string
    likelihood: 'LOW' | 'MEDIUM' | 'HIGH'
    impact: 'LOW' | 'MEDIUM' | 'HIGH'
    mitigation: string
  }>
  recommendations: Array<{
    title: string
    description: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    category: string
  }>
}

/**
 * ContextBasedAnalyzer generates AI-powered predictions, risks, and bottlenecks
 * based solely on company context - no repo data required.
 * This ensures new accounts always have actionable insights.
 */
export class ContextBasedAnalyzer {
  private organizationId: string
  private anthropic: Anthropic | null = null

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  private getAnthropicClient(): Anthropic {
    if (!this.anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not set')
      }
      this.anthropic = new Anthropic({ apiKey })
    }
    return this.anthropic
  }

  /**
   * Generate insights based on company context.
   * Returns predictions, bottlenecks, risks, and recommendations.
   */
  async analyze(): Promise<GeneratedInsights> {
    // Get company context
    const context = await prisma.projectContext.findFirst({
      where: { organizationId: this.organizationId },
    })

    if (!context) {
      return this.getBaselineInsights()
    }

    // Get team size for context
    const teamSize = await prisma.user.count({
      where: { organizationId: this.organizationId },
    })

    try {
      return await this.generateAIInsights({
        buildingDescription: context.buildingDescription,
        goals: context.goals,
        techStack: context.techStack,
        industry: context.industry,
        companyStage: context.companyStage,
        teamDistribution: context.teamDistribution,
        developmentMethod: context.developmentMethod,
        primaryChallenges: context.primaryChallenges,
        riskTolerance: context.riskTolerance,
      }, teamSize)
    } catch (error) {
      console.error('AI analysis failed, using baseline:', error)
      return this.getBaselineInsights()
    }
  }

  /**
   * Generate AI-powered insights from company context.
   */
  private async generateAIInsights(context: CompanyContext, teamSize: number): Promise<GeneratedInsights> {
    const client = this.getAnthropicClient()

    const prompt = `You are an engineering management expert analyzing a software team's context to predict risks, bottlenecks, and provide recommendations.

COMPANY CONTEXT:
- What they're building: ${context.buildingDescription}
- Goals: ${context.goals.length > 0 ? context.goals.join(', ') : 'Not specified'}
- Tech Stack: ${context.techStack.length > 0 ? context.techStack.join(', ') : 'Not specified'}
- Industry: ${context.industry || 'Not specified'}
- Company Stage: ${context.companyStage || 'Not specified'}
- Team Distribution: ${context.teamDistribution || 'Not specified'}
- Development Method: ${context.developmentMethod || 'Not specified'}
- Primary Challenges: ${context.primaryChallenges.length > 0 ? context.primaryChallenges.join(', ') : 'Not specified'}
- Risk Tolerance: ${context.riskTolerance || 'Moderate'}
- Team Size: ${teamSize} members

Based on this context, generate actionable insights. Be specific and practical - avoid generic advice.

Respond with a JSON object:
{
  "predictions": [
    {
      "type": "DEADLINE_RISK|BURNOUT_INDICATOR|VELOCITY_FORECAST|SCOPE_CREEP",
      "title": "Short title",
      "description": "Detailed description",
      "confidence": 0.0-1.0,
      "reasoning": "Why this prediction was made",
      "suggestedAction": "What to do about it"
    }
  ],
  "bottlenecks": [
    {
      "type": "STUCK_PR|STALE_TASK|DEPENDENCY_BLOCK|REVIEW_DELAY|CI_FAILURE",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "title": "Short title",
      "description": "What's causing the bottleneck",
      "impact": "How it affects the team"
    }
  ],
  "risks": [
    {
      "category": "Technical|Process|Team|External",
      "title": "Risk title",
      "description": "Risk description",
      "likelihood": "LOW|MEDIUM|HIGH",
      "impact": "LOW|MEDIUM|HIGH",
      "mitigation": "How to mitigate"
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed recommendation",
      "priority": "HIGH|MEDIUM|LOW",
      "category": "process|tooling|team|architecture"
    }
  ]
}

Generate 2-3 predictions, 2-3 potential bottlenecks, 3-4 risks, and 3-5 recommendations.
Make them specific to the context provided - reference the industry, stage, challenges, etc.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    return JSON.parse(jsonMatch[0]) as GeneratedInsights
  }

  /**
   * Get baseline insights when no context or AI fails.
   * These are comprehensive and cover all sections.
   */
  private getBaselineInsights(): GeneratedInsights {
    return {
      predictions: [
        {
          type: 'DEADLINE_RISK',
          title: 'Initial setup period may cause delays',
          description: 'New teams typically take 2-4 weeks to establish effective workflows. Factor this into your timeline.',
          confidence: 0.75,
          reasoning: 'Based on typical onboarding patterns for engineering teams.',
          suggestedAction: 'Add a 2-week buffer to your first major deadline.',
        },
        {
          type: 'VELOCITY_FORECAST',
          title: 'Team velocity will stabilize in 3-4 sprints',
          description: 'Expect velocity fluctuations of 30-50% as the team forms and establishes norms.',
          confidence: 0.8,
          reasoning: 'Teams typically need 3-4 sprints to establish consistent velocity patterns.',
          suggestedAction: 'Track velocity trends rather than individual sprint performance. Set expectations accordingly.',
        },
        {
          type: 'BURNOUT_INDICATOR',
          title: 'Watch for early signs of overcommitment',
          description: 'New teams often overcommit in early sprints leading to sustainable pace issues.',
          confidence: 0.65,
          reasoning: 'Enthusiasm in new teams frequently leads to overestimation of capacity.',
          suggestedAction: 'Target 70% capacity utilization initially, then adjust based on actual throughput.',
        },
        {
          type: 'SCOPE_CREEP',
          title: 'Scope definition needs attention',
          description: 'Without clear project boundaries, features tend to expand beyond initial estimates.',
          confidence: 0.7,
          reasoning: 'Undefined scope is the leading cause of project delays.',
          suggestedAction: 'Document acceptance criteria for each feature before development begins.',
        },
      ],
      bottlenecks: [
        {
          type: 'REVIEW_DELAY',
          severity: 'MEDIUM',
          title: 'Code review process needs definition',
          description: 'Without established review practices, PRs may sit longer than necessary, blocking feature delivery.',
          impact: 'Slower delivery, potential merge conflicts, and developer frustration.',
        },
        {
          type: 'DEPENDENCY_BLOCK',
          severity: 'MEDIUM',
          title: 'Integration connections pending',
          description: 'Connect your development tools (GitHub, Linear, etc.) to enable automated tracking and insights.',
          impact: 'Manual tracking is error-prone and consumes valuable engineering time.',
        },
        {
          type: 'CI_FAILURE',
          severity: 'HIGH',
          title: 'CI/CD pipeline setup required',
          description: 'Without automated testing and deployment, bugs are more likely to reach production.',
          impact: 'Higher bug rate, slower deployments, and increased manual testing burden.',
        },
        {
          type: 'STALE_TASK',
          severity: 'LOW',
          title: 'Task hygiene practices needed',
          description: 'Establish clear practices for updating and closing tasks to prevent backlog buildup.',
          impact: 'Growing backlogs create planning uncertainty and hide important work.',
        },
      ],
      risks: [
        {
          category: 'Process',
          title: 'Undefined development workflows',
          description: 'Without clear processes, work may be duplicated, dropped, or blocked.',
          likelihood: 'HIGH',
          impact: 'MEDIUM',
          mitigation: 'Document key workflows (PR process, deployment, on-call) and review with the team.',
        },
        {
          category: 'Team',
          title: 'Communication gaps between team members',
          description: 'New teams often struggle to establish effective communication patterns.',
          likelihood: 'MEDIUM',
          impact: 'HIGH',
          mitigation: 'Establish regular standups, retrospectives, and async communication norms.',
        },
        {
          category: 'Technical',
          title: 'Technical debt accumulation',
          description: 'Fast-moving teams often accrue technical debt that compounds over time.',
          likelihood: 'HIGH',
          impact: 'MEDIUM',
          mitigation: 'Allocate 20% of sprint capacity for maintenance and debt reduction.',
        },
        {
          category: 'External',
          title: 'Dependency on external services',
          description: 'Third-party service outages or API changes can block development.',
          likelihood: 'LOW',
          impact: 'HIGH',
          mitigation: 'Identify critical dependencies and have fallback plans in place.',
        },
        {
          category: 'Technical',
          title: 'Security vulnerabilities in dependencies',
          description: 'Outdated packages may contain known security vulnerabilities.',
          likelihood: 'MEDIUM',
          impact: 'HIGH',
          mitigation: 'Set up automated dependency scanning and regular update cycles.',
        },
      ],
      recommendations: [
        {
          title: 'Connect your development tools',
          description: 'Link GitHub, Linear, or Jira to enable automated insights and real-time tracking.',
          priority: 'HIGH',
          category: 'tooling',
        },
        {
          title: 'Define clear project milestones',
          description: 'Break your project into measurable milestones to track progress and identify risks early.',
          priority: 'HIGH',
          category: 'process',
        },
        {
          title: 'Set up automated testing',
          description: 'Implement unit and integration tests to catch bugs before they reach production.',
          priority: 'HIGH',
          category: 'tooling',
        },
        {
          title: 'Establish code review guidelines',
          description: 'Define SLAs for PR reviews (e.g., 24-hour turnaround) to maintain velocity.',
          priority: 'MEDIUM',
          category: 'process',
        },
        {
          title: 'Invite your team members',
          description: 'Team insights improve with more participants. NexFlow works best with full team visibility.',
          priority: 'MEDIUM',
          category: 'team',
        },
        {
          title: 'Configure deployment pipeline',
          description: 'Set up CI/CD to automate builds, tests, and deployments for faster iteration.',
          priority: 'MEDIUM',
          category: 'tooling',
        },
      ],
    }
  }

  /**
   * Save generated insights to database.
   */
  async saveInsights(insights: GeneratedInsights): Promise<{
    predictionsCreated: number
    bottlenecksCreated: number
  }> {
    let predictionsCreated = 0
    let bottlenecksCreated = 0

    // Get or create a default project for org-level insights
    let project = await prisma.project.findFirst({
      where: { organizationId: this.organizationId },
    })

    if (!project) {
      const org = await prisma.organization.findUnique({
        where: { id: this.organizationId },
      })
      project = await prisma.project.create({
        data: {
          organizationId: this.organizationId,
          name: 'General',
          key: 'GEN',
          description: 'Default project for organization-wide insights',
        },
      })
    }

    // Save predictions
    for (const pred of insights.predictions) {
      await prisma.prediction.create({
        data: {
          projectId: project.id,
          type: pred.type,
          confidence: pred.confidence,
          reasoning: pred.reasoning,
          value: {
            title: pred.title,
            description: pred.description,
            suggestedAction: pred.suggestedAction,
          },
          isActive: true,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        },
      })
      predictionsCreated++
    }

    // Save bottlenecks
    for (const bn of insights.bottlenecks) {
      await prisma.bottleneck.create({
        data: {
          projectId: project.id,
          type: bn.type,
          severity: bn.severity,
          title: bn.title,
          description: bn.description,
          impact: bn.impact,
          status: 'ACTIVE',
        },
      })
      bottlenecksCreated++
    }

    // Store risks and recommendations in knowledge base
    const kb = await prisma.organizationKnowledgeBase.findUnique({
      where: { organizationId: this.organizationId },
    })

    const kbData = {
      recommendations: insights.recommendations as object,
      goalProgress: {
        risks: insights.risks,
        lastAnalyzedAt: new Date().toISOString(),
      } as object,
    }

    if (kb) {
      await prisma.organizationKnowledgeBase.update({
        where: { organizationId: this.organizationId },
        data: kbData,
      })
    } else {
      await prisma.organizationKnowledgeBase.create({
        data: {
          organizationId: this.organizationId,
          ...kbData,
        },
      })
    }

    return { predictionsCreated, bottlenecksCreated }
  }

  /**
   * Run full analysis and save results.
   */
  async run(): Promise<{
    predictionsCreated: number
    bottlenecksCreated: number
    risksGenerated: number
    recommendationsGenerated: number
  }> {
    const insights = await this.analyze()
    const saved = await this.saveInsights(insights)

    return {
      ...saved,
      risksGenerated: insights.risks.length,
      recommendationsGenerated: insights.recommendations.length,
    }
  }
}
