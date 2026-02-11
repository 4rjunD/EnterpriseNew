import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Skip middleware for public routes and API routes
  const publicRoutes = ['/login', '/signup', '/api/auth', '/api/health', '/api/integrations']
  if (publicRoutes.some((route) => path.startsWith(route)) || path === '/') {
    return NextResponse.next()
  }

  // Get token from request
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Protect dashboard routes
  if (path.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Admin-only routes
    const adminOnlyRoutes = ['/dashboard/settings/organization', '/dashboard/integrations/config']
    if (adminOnlyRoutes.some((route) => path.startsWith(route))) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Manager+ routes
    const managerRoutes = [
      '/dashboard/predictions',
      '/dashboard/insights',
      '/dashboard/bottlenecks',
      '/dashboard/agents',
    ]
    if (managerRoutes.some((route) => path.startsWith(route))) {
      if (token?.role === 'IC') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|fonts|images).*)',
  ],
}
