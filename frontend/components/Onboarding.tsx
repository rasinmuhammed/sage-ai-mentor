'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Github, Loader2, CheckCircle, AlertCircle, ExternalLink, ArrowRight, Brain, Sparkles, Database, Key, ChevronDown, ChevronUp } from 'lucide-react'
import OnboardingWalkthrough from './OnboardingWalkthrough'
import InteractiveTutorial from './InteractiveTutorial'
import GradientLayout from './ui/GradientLayout'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface OnboardingProps {
  onComplete: (username: string) => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { user } = useUser()
  const [username, setUsername] = useState('')
  const [dbUrl, setDbUrl] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'input' | 'database-setup' | 'analyzing' | 'success'>('input')
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showNeonGuide, setShowNeonGuide] = useState(false)
  const [showGroqGuide, setShowGroqGuide] = useState(false)

  const validateGitHubUsername = (username: string): boolean => {
    const regex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/
    return regex.test(username)
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateGitHubUsername(username)) {
      setError('Invalid GitHub username format. Use only letters, numbers, and hyphens.')
      return
    }

    setLoading(true)
    try {
      const email = user?.emailAddresses?.[0]?.emailAddress || null
      // Step 1: Create/update user in backend
      try {
        await axios.post(`${API_URL}/users`, {
          github_username: username,
          email: email
        })
      } catch (createErr: any) {
        if (createErr.response?.status !== 400) {
          throw createErr
        }
      }

      // Move to database setup
      setStep('database-setup')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDatabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!dbUrl.trim().startsWith('postgresql://') && !dbUrl.trim().startsWith('postgres://')) {
      setError('Invalid Database URL. Must start with postgresql://')
      setLoading(false)
      return
    }

    try {
      // Step 2: Setup Database
      await axios.post(`${API_URL}/users/${username}/setup-database`, {
        database_url: dbUrl
      })

      // Save Groq Key locally
      if (groqKey.trim()) {
        localStorage.setItem('groq_api_key', groqKey.trim())
      }

      // Step 3: Update Clerk metadata
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          githubUsername: username,
          onboardingCompleted: true,
          onboardingDate: new Date().toISOString()
        }
      })

      // Step 4: Analyze GitHub
      setStep('analyzing')
      const analysisResponse = await axios.post(`${API_URL}/analyze-github/${username}`)
      setAnalysisResults(analysisResponse.data)

      setStep('success')
      setTimeout(() => {
        onComplete(username)
      }, 3000)

    } catch (err: any) {
      setLoading(false)
      // If we fail at analysis but DB is set, we might want to stay on analyzing or go back
      // For now, go back to DB setup if DB failed, or stay if analysis failed?
      // Let's handle specific errors
      if (err.response?.status === 404) {
        setError(`GitHub user "${username}" not found.`)
        setStep('input') // Go back to start if user invalid
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.detail || 'Database connection failed.')
        // Stay on database-setup
      } else {
        setError('Something went wrong. Please check your inputs and try again.')
      }
    }
  }

  const handleSkipToDemo = async () => {
    const demoUser = 'torvalds'
    setUsername(demoUser)
    setLoading(true)
    setStep('analyzing')

    setTimeout(() => {
      setStep('success')
      setTimeout(() => {
        onComplete(demoUser)
      }, 2000)
    }, 3000)
  }

  if (showWalkthrough) {
    return <OnboardingWalkthrough onComplete={() => setShowWalkthrough(false)} />
  }

  if (showTutorial) {
    return <InteractiveTutorial onComplete={() => setShowTutorial(false)} />
  }

  return (
    <GradientLayout className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-float">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#933DC9] to-[#53118F] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Brain className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gradient">Reflog</h1>
          <p className="text-[#FBFAEE]/60">Your AI-Powered Engineering Mentor</p>
        </div>

        <div className="glass-card rounded-2xl p-8 shadow-xl backdrop-blur-xl">
          {step === 'input' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-semibold mb-2 text-[#FBFAEE]">Welcome aboard</h2>
              <p className="text-[#FBFAEE]/60 mb-6">Enter your GitHub username to get started.</p>

              <form onSubmit={handleUsernameSubmit} className="space-y-4">
                <div className="relative group">
                  <Github className="absolute left-3 top-3.5 w-5 h-5 text-[#FBFAEE]/40 group-focus-within:text-[#C488F8] transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="GitHub Username"
                    className="w-full bg-[#1A1A1A]/50 border border-[#FBFAEE]/10 rounded-xl py-3 pl-10 pr-4 text-[#FBFAEE] placeholder-[#FBFAEE]/30 focus:outline-none focus:border-[#933DC9] focus:ring-1 focus:ring-[#933DC9] transition-all"
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!username || loading}
                  className="w-full bg-gradient-to-r from-[#933DC9] to-[#53118F] hover:from-[#A855F7] hover:to-[#7C3AED] text-white font-medium py-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Next Step</span>
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-[#FBFAEE]/5 text-center">
                <p className="text-xs text-[#FBFAEE]/40 mb-3">Don't have a GitHub account?</p>
                <button
                  onClick={handleSkipToDemo}
                  className="text-sm text-[#C488F8] hover:text-[#D8B4FE] transition-colors flex items-center justify-center gap-1 mx-auto hover:underline"
                >
                  Try Demo Mode <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {step === 'database-setup' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-semibold mb-2 text-[#FBFAEE]">Connect Your Data</h2>
              <p className="text-[#FBFAEE]/60 mb-6 text-sm">
                Reflog uses a BYOM (Bring Your Own Model) approach. Your data stays in your database.
              </p>

              <form onSubmit={handleDatabaseSubmit} className="space-y-4">
                {/* Neon DB URL */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#FBFAEE]/60 ml-1">Neon Database URL</label>
                  <div className="relative group">
                    <Database className="absolute left-3 top-3.5 w-5 h-5 text-[#FBFAEE]/40 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="password"
                      value={dbUrl}
                      onChange={(e) => setDbUrl(e.target.value)}
                      placeholder="postgresql://..."
                      className="w-full bg-[#1A1A1A]/50 border border-[#FBFAEE]/10 rounded-xl py-3 pl-10 pr-4 text-[#FBFAEE] placeholder-[#FBFAEE]/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNeonGuide(!showNeonGuide)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-1"
                  >
                    How to get this? {showNeonGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showNeonGuide && (
                    <div className="p-3 bg-blue-500/10 rounded-lg text-xs text-blue-200 space-y-1">
                      <p>1. Go to <a href="https://neon.tech" target="_blank" className="underline">Neon.tech</a> and create a project.</p>
                      <p>2. Copy the Connection String from the Dashboard.</p>
                    </div>
                  )}
                </div>

                {/* Groq API Key */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#FBFAEE]/60 ml-1">Groq API Key</label>
                  <div className="relative group">
                    <Key className="absolute left-3 top-3.5 w-5 h-5 text-[#FBFAEE]/40 group-focus-within:text-[#C488F8] transition-colors" />
                    <input
                      type="password"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="gsk_..."
                      className="w-full bg-[#1A1A1A]/50 border border-[#FBFAEE]/10 rounded-xl py-3 pl-10 pr-4 text-[#FBFAEE] placeholder-[#FBFAEE]/30 focus:outline-none focus:border-[#933DC9] focus:ring-1 focus:ring-[#933DC9] transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGroqGuide(!showGroqGuide)}
                    className="text-xs text-[#C488F8] hover:text-[#D8B4FE] flex items-center gap-1 ml-1"
                  >
                    How to get this? {showGroqGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showGroqGuide && (
                    <div className="p-3 bg-[#933DC9]/10 rounded-lg text-xs text-[#E9D5FF] space-y-1">
                      <p>1. Go to <a href="https://console.groq.com/keys" target="_blank" className="underline">Groq Console</a>.</p>
                      <p>2. Create and copy your API Key.</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!dbUrl || !groqKey || loading}
                  className="w-full bg-gradient-to-r from-[#933DC9] to-[#53118F] hover:from-[#A855F7] hover:to-[#7C3AED] text-white font-medium py-3 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting & Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Start Journey</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-[#933DC9]/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#933DC9] border-t-transparent rounded-full animate-spin"></div>
                <Github className="absolute inset-0 m-auto w-8 h-8 text-[#C488F8] animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold text-[#FBFAEE] mb-2">Analyzing Profile</h3>
              <p className="text-[#FBFAEE]/60 max-w-xs mx-auto">
                Our AI agents are reviewing your repositories, commit history, and coding patterns...
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-sm text-[#FBFAEE]/40">
                  <Loader2 className="w-4 h-4 animate-spin text-[#933DC9]" />
                  <span>Fetching repositories...</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#FBFAEE]/40 delay-75">
                  <Loader2 className="w-4 h-4 animate-spin text-[#933DC9]" />
                  <span>Analyzing commit patterns...</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#FBFAEE]/40 delay-150">
                  <Loader2 className="w-4 h-4 animate-spin text-[#933DC9]" />
                  <span>Generating insights...</span>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/30">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-[#FBFAEE] mb-2">Analysis Complete!</h3>
              <p className="text-[#FBFAEE]/60 mb-8">
                Welcome to Reflog, <span className="text-[#C488F8] font-medium">@{username}</span>. Your personalized dashboard is ready.
              </p>
              <div className="w-full bg-[#FBFAEE]/5 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-[shimmer_1s_infinite] w-full origin-left"></div>
              </div>
              <p className="text-xs text-[#FBFAEE]/40 mt-2">Redirecting to dashboard...</p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-[#FBFAEE]/30 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4" />
              <span>GitHub Integrated</span>
            </div>
          </div>
        </div>
      </div>
    </GradientLayout>
  )
}