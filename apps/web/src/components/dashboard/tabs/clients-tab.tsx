'use client'

import { useState } from 'react'
import { cn } from '@nexflow/ui/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/nf/card'
import { Badge } from '@/components/nf/badge'
import { BreathingDot } from '@/components/nf/breathing-dot'
import { Progress } from '@/components/nf/progress'

// Client type
interface Client {
  id: string
  name: string
  logo?: string
  status: 'active' | 'at-risk' | 'completed'
  projectCount: number
  totalBudget: number
  budgetUsed: number
  healthScore: number
  nextDeliverable?: { name: string; dueDate: Date }
  lastActivity: Date
  satisfaction?: number
}

// Mock clients
const mockClients: Client[] = [
  {
    id: '1',
    name: 'TechCorp Inc.',
    status: 'active',
    projectCount: 3,
    totalBudget: 150000,
    budgetUsed: 87000,
    healthScore: 92,
    nextDeliverable: { name: 'Dashboard MVP', dueDate: new Date('2024-03-15') },
    lastActivity: new Date(Date.now() - 2 * 3600000),
    satisfaction: 4.8,
  },
  {
    id: '2',
    name: 'StartupXYZ',
    status: 'at-risk',
    projectCount: 1,
    totalBudget: 45000,
    budgetUsed: 42000,
    healthScore: 58,
    nextDeliverable: { name: 'Mobile App v2', dueDate: new Date('2024-03-08') },
    lastActivity: new Date(Date.now() - 48 * 3600000),
    satisfaction: 3.5,
  },
  {
    id: '3',
    name: 'Enterprise Solutions',
    status: 'active',
    projectCount: 2,
    totalBudget: 280000,
    budgetUsed: 120000,
    healthScore: 85,
    nextDeliverable: { name: 'API Integration', dueDate: new Date('2024-03-22') },
    lastActivity: new Date(Date.now() - 4 * 3600000),
    satisfaction: 4.5,
  },
  {
    id: '4',
    name: 'FinanceApp',
    status: 'completed',
    projectCount: 1,
    totalBudget: 95000,
    budgetUsed: 89000,
    healthScore: 100,
    lastActivity: new Date(Date.now() - 168 * 3600000),
    satisfaction: 5.0,
  },
]

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

