'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { UserButton } from '@clerk/nextjs'
import {
  Brain, Target, MessageCircle,
  BookOpen, Menu, X,
  Activity, Timer, Settings,
  Flame, History, ArrowRight, Clock, CheckCircle
} from 'lucide-react'
import CheckInModal from './CheckInModal'
import Chat from './Chat'
import LifeDecisions from './LifeDecisions'
import Goals from './Goals'
import ActionPlans from './ActionPlans'
import Notifications from './Notifications'
import PomodoroTimer from './PomodoroTimer'
import NotificationBell from './NotificationBell'
import AIInsightsFeed from './AIInsightsFeed'
import QuickActionPills from './QuickActionPills'
import InteractionHistory from './InteractionHistory'
import { updateOnboardingProgress } from '@/lib/onboardingStorage'
import OnboardingCelebration from './OnboardingCelebration'
import SettingsComponent from './Settings'
import GradientLayout from './ui/GradientLayout'
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext'
import CommitmentTracker from './CommitmentTracker'
import CommitmentCalendar from './CommitmentCalendar'
import CommandPalette from './CommandPalette'

interface DashboardProps {
  githubUsername: string
}

type TabType = 'overview' | 'focus' | 'goals' | 'learning' | 'decisions' | 'chat' | 'notifications' | 'history' | 'settings'

