'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Github, Loader2, CheckCircle, AlertCircle, ExternalLink, ArrowRight, Brain } from 'lucide-react'
import OnboardingWalkthrough from './OnboardingWalkthrough'
import InteractiveTutorial from './InteractiveTutorial'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface OnboardingProps {
  onComplete: (username: string) => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { user } = useUser()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'input' | 'analyzing' | 'success'>('input')
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  const validateGitHubUsername = (username: string): boolean => {
    // GitHub username rules: 1-39 characters, alphanumeric and hyphens only
    const regex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/
    return regex.test(username)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate username format
    if (!validateGitHubUsername(username)) {
      setError('Invalid GitHub username format. Use only letters, numbers, and hyphens.')
      return
    }

    setLoading(true)
    setStep('analyzing')

    try {
      const email = user?.emailAddresses?.[0]?.emailAddress || null
      
      // Step 1: Create/update user in backend
      try {
        await axios.post(`${API_URL}/users`, {
          github_username: username,
          email: email
        })
      } catch (createErr: any) {
        // If user exists, that's fine, continue
        if (createErr.response?.status !== 400) {
          throw createErr
        }
      }

      // Step 2: Update Clerk metadata (so user stays logged in with GitHub username)
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          githubUsername: username,
          onboardingCompleted: true,
          onboardingDate: new Date().toISOString()
        }
      })

      // Step 3: Analyze GitHub (this takes time)
      const analysisResponse = await axios.post(`${API_URL}/analyze-github/${username}`)
      setAnalysisResults(analysisResponse.data)
      
      setStep('success')
      
      // Auto-redirect after 3 seconds
      setTimeout(() => {
        onComplete(username)
      }, 3000)
      
    } catch (err: any) {
      setLoading(false)
      setStep('input')
      
      // Better error messages
      if (err.response?.status === 404) {
        setError(`GitHub user "${username}" not found. Please check the spelling and try again.`)
      } else if (err.response?.status === 403) {
        setError('GitHub API rate limit exceeded. Please try again in a few minutes.')
      } else if (err.code === 'ECONNREFUSED') {
        setError('Cannot connect to backend server. Make sure the backend is running on port 8000.')
      } else {
        setError(err.response?.data?.detail || 'Failed to analyze GitHub profile. Please try again.')
      }
    }
  }

  const handleSkipToDemo = async () => {
    // For demo purposes, use a default GitHub user
    setUsername('octocat')
    // Auto-submit will be triggered
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-2xl w-full relative z-10">
        {/* Header - Brand Change: Sage -> Reflog */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Reflog
            </h1>
          </div>
          <p className="text-xl text-gray-400">Your Brutally Honest AI Mentor</p>
        </div>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-3xl shadow-2xl p-8">
          {step === 'input' && (
            <>
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-white mb-3">
                  Let's get real, {user?.firstName || 'friend'}
                </h2>
                <p className="text-gray-400 leading-relaxed">
                  Enter your GitHub username. We'll analyze your repos, commit patterns, 
                  and coding behavior to tell you what you're <strong className="text-white">really</strong> doing 
                  — not what you think you're doing.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    GitHub Username <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Github className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase().trim())
                        setError('')
                      }}
                      placeholder="octocat"
                      className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-lg"
                      required
                      autoFocus
                      disabled={loading}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <p className="text-gray-500">
                      Connected as: <span className="text-gray-400">{user?.emailAddresses?.[0]?.emailAddress}</span>
                    </p>
                    <a 
                      href="https://github.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      Don't have GitHub? <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-300 text-sm font-medium">Error</p>
                      <p className="text-red-400 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !username}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connecting to GitHub...
                    </>
                  ) : (
                    <>
                      Start My Journey
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Warning Box */}
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-200 font-medium mb-1">Fair Warning</p>
                    <p className="text-sm text-yellow-300/80">
                      This AI doesn't validate you or sugar-coat feedback. It challenges you with brutal honesty. 
                      If you're looking for compliments, this isn't the place.
                    </p>
                  </div>
                </div>
              </div>

              {/* Demo Option */}
              <div className="mt-4 text-center">
                <button
                  onClick={handleSkipToDemo}
                  className="text-sm text-gray-500 hover:text-gray-400 transition"
                >
                  Just exploring? Try with demo account →
                </button>
              </div>
            </>
          )}

          {step === 'analyzing' && (
            <div className="text-center py-12">
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto">
                  <Loader2 className="w-24 h-24 text-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Github className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">
                Analyzing your GitHub profile...
              </h3>
              <p className="text-gray-400 mb-6">
                Our AI agents are examining your repos, commit patterns, and behavior.
              </p>

              {/* Progress Steps */}
              <div className="max-w-md mx-auto space-y-3">
                {[
                  { text: 'Fetching repositories', delay: 0 },
                  { text: 'Analyzing commit patterns', delay: 1000 },
                  { text: 'Detecting behavior patterns', delay: 2000 },
                  { text: 'Preparing brutal honesty', delay: 3000 }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center space-x-3 text-gray-500 animate-in fade-in duration-500"
                    style={{ animationDelay: `${item.delay}ms` }}
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                <p className="text-xs text-gray-500">
                  This usually takes 15-30 seconds. Please don't close this page.
                </p>
              </div>
            </div>
          )}

          {step === 'success' && analysisResults && !showWalkthrough && (
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>

              <h3 className="text-3xl font-bold text-white mb-3">
                Welcome to Reflog! 🎉
              </h3>
              <p className="text-gray-400 mb-8">
                Your profile has been analyzed. Brace yourself for some honest feedback.
              </p>

              {/* Quick Stats */}
              {analysisResults.github_analysis && (
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="text-3xl font-bold text-blue-400">
                      {analysisResults.github_analysis.total_repos}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Repositories</div>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="text-3xl font-bold text-green-400">
                      {analysisResults.github_analysis.active_repos}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Active</div>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="text-3xl font-bold text-purple-400">
                      {Object.keys(analysisResults.github_analysis.languages || {}).length}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Languages</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center space-x-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Redirecting to dashboard...</span>
              </div>

              <button
                onClick={() => onComplete(username)}
                className="mt-6 text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Skip wait, go now →
              </button>
              <button
                onClick={() => setShowWalkthrough(true)}
                className="mt-6 bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-8 py-4 rounded-xl font-semibold hover:brightness-110 transition-all shadow-lg group"
              >
                Show Me How It Works
                <ArrowRight className="inline-block w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
        {showWalkthrough && !showTutorial && (
          <OnboardingWalkthrough 
              onComplete={() => {
                setShowWalkthrough(false)
                setShowTutorial(true)
              }}
            />
          )}

          {showTutorial && (
            <InteractiveTutorial 
              onComplete={() => {
                setShowTutorial(false)
                onComplete(username)
              }}
            />
          )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
              Secure
            </span>
            <span>•</span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
              Privacy-focused
            </span>
            <span>•</span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
              No BS
            </span>
          </div>
          <p className="text-xs text-gray-700 mt-4">
            By continuing, you agree to let us roast your code habits
          </p>
        </div>
      </div>
    </div>
  )
}