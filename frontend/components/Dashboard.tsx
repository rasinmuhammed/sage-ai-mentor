'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { UserButton } from '@clerk/nextjs'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  Target,
  BookOpen,
  Brain,
  MessageCircle,
  History,
  Settings as SettingsIcon,
  Bell,
  Menu,
  X,
  Plus,
  Search,
  Zap,
  ChevronRight,
  Calendar,
  ArrowRight,
  BarChart2,
  Activity,
  Timer,
  Flame,
  CheckCircle,
  Code
} from 'lucide-react'
import dynamic from 'next/dynamic'
import CheckInModal from './features/checkin/CheckInModal'
import PomodoroTimer from './features/productivity/PomodoroTimer'
import NotificationBell from './features/notifications/NotificationBell'
import AIInsightsFeed from './features/analytics/AIInsightsFeed'
import QuickActionPills from './shared/QuickActionPills'
import InteractionHistory from './features/chat/InteractionHistory'
import { updateOnboardingProgress } from '@/lib/onboardingStorage'
import OnboardingCelebration from './features/onboarding/OnboardingCelebration'
import GradientLayout from './ui/GradientLayout'
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext'
import CommitmentTracker from './features/analytics/CommitmentTracker'
import CommitmentCalendar from './features/analytics/CommitmentCalendar'
import CommandPalette from './shared/CommandPalette'
import MorningStandup from './features/productivity/MorningStandup'
import FlowMode from './features/productivity/FlowMode'
import TwoMinuteTimer from './features/productivity/TwoMinuteTimer'
import UnifiedDashboard from './features/analytics/UnifiedDashboard'

// Lazy load heavy components
const Chat = dynamic(() => import('./features/chat/Chat'), {
  loading: () => <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#933DC9]" /></div>
})
const LifeDecisions = dynamic(() => import('./features/life-decisions/LifeDecisions'), {
  loading: () => <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#933DC9]" /></div>
})
const Goals = dynamic(() => import('./features/goals/Goals'), {
  loading: () => <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#933DC9]" /></div>
})
const Notifications = dynamic(() => import('./features/notifications/Notifications'), {
  loading: () => <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#933DC9]" /></div>
})
const SettingsComponent = dynamic(() => import('./features/settings/Settings'), {
  loading: () => <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#933DC9]" /></div>
})
const Analytics = dynamic(() => import('./features/analytics/Analytics'), {
  loading: () => <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#933DC9]" /></div>
})
const LearningHub = dynamic(() => import('./features/learning/LearningHub'), {
  loading: () => <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#933DC9]" /></div>
})

interface DashboardProps {
  githubUsername: string
}

type TabType = 'overview' | 'focus' | 'goals' | 'learning' | 'dojo' | 'decisions' | 'chat' | 'notifications' | 'history' | 'settings' | 'analytics'