function DashboardContent({ githubUsername }: DashboardProps) {
  const {
    dashboardData: data,
    todayCommitment,
    activeGoals,
    dailyTasks,
    actionPlans,
    loading,
    refreshDashboard: refresh,
    optimisticUpdateTask
  } = useDashboard()

  const [showCheckin, setShowCheckin] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
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
    { id: 'history', label: 'History', icon: History },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'chat':
        setActiveTab('chat')
        break
      case 'goal':
        setActiveTab('goals')
        break
      case 'decision':
        setActiveTab('decisions')
        break
      case 'checkin':
        setShowCheckin(true)
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
            <Settings className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-[#FBFAEE] mb-2">Configuration Needed</h2>
          <p className="text-[#FBFAEE]/60 mb-6">
            We couldn't load your dashboard. This usually means your database connection hasn't been set up yet.
          </p>
          <button
            onClick={() => setActiveTab('settings')}
            className="px-6 py-3 bg-[#933DC9] hover:bg-[#7E34AB] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <Settings className="w-4 h-4" />
            <span>Go to Settings</span>
          </button>
        </div>
        {/* Render Settings if activeTab is settings (hacky but works for now to allow fixing) */}
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

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/5">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-2 rounded-xl shadow-lg shadow-purple-500/20">
                <Brain className="w-5 h-5 text-[#FBFAEE]" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-[#933DC9] to-[#C488F8] bg-clip-text text-transparent">
                  Reflog
                </h1>
                <p className="text-[10px] text-[#FBFAEE]/50">@{githubUsername}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 text-sm font-medium ${isActive
                      ? 'bg-[#933DC9] text-white shadow-lg shadow-purple-500/30'
                      : 'text-[#FBFAEE]/60 hover:text-[#FBFAEE] hover:bg-white/5'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center space-x-4">
              <NotificationBell githubUsername={githubUsername} />
              <div className="h-8 w-[1px] bg-white/10"></div>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9 ring-2 ring-[#933DC9]/40 hover:ring-[#933DC9] transition-all duration-300"
                  }
                }}
              />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-[#FBFAEE]/70 hover:text-[#FBFAEE] p-2"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-b border-white/5 p-4 animate-in slide-in-from-top-5">
          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabType)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 transition-all ${activeTab === tab.id
                    ? 'bg-[#933DC9]/20 text-[#C488F8] border border-[#933DC9]/30'
                    : 'text-[#FBFAEE]/80 hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative z-10">
        {/* Overview Tab */}
        <div className={activeTab === 'overview' ? 'h-full block' : 'hidden'}>
          <div className="h-full overflow-y-auto p-4 sm:p-8 space-y-8">

            {/* Daily Focus Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Focus Card */}
              <div className="lg:col-span-2 glass-card rounded-3xl p-8 relative overflow-hidden group hover-lift">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#933DC9]/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-[#933DC9]/30 transition-all duration-700"></div>

                <h3 className="text-2xl font-bold text-[#FBFAEE] mb-8 flex items-center">
                  <div className="p-2 bg-orange-500/20 rounded-lg mr-3">
                    <Flame className="w-6 h-6 text-orange-500" />
                  </div>
                  Today's Focus
                </h3>

                <div className="space-y-4 relative z-10">
                  {/* Daily Tasks from Action Plan */}
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:border-[#933DC9]/50 transition-all duration-300 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 rounded-full bg-[#933DC9]/20 text-[#C488F8] text-xs font-bold border border-[#933DC9]/30 uppercase tracking-wider">Action Plan</span>
                        <span className="text-xs text-[#FBFAEE]/50 font-medium">Today's Tasks</span>
                      </div>
                      <button
                        onClick={() => setActiveTab('learning')}
                        className="text-xs text-[#C488F8] hover:text-white transition-colors flex items-center"
                      >
                        View Plan <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>

                    {dailyTasks && dailyTasks.length > 0 ? (
                      <div className="space-y-3">
                        {dailyTasks.map((task: any) => (
                          <div key={task.id} className="group flex items-start space-x-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (task.status === 'completed') return;

                                // Optimistic update
                                optimisticUpdateTask(task.id, { status: 'completed' });

                                try {
                                  // Fallback to finding plan ID if missing on task object
                                  const planId = task.action_plan_id || actionPlans.find((p: any) => p.daily_tasks?.some((t: any) => t.id === task.id))?.id;

                                  if (!planId) {
                                    console.error("Plan ID not found for task", task);
                                    throw new Error("Plan ID not found");
                                  }

                                  await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/action-plans/${githubUsername}/${planId}/tasks/${task.id}/complete`, {
                                    notes: "Completed from Dashboard"
                                  });
                                  // No need to refresh immediately if successful, but good to sync eventually
                                  // refresh(); 
                                } catch (err) {
                                  console.error("Failed to complete task", err);
                                  // Revert optimistic update on error
                                  optimisticUpdateTask(task.id, { status: 'pending' });
                                  alert("Failed to complete task. Please try again.");
                                }
                              }}
                              className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${task.status === 'completed'
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-[#FBFAEE]/30 hover:border-[#C488F8]'
                                }`}
                            >
                              {task.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                            </button>
                            <div className="flex-1">
                              <p className={`text-sm font-medium transition-all ${task.status === 'completed' ? 'text-[#FBFAEE]/30 line-through' : 'text-[#FBFAEE]'
                                }`}>
                                {task.title}
                              </p>
                              <div className="flex items-center space-x-3 mt-1">
                                <span className="text-xs text-[#FBFAEE]/40 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" /> {task.estimated_time}m
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${task.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                                  task.difficulty === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-green-500/20 text-green-400'
                                  }`}>
                                  {task.difficulty}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6" onClick={() => setActiveTab('learning')}>
                        <div className="p-3 bg-white/5 rounded-full mb-3 inline-flex">
                          <BookOpen className="w-5 h-5 text-[#FBFAEE]/40" />
                        </div>
                        <p className="text-[#FBFAEE]/60 text-sm mb-2">No active tasks for today</p>
                        <button className="text-xs text-[#C488F8] hover:underline">Create or view your plan</button>
                      </div>
                    )}
                  </div>

                  {/* Goal Focus */}
                  {activeGoals.length > 0 ? (
                    <div
                      className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:border-orange-500/50 transition-all duration-300 cursor-pointer group/item backdrop-blur-sm"
                      onClick={() => setActiveTab('goals')}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30 uppercase tracking-wider">Goal</span>
                          <span className="text-xs text-[#FBFAEE]/50 font-medium">{activeGoals[0].title}</span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-[#FBFAEE]/30 group-hover/item:text-orange-400 group-hover/item:translate-x-1 transition-all" />
                      </div>
                      <h4 className="text-xl font-semibold text-[#FBFAEE] mb-2 group-hover/item:text-white transition-colors">
                        {activeGoals[0].milestones?.find((m: any) => !m.achieved)?.title || "Continue making progress"}
                      </h4>
                      <div className="w-full bg-black/30 rounded-full h-2 mt-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-600 to-orange-400 h-full rounded-full relative" style={{ width: `${activeGoals[0].progress}%` }}>
                          <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-2xl p-8 border border-white/5 border-dashed flex flex-col items-center justify-center text-center hover:bg-white/10 transition-all cursor-pointer" onClick={() => setActiveTab('goals')}>
                      <div className="p-3 bg-white/5 rounded-full mb-3">
                        <Target className="w-6 h-6 text-[#FBFAEE]/40" />
                      </div>
                      <p className="text-[#FBFAEE]/60 text-sm mb-4">No active goals</p>
                      <button className="text-xs bg-[#242424] hover:bg-[#333] text-[#FBFAEE] px-4 py-2 rounded-lg transition border border-white/10 font-medium">Set a Goal</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats / Streak & Commitment Tracker */}
              <div className="space-y-6">
                <CommitmentTracker
                  githubUsername={githubUsername}
                  onReviewComplete={refresh}
                  onCheckIn={() => setShowCheckin(true)}
                />
                <CommitmentCalendar githubUsername={githubUsername} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="py-2">
              <QuickActionPills onAction={handleQuickAction} />
            </div>

            {/* Recent Activity & Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card rounded-3xl p-8 hover-lift">
                <h3 className="font-bold text-[#FBFAEE] mb-6 flex items-center text-lg">
                  <div className="p-2 bg-[#933DC9]/20 rounded-lg mr-3">
                    <Activity className="w-5 h-5 text-[#933DC9]" />
                  </div>
                  Recent Activity
                </h3>
                <InteractionHistory githubUsername={githubUsername} limit={3} />
              </div>

              <div className="glass-card rounded-3xl p-8 hover-lift">
                <h3 className="font-bold text-[#FBFAEE] mb-6 flex items-center text-lg">
                  <div className="p-2 bg-[#C488F8]/20 rounded-lg mr-3">
                    <Brain className="w-5 h-5 text-[#C488F8]" />
                  </div>
                  AI Insights
                </h3>
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
              </div>
            </div>
          </div>
        </div>

        {/* Focus Tab */}
        <div className={activeTab === 'focus' ? 'h-full block' : 'hidden'}>
          <div className="max-w-6xl mx-auto h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-3">Focus Session</h2>
              <p className="text-[#FBFAEE]/60 text-lg">
                Use the Pomodoro technique to maximize your productivity
              </p>
            </div>
            <PomodoroTimer
              githubUsername={githubUsername}
              todayCommitment={todayCommitment?.commitment}
              checkinId={todayCommitment?.checkin_id}
            />
          </div>
        </div>

        {/* Goals Tab */}
        <div className={activeTab === 'goals' ? 'h-full block' : 'hidden'}>
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Goals githubUsername={githubUsername} />
          </div>
        </div>

        {/* Learning Tab */}
        <div className={activeTab === 'learning' ? 'h-full block' : 'hidden'}>
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ActionPlans githubUsername={githubUsername} />
          </div>
        </div>

        {/* Decisions Tab */}
        <div className={activeTab === 'decisions' ? 'h-full block' : 'hidden'}>
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <LifeDecisions githubUsername={githubUsername} />
          </div>
        </div>

        {/* History Tab */}
        <div className={activeTab === 'history' ? 'h-full block' : 'hidden'}>
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InteractionHistory githubUsername={githubUsername} />
          </div>
        </div>

        {/* Chat Tab */}
        <div className={activeTab === 'chat' ? 'h-full block' : 'hidden'}>
          <div className="max-w-6xl mx-auto h-full p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Chat githubUsername={githubUsername} />
          </div>
        </div>

        {/* Settings Tab */}
        <div className={activeTab === 'settings' ? 'h-full block' : 'hidden'}>
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsComponent githubUsername={githubUsername} />
          </div>
        </div>

        {/* Notifications Tab */}
        <div className={activeTab === 'notifications' ? 'h-full block' : 'hidden'}>
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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