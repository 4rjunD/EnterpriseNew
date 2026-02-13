'use client'

import { Suspense } from 'react'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'

function OnboardingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-lg p-8">
        <div className="h-8 w-48 bg-background-secondary rounded animate-pulse mb-4" />
        <div className="h-4 w-72 bg-background-secondary rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-background-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingFlow />
    </Suspense>
  )
}
