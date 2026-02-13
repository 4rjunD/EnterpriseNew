import { TopNav } from '@/components/layout/top-nav'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@nexflow/database'
import { AgentProvider } from '@/components/agent/agent-provider'

// Feature flags
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const USE_NEW_UI = process.env.NEXT_PUBLIC_USE_NEW_UI === 'true'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // In demo mode, skip auth checks
  if (DEMO_MODE) {
    // New UI has its own header, so we just wrap children
    if (USE_NEW_UI) {
      return (
        <div className="min-h-screen bg-black">
          {children}
          <AgentProvider />
        </div>
      )
    }

    const demoUser = {
      id: 'demo-user',
      name: 'Demo User',
      email: 'demo@nexflow.io',
      role: 'ADMIN',
      image: null,
    }

    return (
      <div className="min-h-screen bg-background">
        <TopNav user={demoUser} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    )
  }

  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  // Check if user has completed onboarding
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true },
  })

  if (!user?.onboardingCompleted) {
    redirect('/onboarding')
  }

  // New UI has its own header, so we just wrap children
  if (USE_NEW_UI) {
    return (
      <div className="min-h-screen bg-black">
        {children}
        <AgentProvider />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav user={session.user} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <AgentProvider />
    </div>
  )
}
