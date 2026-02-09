import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Demo mode - bypass auth for UI development
const DEMO_MODE = true

export default async function HomePage() {
  // In demo mode, skip session check entirely (avoids DB connection)
  if (DEMO_MODE) {
    redirect('/dashboard')
  }

  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/dashboard')
  }

  redirect('/login')
}
