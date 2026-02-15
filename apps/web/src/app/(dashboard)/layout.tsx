import { TopNav } from '@/components/layout/top-nav'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@nexflow/database'
import { AgentProvider } from '@/components/agent/agent-provider'

// Feature flag for new UI
const USE_NEW_UI = process.env.NEXT_PUBLIC_USE_NEW_UI === 'true'

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
