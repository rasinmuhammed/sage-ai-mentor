'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import Dashboard from '@/components/features/dashboard/Dashboard'
import Onboarding from '../components/features/onboarding/Onboarding'
import LandingPage from '../components/features/onboarding/LandingPage'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { isSignedIn, isLoaded, user } = useUser()
  const [githubUsername, setGithubUsername] = useState<string | null>(null)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Check if user has completed onboarding
      const username = user.unsafeMetadata?.githubUsername as string
      if (username) {
        setGithubUsername(username)
        setIsOnboarded(true)
      }
      setCheckingOnboarding(false)
    } else if (isLoaded) {
      setCheckingOnboarding(false)
    }
  }, [isLoaded, isSignedIn, user])

  const handleOnboardingComplete = async (username: string) => {
    // Save GitHub username to Clerk user metadata
    await user?.update({
      unsafeMetadata: {
        ...user.unsafeMetadata,
        githubUsername: username
      }
    })

    setGithubUsername(username)
    setIsOnboarded(true)
  }

  // Show loading state while checking authentication
  if (!isLoaded || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show landing page if not signed in
  if (!isSignedIn) {
    return <LandingPage />
  }

  // Show onboarding if signed in but not onboarded
  if (!isOnboarded) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Onboarding onComplete={handleOnboardingComplete} />
      </main>
    )
  }

  // Show dashboard if fully onboarded
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Dashboard githubUsername={githubUsername!} />
    </main>
  )
}