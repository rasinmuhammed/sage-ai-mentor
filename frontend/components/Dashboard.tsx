'use client'

import { useState, useEffect } from 'react'
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
import { useDashboardData } from '@/hooks/useDashboardData'

interface DashboardProps {
  githubUsername: string
}

type TabType = 'overview' | 'focus' | 'goals' | 'learning' | 'decisions' | 'chat' | 'notifications' | 'history' | 'settings'

export default function Dashboard({ githubUsername }: DashboardProps) {
  const { data, todayCommitment, activeGoals, loading, refresh } = useDashboardData(githubUsername)
  const [showCheckin, setShowCheckin] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    checkOnboardingStatus()
  }, [githubUsername])

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

  return (
    <GradientLayout className="h-screen flex flex-col">
      {showCelebration && (
        <OnboardingCelebration onClose={() => setShowCelebration(false)} />
      )}

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
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto p-4 sm:p-8 space-y-8 scrollbar-hide">

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
                  {/* Learning Focus */}
                  {data?.active_plan_task ? (
                    <div
                      className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:border-[#933DC9]/50 transition-all duration-300 cursor-pointer group/item backdrop-blur-sm"
                      onClick={() => setActiveTab('learning')}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="px-3 py-1 rounded-full bg-[#933DC9]/20 text-[#C488F8] text-xs font-bold border border-[#933DC9]/30 uppercase tracking-wider">Learning</span>
                          <span className="text-xs text-[#FBFAEE]/50 font-medium">30-Day Plan • Day {data.active_plan_day}</span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-[#FBFAEE]/30 group-hover/item:text-[#C488F8] group-hover/item:translate-x-1 transition-all" />
                      </div>
                      <h4 className="text-xl font-semibold text-[#FBFAEE] mb-2 group-hover/item:text-white transition-colors">{data.active_plan_task.title}</h4>
                      <div className="flex items-center text-xs text-[#FBFAEE]/60 space-x-4">
                        <span className="flex items-center bg-black/20 px-2 py-1 rounded-md"><Clock className="w-3 h-3 mr-1.5" /> {data.active_plan_task.estimated_time} mins</span>
                        <span className="flex items-center bg-black/20 px-2 py-1 rounded-md"><Brain className="w-3 h-3 mr-1.5" /> {data.active_plan_focus}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-2xl p-8 border border-white/5 border-dashed flex flex-col items-center justify-center text-center hover:bg-white/10 transition-all cursor-pointer" onClick={() => setActiveTab('learning')}>
                      <div className="p-3 bg-white/5 rounded-full mb-3">
                        <BookOpen className="w-6 h-6 text-[#FBFAEE]/40" />
                      </div>
                      <p className="text-[#FBFAEE]/60 text-sm mb-4">No active learning plan</p>
                      <button className="text-xs bg-[#933DC9] hover:bg-[#822eb5] text-white px-4 py-2 rounded-lg transition shadow-lg shadow-purple-500/20 font-medium">Start Learning Journey</button>
                    </div>
                  )}

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

              {/* Quick Stats / Streak */}
              <div className="space-y-6">
                <div className="glass-card rounded-3xl p-6 relative overflow-hidden group hover-lift">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="font-bold text-[#FBFAEE]">Daily Streak</h3>
                    <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                  </div>
                  <div className="text-center py-4 relative z-10">
                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 drop-shadow-sm">
                      {data?.user?.streak || 0}
                    </div>
                    <div className="text-sm text-[#FBFAEE]/60 mt-2 font-medium uppercase tracking-widest">days on fire</div>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 relative overflow-hidden group hover-lift">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#FBFAEE]">Commitment</h3>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  {todayCommitment ? (
                    <div>
                      <p className="text-lg text-[#FBFAEE] font-medium italic mb-4 leading-relaxed">"{todayCommitment.commitment}"</p>
                      <div className={`text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center ${todayCommitment.shipped ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${todayCommitment.shipped ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}></div>
                        {todayCommitment.shipped ? 'COMPLETED' : 'IN PROGRESS'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-[#FBFAEE]/60 mb-4">No commitment set for today</p>
                      <button onClick={() => setShowCheckin(true)} className="w-full text-sm bg-[#933DC9] hover:bg-[#822eb5] text-white px-4 py-3 rounded-xl transition shadow-lg shadow-purple-500/20 font-bold flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Check In Now
                      </button>
                    </div>
                  )}
                </div>
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
        )}

        {/* Focus Tab */}
        {activeTab === 'focus' && (
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
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Goals githubUsername={githubUsername} />
          </div>
        )}

        {/* Learning Tab */}
        {activeTab === 'learning' && (
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ActionPlans githubUsername={githubUsername} />
          </div>
        )}

        {/* Decisions Tab */}
        {activeTab === 'decisions' && (
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <LifeDecisions githubUsername={githubUsername} />
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InteractionHistory githubUsername={githubUsername} />
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="max-w-6xl mx-auto h-full p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Chat githubUsername={githubUsername} />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsComponent githubUsername={githubUsername} />
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="h-full overflow-y-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Notifications githubUsername={githubUsername} />
          </div>
        )}
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