function DashboardContent({ githubUsername }: DashboardProps) {
  const {
    dashboardData: data,
    todayCommitment,
    activeGoals,
    dailyTasks,
    actionPlans,
    loading,
    refreshDashboard: refresh,
    optimisticUpdateTask,
    fetchGoals,
    fetchDecisions,
    fetchCommitmentCalendar,
    fetchAnalytics
  } = useDashboard()

  const [showCheckin, setShowCheckin] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showStandup, setShowStandup] = useState(false)
  const [showFlowMode, setShowFlowMode] = useState(false)
  const [showTwoMinuteTimer, setShowTwoMinuteTimer] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])

  useEffect(() => {
    // Check for morning standup
    const lastStandup = localStorage.getItem('last_standup_date')
    const today = new Date().toDateString()
    if (lastStandup !== today) {
      setShowStandup(true)
    }
  }, [])

  useEffect(() => {
    if (!dailyTasks && !activeGoals) return

    const newSuggestions = []

    // Add top 2 pending tasks
    if (dailyTasks) {
      const pendingTasks = dailyTasks.filter((t: any) => !t.completed).slice(0, 2)
      pendingTasks.forEach((t: any) => {
        newSuggestions.push({ title: `Complete: ${t.task}`, type: 'Action Plan' })
      })
    }

    // Add top 1 goal
    if (activeGoals && activeGoals.length > 0) {
      newSuggestions.push({ title: `Work on: ${activeGoals[0].title}`, type: 'Goal' })
    }

    setSuggestions(newSuggestions)
  }, [dailyTasks, activeGoals])

  const handleStandupComplete = () => {
    localStorage.setItem('last_standup_date', new Date().toDateString())
    setShowStandup(false)
  }
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  useEffect(() => {
    checkOnboardingStatus()
  }, [githubUsername])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
        return
      }

      // Ignore if modifiers are pressed (except Shift for some cases if needed)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key.toLowerCase()) {
        case 'c':
          e.preventDefault()
          setShowCheckin(true)
          break
        case 'n':
          e.preventDefault()
          // Default to new goal for now, or toggle a choice
          setActiveTab('goals')
          break
        case 'g':
          e.preventDefault()
          setActiveTab('goals')
          break
        case 'f':
          e.preventDefault()
          setActiveTab('focus')
          break
        case 'l':
          e.preventDefault()
          setActiveTab('learning')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    // Fetch data when tab changes
    switch (activeTab) {
      case 'goals':
        fetchGoals()
        break
      case 'decisions':
        fetchDecisions()
        break
      case 'analytics':
        fetchAnalytics()
        break
      // Add other cases for tabs that need specific data fetching
    }
  }, [activeTab, fetchGoals, fetchDecisions, fetchCommitmentCalendar, fetchAnalytics])

  const checkOnboardingStatus = () => {
    if (typeof window !== 'undefined') {
      const { getOnboardingProgress } = require('@/lib/onboardingStorage')
      const progress = getOnboardingProgress()

      if (progress.hasCompletedFirstCheckin &&
        progress.hasCreatedFirstGoal &&
        progress.hasUsedChat &&
        !progress.completedAt) {
        setShowCelebration(true)
      }
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'focus', label: 'Focus', icon: Timer },
    { id: 'learning', label: 'Learning', icon: BookOpen },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'decisions', label: 'Decisions', icon: Brain },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'history', label: 'History', icon: History },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ]

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'chat':
        setActiveTab('chat')
        break
      case 'flow':
        setShowFlowMode(true)
        break
      case 'goal':
        setActiveTab('goals')
        break
      case 'decision':
        setActiveTab('decisions')
        break
      case 'analytics':
        setActiveTab('analytics')
        break
      case 'checkin':
        setShowCheckin(true)
        break
      case 'timer':
        setShowTwoMinuteTimer(true)
        break
    }
  }

  const handleCommandAction = (action: string) => {
    switch (action) {
      case 'checkin':
        setShowCheckin(true)
        break
      case 'new_goal':
        setActiveTab('goals')
        break
      case 'new_plan':
        setActiveTab('learning')
        break
    }
  }

  if (loading) {
    return (
      <GradientLayout className="flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#933DC9] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#FBFAEE]/70 animate-pulse">Loading your workspace...</p>
        </div>
      </GradientLayout>
    )
  }

  // Handle error state (e.g. missing database configuration)
  if (!data || !todayCommitment) {
    return (
      <GradientLayout className="flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <SettingsIcon className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-[#FBFAEE] mb-2">Configuration Needed</h2>
          <p className="text-[#FBFAEE]/60 mb-6">
            We couldn't load your dashboard. This usually means your database connection hasn't been set up yet.
          </p>
          <button
            onClick={() => setActiveTab('settings')}
            className="px-6 py-3 bg-[#933DC9] hover:bg-[#7E34AB] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Go to Settings</span>
          </button>
        </div>
        {/* Render Settings if activeTab is settings (hacky but works for now to allow fixing) */}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'learning' && <LearningHub githubUsername={githubUsername} />}
        {activeTab === 'dojo' && <LearningHub githubUsername={githubUsername} />}
        {activeTab === 'settings' && <SettingsComponent githubUsername={githubUsername} />}
        {activeTab === 'settings' && (
          <div className="fixed inset-0 z-50 bg-[#0A0A0A]">
            <div className="p-4">
              <button onClick={() => window.location.reload()} className="mb-4 text-[#FBFAEE]/60 hover:text-[#FBFAEE]">← Back</button>
              <SettingsComponent githubUsername={githubUsername} />
            </div>
          </div>
        )}
      </GradientLayout>
    )
  }

  return (
    <GradientLayout className="h-screen flex flex-col">
      {showCelebration && (
        <OnboardingCelebration onClose={() => setShowCelebration(false)} />
      )}

      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        onNavigate={(tab) => setActiveTab(tab as TabType)}
        onAction={handleCommandAction}
      />

      <AnimatePresence>
        {showStandup && (
          <MorningStandup
            userName={githubUsername}
            onComplete={handleStandupComplete}
          />
        )}
        {showFlowMode && (
          <FlowMode onExit={() => setShowFlowMode(false)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Title */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#933DC9] to-[#C488F8] flex items-center justify-center shadow-lg shadow-[#933DC9]/20">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 hidden sm:block">
                  Reflog
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-xl">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`
                      relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2
                      ${isActive ? 'text-white' : 'text-[#FBFAEE]/60 hover:text-[#FBFAEE] hover:bg-white/5'}
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-[#933DC9] rounded-full shadow-lg shadow-[#933DC9]/25"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFlowMode(true)}
                className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs uppercase tracking-wider transition border border-white/5"
              >
                <Zap className="w-3 h-3 text-yellow-400" />
                <span>Flow</span>
              </button>
              <NotificationBell githubUsername={githubUsername} />
              <div className="h-8 w-px bg-white/10" />
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative z-10">
        <div className={`h-full ${activeTab === 'overview' ? 'block' : 'hidden'}`}>
          <div className="h-full overflow-y-auto p-4 sm:p-8 space-y-8">
            <header className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {githubUsername}
              </h1>
              <p className="text-[#FBFAEE]/60">Here's what's happening in your workspace today.</p>
            </header>

            <QuickActionPills onAction={handleQuickAction} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <UnifiedDashboard
                  githubUsername={githubUsername}
                  onReviewComplete={refresh}
                  onCheckIn={() => setShowCheckin(true)}
                  suggestions={suggestions}
                  onNavigate={(tab) => setActiveTab(tab as TabType)}
                />
                <CommitmentCalendar githubUsername={githubUsername} />
              </div>
              <div className="space-y-8">
                <PomodoroTimer githubUsername={githubUsername} />
                <AIInsightsFeed
                  insights={data?.recent_advice?.map((advice: any) => ({
                    id: advice.id,
                    agent: advice.agent,
                    advice: advice.advice,
                    date: advice.date,
                    type: advice.type
                  })) || []}
                  onViewAll={() => setActiveTab('history')}
                />
                <InteractionHistory githubUsername={githubUsername} limit={3} />
              </div>
            </div>
          </div>
        </div>

        <div className={`h-full ${activeTab === 'focus' ? 'block' : 'hidden'}`}>
          <div className="max-w-2xl mx-auto pt-12 p-4">
            <PomodoroTimer githubUsername={githubUsername} />
          </div>
        </div>

        <div className={`h-full ${activeTab === 'goals' ? 'block' : 'hidden'}`}>
          <div className="h-full overflow-y-auto p-4 sm:p-8">
            <Goals githubUsername={githubUsername} />
          </div>
        </div>

        <div className={`h-full ${activeTab === 'learning' ? 'block' : 'hidden'}`}>
          <div className="h-full overflow-y-auto p-4 sm:p-8">
            <LearningHub githubUsername={githubUsername} />
          </div>
        </div>

        {/* Dojo is now part of LearningHub, but keeping tab for backward compatibility if needed, or remove it */}
        {/* Removing Dojo tab content as it's in LearningHub now. If user clicks Dojo tab, we should probably redirect or show LearningHub with Dojo active */}
        <div className={`h-full ${activeTab === 'dojo' ? 'block' : 'hidden'}`}>
          <div className="h-full overflow-y-auto p-4 sm:p-8">
            <LearningHub githubUsername={githubUsername} />
            {/* Ideally we set activeTab to learning and learning tab to dojo, but for now just showing Hub */}
          </div>
        </div>

        <div className={`h-full ${activeTab === 'decisions' ? 'block' : 'hidden'}`}>
          <div className="h-full overflow-y-auto p-4 sm:p-8">
            <LifeDecisions githubUsername={githubUsername} />
          </div>
        </div>

        <div className={`h-full ${activeTab === 'analytics' ? 'block' : 'hidden'}`}>
          <div className="h-full overflow-y-auto p-4 sm:p-8">
            <Analytics />
          </div>
        </div>

        <div className={`h-full ${activeTab === 'history' ? 'block' : 'hidden'}`}>
          <div className="h-full overflow-y-auto p-4 sm:p-8">
            <InteractionHistory githubUsername={githubUsername} />
          </div>
        </div>

        <div className={`h-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
          <div className="max-w-6xl mx-auto h-full p-4 sm:p-8">
            <Chat githubUsername={githubUsername} />
          </div>
        </div>

        <div className={`h-full ${activeTab === 'settings' ? 'block' : 'hidden'}`}>
          <div className="h-full overflow-y-auto p-4 sm:p-8">
            <SettingsComponent githubUsername={githubUsername} />
          </div>
        </div>

        <div className={`h-full ${activeTab === 'notifications' ? 'block' : 'hidden'}`}>
          <div className="h-full overflow-y-auto p-4 sm:p-8">
            <Notifications githubUsername={githubUsername} />
          </div>
        </div>
      </main>

      {showCheckin && (
        <CheckInModal
          githubUsername={githubUsername}
          onClose={() => setShowCheckin(false)}
          onComplete={() => {
            setShowCheckin(false)
            refresh()
            checkOnboardingStatus()
          }}
          suggestions={suggestions}
        />
      )}

      {showTwoMinuteTimer && (
        <TwoMinuteTimer
          onClose={() => setShowTwoMinuteTimer(false)}
        />
      )}
    </GradientLayout>
  )
}

export default function Dashboard({ githubUsername }: DashboardProps) {
  return (
    <DashboardProvider githubUsername={githubUsername}>
      <DashboardContent githubUsername={githubUsername} />
    </DashboardProvider>
  )
}