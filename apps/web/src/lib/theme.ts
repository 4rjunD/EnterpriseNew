// NexFlow Design System Theme Configuration

export const colors = {
  background: {
    DEFAULT: '#000000',
    card: '#0a0a0a',
    secondary: '#111111',
    tertiary: '#1a1a1a',
  },
  foreground: {
    DEFAULT: '#ededed',
    secondary: '#888888',
    tertiary: '#555555',
    muted: '#666666',
  },
  border: {
    DEFAULT: '#1a1a1a',
    hover: '#252525',
  },
  status: {
    critical: '#ff4444',
    criticalMuted: '#441111',
    warning: '#f5a623',
    warningMuted: '#3d2e0a',
    success: '#50e3c2',
    successMuted: '#0d3d2e',
    info: '#0070f3',
    infoMuted: '#001a3d',
  },
  purple: {
    DEFAULT: '#a78bfa',
    muted: '#1a1030',
  },
  nf: {
    DEFAULT: '#d4a574',
    muted: '#2a1f14',
  },
  accent: {
    DEFAULT: '#ffffff',
    hover: '#d9d9d9',
  },
} as const

// Team Type Definitions
export type TeamType = 'launch' | 'product' | 'agency' | 'engineering'

export interface TeamTypeConfig {
  id: TeamType
  name: string
  icon: string
  color: string
  colorClass: string
  subtitle: string
  examples: string
  primaryMetric: string
  primaryMetricLabel: string
  primaryMetricUnit: string
  tabs: string[]
  predictionTypes: string[]
  actionVerbs: string[]
  nexflowFocus: string
  // Team-type specific content
  samplePredictions: string[]
  sampleActions: Array<{ type: string; title: string; subtitle: string }>
  sampleMilestones: Array<{ name: string; dueInDays: number; progress: number }>
  sampleRisks: Array<{ title: string; severity: 'critical' | 'warning' | 'info' }>
}

