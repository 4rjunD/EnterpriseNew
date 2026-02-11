import { TopNav } from '@/components/layout/top-nav'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Demo mode - bypass auth for UI development
const DEMO_MODE = false

// Demo user for when no session exists
const demoUser = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@nexflow.dev',
  image: null,
  organizationId: 'demo-org',
  role: 'ADMIN' as const,
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = null

  if (DEMO_MODE) {
    // In demo mode, skip session check entirely (avoids DB connection)
    user = demoUser
  } else {
    const session = await getServerSession(authOptions)
    user = session?.user ?? null
  }

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      <TopNav user={user} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
