import { TopNav } from '@/components/layout/top-nav'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@nexflow/database'
import { AgentProvider } from '@/components/agent/agent-provider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  return (
    <div className="min-h-screen bg-background-secondary">
      <TopNav user={session.user} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <AgentProvider />
    </div>
  )
}