// Days until
function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// Client card
function ClientCard({ client }: { client: Client }) {
  const budgetProgress = Math.round((client.budgetUsed / client.totalBudget) * 100)
  const budgetStatus = budgetProgress > 90 ? 'critical' : budgetProgress > 75 ? 'warning' : 'good'

  return (
    <Card
      hover
      glow={client.status === 'at-risk' ? 'warning' : 'none'}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-background-tertiary flex items-center justify-center text-foreground font-medium">
              {client.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">{client.name}</h3>
              <p className="text-xs text-foreground-secondary">{client.projectCount} project{client.projectCount > 1 ? 's' : ''}</p>
            </div>
          </div>
          <Badge
            variant={client.status === 'at-risk' ? 'warning' : client.status === 'completed' ? 'success' : 'info'}
            size="sm"
          >
            {client.status}
          </Badge>
        </div>

        {/* Health score */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-foreground-tertiary">Health Score</span>
          <span className={cn(
            'text-sm font-mono font-medium',
            client.healthScore >= 80 ? 'text-status-success' :
            client.healthScore >= 60 ? 'text-status-warning' :
            'text-status-critical'
          )}>{client.healthScore}%</span>
        </div>

        {/* Budget */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-foreground-secondary">Budget Used</span>
            <span className={cn(
              'font-mono',
              budgetStatus === 'critical' ? 'text-status-critical' :
              budgetStatus === 'warning' ? 'text-status-warning' :
              'text-foreground'
            )}>
              {formatCurrency(client.budgetUsed)} / {formatCurrency(client.totalBudget)}
            </span>
          </div>
          <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                budgetStatus === 'critical' ? 'bg-status-critical' :
                budgetStatus === 'warning' ? 'bg-status-warning' :
                'bg-status-success'
              )}
              style={{ width: `${budgetProgress}%` }}
            />
          </div>
        </div>

        {/* Next deliverable */}
        {client.nextDeliverable && (
          <div className="p-3 bg-background-secondary rounded-md mb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-foreground-tertiary">Next Deliverable</span>
                <p className="text-sm text-foreground">{client.nextDeliverable.name}</p>
              </div>
              <div className="text-right">
                <span className={cn(
                  'text-sm font-mono',
                  daysUntil(client.nextDeliverable.dueDate) <= 3 ? 'text-status-critical' :
                  daysUntil(client.nextDeliverable.dueDate) <= 7 ? 'text-status-warning' :
                  'text-foreground'
                )}>
                  {formatDate(client.nextDeliverable.dueDate)}
                </span>
                <p className="text-xs text-foreground-tertiary">
                  {daysUntil(client.nextDeliverable.dueDate)} days
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Satisfaction */}
        {client.satisfaction && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-tertiary">Satisfaction:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <svg
                  key={star}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  className={star <= Math.floor(client.satisfaction!) ? 'text-status-warning' : 'text-foreground-tertiary'}
                >
                  <path
                    fill="currentColor"
                    d="M6 0L7.8 3.6L12 4.2L9 7.2L9.6 12L6 9.6L2.4 12L3 7.2L0 4.2L4.2 3.6L6 0Z"
                  />
                </svg>
              ))}
            </div>
            <span className="text-xs font-mono text-foreground">{client.satisfaction}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Stats overview
function ClientStats({ clients }: { clients: Client[] }) {
  const active = clients.filter(c => c.status === 'active').length
  const atRisk = clients.filter(c => c.status === 'at-risk').length
  const totalRevenue = clients.reduce((acc, c) => acc + c.budgetUsed, 0)
  const avgSatisfaction = clients
    .filter(c => c.satisfaction)
    .reduce((acc, c, _, arr) => acc + (c.satisfaction || 0) / arr.length, 0)

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">{active}</div>
          <div className="text-xs text-foreground-secondary">Active Clients</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow={atRisk > 0 ? 'warning' : 'none'}>
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-warning">{atRisk}</div>
          <div className="text-xs text-foreground-secondary">At Risk</div>
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-foreground">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-foreground-secondary">Total Revenue</div>
        </CardContent>
      </Card>
      <Card padding="sm" glow="success">
        <CardContent className="p-3">
          <div className="text-2xl font-mono font-medium text-status-success">{avgSatisfaction.toFixed(1)}</div>
          <div className="text-xs text-foreground-secondary">Avg Satisfaction</div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ClientsTab() {
  const [clients] = useState<Client[]>(mockClients)
  const [filter, setFilter] = useState<'all' | 'active' | 'at-risk' | 'completed'>('all')

  // Filter clients
  const filteredClients = filter === 'all'
    ? clients
    : clients.filter(c => c.status === filter)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Clients</h2>
        <p className="text-sm text-foreground-secondary mt-1">
          Client health, budgets, and upcoming deliverables
        </p>
      </div>

      {/* Stats */}
      <ClientStats clients={clients} />

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-lg w-fit">
        {(['all', 'active', 'at-risk', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors capitalize',
              filter === f
                ? 'bg-foreground text-background font-medium'
                : 'text-foreground-secondary hover:text-foreground'
            )}
          >
            {f === 'at-risk' ? 'At Risk' : f}
          </button>
        ))}
      </div>

      {/* Clients grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map(client => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>

      {/* NexFlow insight */}
      {clients.some(c => c.status === 'at-risk') && (
        <div className="p-4 bg-nf-muted border border-nf/20 rounded-lg">
          <div className="flex items-start gap-3">
            <BreathingDot variant="nf" size="md" />
            <div>
              <h4 className="text-sm font-medium text-nf mb-1">Client Health Alert</h4>
              <p className="text-xs text-foreground-secondary leading-relaxed">
                StartupXYZ is at risk due to budget overrun and an upcoming deadline.
                NexFlow recommends scheduling a scope review call and reallocating resources
                from Enterprise Solutions to help meet the Mobile App v2 deadline.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