export const TEAM_TYPES: Record<TeamType, TeamTypeConfig> = {
  launch: {
    id: 'launch',
    name: 'Pre-launch startup',
    icon: '◎',
    color: colors.status.critical,
    colorClass: 'text-status-critical',
    subtitle: 'Shipping a product to a hard deadline',
    examples: 'Launching MVP, shipping v1.0, hitting a demo day deadline',
    primaryMetric: 'launch_probability',
    primaryMetricLabel: 'Launch Probability',
    primaryMetricUnit: '%',
    tabs: ['Today', 'Predictions', 'Team', 'Milestones', 'Integrations', 'Risks'],
    predictionTypes: ['Deadline slips', 'Scope risks', 'Bottleneck detection', 'Velocity forecasts'],
    actionVerbs: ['Ship', 'Cut', 'Unblock', 'Decide', 'Review'],
    nexflowFocus: 'NexFlow watches your codebase, project tracker, and comms to predict whether you\'ll ship on time. Every morning, it tells each person exactly what to do — ranked by impact on your ship date.',
    samplePredictions: [
      'Launch will slip to March 4 without scope reduction',
      'Cut analytics from v1.0 to save 4 days',
      'Auth flow blocking 3 other features',
      'Current velocity: 78% of target needed for launch',
      'Payment integration is 2 days behind estimate',
    ],
    sampleActions: [
      { type: 'review', title: 'Review PR #142: Auth flow refactor', subtitle: 'Blocking 3 other PRs' },
      { type: 'decision', title: 'Decide: Keep or cut offline mode for MVP', subtitle: '12 tasks blocked on this decision' },
      { type: 'code', title: 'Fix payment webhook timeout', subtitle: 'Assigned to you, due today' },
      { type: 'scope', title: 'Re-estimate onboarding flow', subtitle: 'Original estimate: 3 days, already 5 days in' },
    ],
    sampleMilestones: [
      { name: 'Core auth complete', dueInDays: 3, progress: 85 },
      { name: 'Payment integration', dueInDays: 7, progress: 45 },
      { name: 'Beta launch', dueInDays: 14, progress: 62 },
      { name: 'Public launch', dueInDays: 30, progress: 35 },
    ],
    sampleRisks: [
      { title: 'Payment provider approval pending', severity: 'critical' },
      { title: 'No fallback if Stripe fails', severity: 'warning' },
      { title: 'Mobile responsive not tested', severity: 'info' },
    ],
  },
  product: {
    id: 'product',
    name: 'Product / engineering team',
    icon: '◧',
    color: colors.status.info,
    colorClass: 'text-status-info',
    subtitle: 'Continuous sprints, shipping features',
    examples: '2-week sprints, feature teams, roadmap execution',
    primaryMetric: 'sprint_health',
    primaryMetricLabel: 'Sprint Health',
    primaryMetricUnit: '%',
    tabs: ['Today', 'Predictions', 'Team', 'Sprint', 'Integrations', 'Quality'],
    predictionTypes: ['Sprint completion forecasts', 'Carryover risk', 'Scope creep detection', 'Load balancing'],
    actionVerbs: ['Review', 'Unblock', 'Estimate', 'Ship', 'Escalate'],
    nexflowFocus: 'NexFlow analyzes your sprint data, PR patterns, and team velocity to predict which tickets will carry over, who\'s overloaded, and where quality is slipping.',
    samplePredictions: [
      '3 tickets will carry over to next sprint',
      'Sprint velocity dropping 15% vs last 3 sprints',
      'Sarah is 140% allocated this sprint',
      'Feature flag debt increasing: 12 stale flags',
      'Test coverage dropped 3% this week',
    ],
    sampleActions: [
      { type: 'review', title: 'Review PR #89: User settings redesign', subtitle: 'Open 2 days, needs approval' },
      { type: 'planning', title: 'Re-estimate PROJ-234', subtitle: 'Scope increased, estimate unchanged' },
      { type: 'code', title: 'Unblock Mike on API refactor', subtitle: 'Waiting on your input' },
      { type: 'decision', title: 'Escalate: Dependencies unclear', subtitle: 'Sprint goal at risk' },
    ],
    sampleMilestones: [
      { name: 'Sprint 4 goal', dueInDays: 5, progress: 68 },
      { name: 'Q1 roadmap item: Search', dueInDays: 21, progress: 40 },
      { name: 'Performance milestone', dueInDays: 14, progress: 55 },
    ],
    sampleRisks: [
      { title: 'Sprint carryover likely (3 tickets)', severity: 'warning' },
      { title: 'Tech debt sprint promised, not scheduled', severity: 'info' },
      { title: 'QA bottleneck: 8 tickets awaiting review', severity: 'warning' },
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency / consultancy',
    icon: '◆',
    color: colors.purple.DEFAULT,
    colorClass: 'text-purple',
    subtitle: 'Multiple client projects, team utilization',
    examples: 'Client deliverables, project timelines, resource allocation',
    primaryMetric: 'utilization_rate',
    primaryMetricLabel: 'Utilization',
    primaryMetricUnit: '%',
    tabs: ['Today', 'Predictions', 'Team', 'Projects', 'Integrations', 'Clients'],
    predictionTypes: ['Deadline risk per project', 'Utilization forecasts', 'Scope creep alerts', 'Satisfaction signals'],
    actionVerbs: ['Deliver', 'Escalate', 'Reassign', 'Scope', 'Invoice'],
    nexflowFocus: 'NexFlow monitors project timelines, team hours, and client comms to predict which deliverables are at risk, who\'s under- or over-utilized, and where scope is creeping.',
    samplePredictions: [
      'Acme project 4 days behind, reassign Sarah',
      'Scope creep: 3 unplanned features on RetailCo',
      'Mike at 45% utilization, available for reassignment',
      'StartupX satisfaction signals declining',
      'Invoice delay: NewCo 15 days overdue',
    ],
    sampleActions: [
      { type: 'scope', title: 'Scope change request: Acme Corp', subtitle: '+2 features, timeline impact' },
      { type: 'decision', title: 'Reassign Sarah to StartupX', subtitle: 'Current project ahead of schedule' },
      { type: 'review', title: 'Review deliverable: RetailCo Phase 2', subtitle: 'Client review tomorrow' },
      { type: 'planning', title: 'Invoice NewCo for December', subtitle: '15 days overdue' },
    ],
    sampleMilestones: [
      { name: 'Acme: Design approval', dueInDays: 2, progress: 90 },
      { name: 'RetailCo: MVP delivery', dueInDays: 10, progress: 65 },
      { name: 'StartupX: Beta launch', dueInDays: 21, progress: 45 },
    ],
    sampleRisks: [
      { title: 'Acme scope creep not approved in contract', severity: 'critical' },
      { title: 'StartupX communication gaps', severity: 'warning' },
      { title: 'Team utilization below 80% target', severity: 'info' },
    ],
  },
  engineering: {
    id: 'engineering',
    name: 'Engineering team',
    icon: '▣',
    color: colors.status.success,
    colorClass: 'text-status-success',
    subtitle: 'Ship quality, reduce cycle time, maintain velocity',
    examples: 'Platform team, infrastructure, dev experience, reliability',
    primaryMetric: 'deploy_frequency',
    primaryMetricLabel: 'Deploys',
    primaryMetricUnit: '/wk',
    tabs: ['Today', 'Predictions', 'Team', 'Velocity', 'Integrations', 'Quality'],
    predictionTypes: ['Deploy risk assessment', 'Quality trend analysis', 'Cycle time forecasts', 'On-call load prediction'],
    actionVerbs: ['Review', 'Deploy', 'Investigate', 'Refactor', 'Optimize'],
    nexflowFocus: 'NexFlow tracks deploy frequency, PR cycle times, test coverage trends, incident rates, and individual velocity to predict quality risks and process bottlenecks.',
    samplePredictions: [
      'Deploy revert rate up 2x this week',
      'PR cycle time 3.2 days (target: <4 hrs)',
      'Test coverage dropped to 72% (target: 80%)',
      'On-call load: Mike has 3x average incidents',
      'Dependency update blocking 4 PRs',
    ],
    sampleActions: [
      { type: 'review', title: 'Review PR #201: Database migration', subtitle: 'High-risk change, needs senior review' },
      { type: 'code', title: 'Investigate: API latency spike', subtitle: 'P95 up 40% since yesterday' },
      { type: 'decision', title: 'Deploy or rollback: Feature flag issue', subtitle: 'Errors in production' },
      { type: 'planning', title: 'Refactor: Auth service debt', subtitle: 'Blocking 2 features' },
    ],
    sampleMilestones: [
      { name: 'Zero-downtime deploys', dueInDays: 14, progress: 70 },
      { name: 'Test coverage to 80%', dueInDays: 21, progress: 60 },
      { name: 'P95 latency under 100ms', dueInDays: 30, progress: 45 },
    ],
    sampleRisks: [
      { title: 'Revert rate indicates quality regression', severity: 'critical' },
      { title: 'PR cycle time exceeding SLA', severity: 'warning' },
      { title: 'On-call burnout risk: uneven distribution', severity: 'warning' },
    ],
  },
}

// Team Size Hints
export function getTeamSizeHint(size: number): string {
  if (size >= 2 && size <= 5) return 'Small team — NexFlow acts as your AI chief of staff'
  if (size >= 6 && size <= 15) return 'Startup-size — perfect for directive daily action queues'
  if (size >= 16 && size <= 50) return 'Growing team — NexFlow surfaces cross-team bottlenecks and load imbalances'
  if (size >= 51 && size <= 150) return 'Mid-size — NexFlow identifies patterns across squads and managers'
  if (size >= 151 && size <= 500) return 'Enterprise — NexFlow provides org-wide visibility with per-team autonomy'
  if (size > 500) return 'Contact us for teams over 500'
  return ''
}

// Role Definitions
export type UserRole = 'cofounder' | 'admin' | 'member'

export interface RoleConfig {
  id: UserRole
  name: string
  color: string
  colorClass: string
  bgClass: string
  description: string
  canInvite: boolean
  canManageRoles: boolean
  canSeeAllPredictions: boolean
  canSeeInsights: boolean
  canSeeTeamTab: boolean
}

export const ROLES: Record<UserRole, RoleConfig> = {
  cofounder: {
    id: 'cofounder',
    name: 'Co-founder',
    color: colors.purple.DEFAULT,
    colorClass: 'text-purple',
    bgClass: 'bg-purple-muted',
    description: 'Full access, insights, role mgmt',
    canInvite: true,
    canManageRoles: true,
    canSeeAllPredictions: true,
    canSeeInsights: true,
    canSeeTeamTab: true,
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    color: colors.status.success,
    colorClass: 'text-status-success',
    bgClass: 'bg-status-success-muted',
    description: 'Team mgmt, all predictions',
    canInvite: true,
    canManageRoles: false,
    canSeeAllPredictions: true,
    canSeeInsights: false,
    canSeeTeamTab: true,
  },
  member: {
    id: 'member',
    name: 'Member',
    color: colors.status.info,
    colorClass: 'text-status-info',
    bgClass: 'bg-status-info-muted',
    description: 'Personal tasks only',
    canInvite: false,
    canManageRoles: false,
    canSeeAllPredictions: false,
    canSeeInsights: false,
    canSeeTeamTab: false,
  },
}

// Get tabs for a specific team type and role combination
export function getTabsForRole(teamType: TeamType, role: UserRole): string[] {
  const baseConfig = TEAM_TYPES[teamType]
  const roleConfig = ROLES[role]

  if (role === 'cofounder') {
    // Cofounder gets all tabs + Insights
    const tabs = [...baseConfig.tabs]
    if (!tabs.includes('Insights')) {
      // Insert Insights after Team
      const teamIndex = tabs.indexOf('Team')
      if (teamIndex !== -1) {
        tabs.splice(teamIndex + 1, 0, 'Insights')
      } else {
        tabs.push('Insights')
      }
    }
    return tabs
  }

  if (role === 'admin') {
    // Admin gets all tabs except Insights
    return baseConfig.tabs.filter(t => t !== 'Insights')
  }

  // Member gets limited tabs
  return ['Today', 'Predictions', 'Milestones', 'Schedule']
}

// Action Types
export const ACTION_TYPES = {
  review: { icon: '◎', label: 'Review' },
  decision: { icon: '◆', label: 'Decision' },
  code: { icon: '◧', label: 'Code' },
  scope: { icon: '◈', label: 'Scope' },
  planning: { icon: '▣', label: 'Planning' },
} as const

// Urgency Levels
export const URGENCY_LEVELS = {
  now: {
    label: 'DO NOW',
    bgClass: 'bg-status-critical',
    textClass: 'text-status-critical',
    animate: true,
  },
  today: {
    label: 'TODAY',
    bgClass: 'bg-status-warning',
    textClass: 'text-status-warning',
    animate: false,
  },
  'this-week': {
    label: 'THIS WEEK',
    bgClass: 'bg-foreground-tertiary',
    textClass: 'text-foreground-tertiary',
    animate: false,
  },
} as const

// Integration Definitions
export interface IntegrationConfig {
  id: string
  name: string
  icon: string
  description: string
  dataTypes: string[]
  syncFrequency: string
}

export const INTEGRATIONS: IntegrationConfig[] = [
  { id: 'github', name: 'GitHub', icon: '⬡', description: 'Commits, PRs, reviews, CI/CD, branch activity', dataTypes: ['commits', 'prs', 'reviews', 'ci'], syncFrequency: '5 min' },
  { id: 'linear', name: 'Linear', icon: '◧', description: 'Issues, sprints, cycles, estimates, completions', dataTypes: ['issues', 'sprints', 'estimates'], syncFrequency: '5 min' },
  { id: 'slack', name: 'Slack', icon: '⌘', description: 'Messages, response times, channel activity', dataTypes: ['messages', 'response_times', 'channels'], syncFrequency: 'Real-time' },
  { id: 'jira', name: 'Jira', icon: '◆', description: 'Tickets, sprints, backlog, estimation accuracy', dataTypes: ['tickets', 'sprints', 'backlog'], syncFrequency: '5 min' },
  { id: 'calendar', name: 'Google Calendar', icon: '◈', description: 'Meetings, focus time, scheduling patterns', dataTypes: ['meetings', 'focus_time', 'scheduling'], syncFrequency: '15 min' },
  { id: 'notion', name: 'Notion', icon: '▣', description: 'Docs, wikis, meeting notes, specs', dataTypes: ['docs', 'wikis', 'notes'], syncFrequency: '15 min' },
  { id: 'discord', name: 'Discord', icon: '◇', description: 'Channels, threads, voice activity', dataTypes: ['channels', 'threads', 'voice'], syncFrequency: '5 min' },
  { id: 'gitlab', name: 'GitLab', icon: '◬', description: 'MRs, pipelines, deployment frequency', dataTypes: ['mrs', 'pipelines', 'deployments'], syncFrequency: '5 min' },
  { id: 'asana', name: 'Asana', icon: '◎', description: 'Tasks, projects, timelines, workload', dataTypes: ['tasks', 'projects', 'timelines'], syncFrequency: '5 min' },
  { id: 'figma', name: 'Figma', icon: '△', description: 'Design files, comments, version history', dataTypes: ['designs', 'comments', 'versions'], syncFrequency: '30 min' },
]

// Prediction Categories
export const PREDICTION_CATEGORIES = {
  deadline: { label: 'Deadline', color: colors.status.critical },
  bottleneck: { label: 'Bottleneck', color: colors.status.warning },
  scope: { label: 'Scope', color: colors.status.info },
  process: { label: 'Process', color: colors.purple.DEFAULT },
  positive: { label: 'Positive', color: colors.status.success },
  pattern: { label: 'Pattern', color: colors.nf.DEFAULT },
  quality: { label: 'Quality', color: colors.status.warning },
} as const

// Severity Levels
export const SEVERITY_LEVELS = {
  critical: { label: 'Critical', color: colors.status.critical, bgClass: 'bg-status-critical-muted', textClass: 'text-status-critical' },
  warning: { label: 'Warning', color: colors.status.warning, bgClass: 'bg-status-warning-muted', textClass: 'text-status-warning' },
  info: { label: 'Info', color: colors.status.info, bgClass: 'bg-status-info-muted', textClass: 'text-status-info' },
  resolved: { label: 'Resolved', color: colors.status.success, bgClass: 'bg-status-success-muted', textClass: 'text-status-success' },
} as const

// Layout constants (Vercel-style)
export const LAYOUT = {
  maxContentWidth: 880,
  pagePadding: 24,
  cardPadding: 16,
  cardPaddingExpanded: 20,
  gapBetweenCards: 16,
  gapBetweenRelatedItems: 8,
  gapGridItems: 1,
} as const

// Typography scale (strict)
export const TYPOGRAPHY = {
  pageTitle: { size: 20, weight: 600, letterSpacing: -0.5 },
  cardTitle: { size: 15, weight: 500 },
  body: { size: 13, weight: 400, lineHeight: 1.5 },
  label: { size: 10, weight: 500, letterSpacing: 0.5, transform: 'uppercase' },
  dataSmall: { size: 16, weight: 600, mono: true },
  dataLarge: { size: 28, weight: 600, mono: true },
  badge: { size: 11, weight: 500, mono: true },
  metadata: { size: 11, weight: 400, mono: true },
} as const
