'use client'

import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/nextjs'
import axios from 'axios'
import { 
  Brain, Target, MessageCircle, 
  BookOpen, Menu, X, 
  Activity, Timer, Settings,
  Flame
} from 'lucide-react'
import CheckInModal from './CheckInModal' 
import Chat from './Chat' 
import LifeDecisions from './LifeDecisions' 
import Goals from './Goals'
import ActionPlans from './ActionPlans'
import Notifications from './Notifications'
import PomodoroTimer from './PomodoroTimer'
import CommitmentTracker from './CommitmentTracker'
import NotificationBell from './NotificationBell'
import CommitmentCalendar from './CommitmentCalendar'
import ActiveGoalsProgress from './ActiveGoalsProgress'
import QuickStatsCard from './QuickStatsCard'
import PomodoroQuickStart from './PomodoroQuickStart'
import AIInsightsFeed from './AIInsightsFeed'
import QuickActionPills from './QuickActionPills'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface DashboardProps {
  githubUsername: string
}

type TabType = 'overview' | 'focus' | 'goals' | 'decisions' | 'chat' | 'notifications'

export default function Dashboard({ githubUsername }: DashboardProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCheckin, setShowCheckin] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [todayCommitment, setTodayCommitment] = useState<any>(null)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [activeGoals, setActiveGoals] = useState<any[]>([])

  useEffect(() => {
    loadDashboard()
  }, [githubUsername])

  const loadDashboard = async () => {
    try {
      const [dashboardRes, commitmentRes, streakRes, goalsRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/${githubUsername}`),
        axios.get(`${API_URL}/commitments/${githubUsername}/today`),
        axios.get(`${API_URL}/commitments/${githubUsername}/streak-detailed`),
        axios.get(`${API_URL}/goals/${githubUsername}/dashboard`)
      ])
      
      setData(dashboardRes.data)
      setTodayCommitment(commitmentRes.data)
      setCurrentStreak(streakRes.data.current_streak)
      setActiveGoals(goalsRes.data.active_goals || [])
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'focus', label: 'Focus', icon: Timer },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'decisions', label: 'Decisions', icon: BookOpen },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
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
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#933DC9] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#FBFAEE]/70">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#FBFAEE]">
      {/* Compact Header */}
      <header className="bg-[#242424]/80 border-b border-[#242424]/50 sticky top-0 z-40 backdrop-blur-lg">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-2 rounded-xl">
                <Brain className="w-5 h-5 text-[#FBFAEE]" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-[#933DC9] to-[#53118F] bg-clip-text text-transparent">
                  Reflog
                </h1>
                <p className="text-[10px] text-[#FBFAEE]/50">@{githubUsername}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-2 text-sm ${
                      activeTab === tab.id
                        ? 'bg-[#933DC9]/20 text-[#C488F8]'
                        : 'text-[#FBFAEE]/70 hover:text-[#FBFAEE] hover:bg-[#242424]/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center space-x-2">
              <NotificationBell githubUsername={githubUsername} />
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 ring-2 ring-[#933DC9]/40"
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
        <div className="md:hidden bg-[#242424] border-b border-[#242424]/50 p-4">
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
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 ${
                    activeTab === tab.id
                      ? 'bg-[#933DC9]/20 text-[#C488F8]'
                      : 'text-[#FBFAEE]/80 hover:bg-[#242424]/50'
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

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Streak Card */}
              {currentStreak > 0 && (
                <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/40 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-transparent"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
                        <span className="text-sm font-semibold text-orange-300">Current Streak</span>
                      </div>
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-5xl font-bold text-orange-300">{currentStreak}</span>
                      <span className="text-lg text-orange-300/80">days</span>
                    </div>
                    <p className="text-xs text-orange-300/70 mt-2">
                      {todayCommitment?.has_checked_in_today 
                        ? "Keep it going! 🔥" 
                        : "Check in today to keep your streak!"}
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <QuickActionPills onAction={handleQuickAction} />

              {/* Stats Card */}
              {data?.stats && (
                <QuickStatsCard stats={data.stats} />
              )}

              {/* Pomodoro Quick Start */}
              <PomodoroQuickStart onStartFocus={() => setActiveTab('focus')} />
            </div>

            {/* Main Content Area (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Commitment Calendar */}
              <CommitmentCalendar githubUsername={githubUsername} />

              {/* AI Insights Feed */}
              {data?.recent_advice && data.recent_advice.length > 0 && (
                <AIInsightsFeed 
                  insights={data.recent_advice.map((advice: any) => ({
                    id: advice.id,
                    agent: advice.agent,
                    advice: advice.advice,
                    date: advice.date,
                    type: advice.type
                  }))}
                  onViewAll={() => setActiveTab('chat')}
                />
              )}

              {/* Active Goals Progress */}
              {activeGoals.length > 0 && (
                <ActiveGoalsProgress 
                  goals={activeGoals}
                  onViewAll={() => setActiveTab('goals')}
                />
              )}

              {/* Empty State if no content */}
              {(!data?.recent_advice || data.recent_advice.length === 0) && activeGoals.length === 0 && (
                <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-12 text-center">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-[#FBFAEE]/30" />
                  <h3 className="text-xl font-bold text-[#FBFAEE] mb-2">
                    Welcome to Reflog!
                  </h3>
                  <p className="text-[#FBFAEE]/70 mb-6 max-w-md mx-auto">
                    Get started by doing your first daily check-in or creating a goal.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => setShowCheckin(true)}
                      className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition"
                    >
                      Daily Check-in
                    </button>
                    <button
                      onClick={() => setActiveTab('goals')}
                      className="bg-[#000000]/40 text-[#FBFAEE] px-6 py-3 rounded-xl font-semibold hover:bg-[#000000]/60 transition border border-[#242424]/50"
                    >
                      Create Goal
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar (3 cols) */}
            <div className="lg:col-span-3">
              <CommitmentTracker
                githubUsername={githubUsername}
                onReviewComplete={loadDashboard}
              />
            </div>
          </div>
        )}

        {activeTab === 'focus' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-[#FBFAEE] mb-2">Focus Session</h2>
              <p className="text-[#FBFAEE]/70">
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

        {activeTab === 'goals' && (
          <Goals githubUsername={githubUsername} />
        )}

        {activeTab === 'decisions' && (
          <LifeDecisions githubUsername={githubUsername} />
        )}

        {activeTab === 'chat' && (
          <div className="max-w-5xl mx-auto">
            <Chat githubUsername={githubUsername} />
          </div>
        )}

        {activeTab === 'notifications' && (
          <Notifications githubUsername={githubUsername} />
        )}
      </main>

      {showCheckin && (
        <CheckInModal
          githubUsername={githubUsername}
          onClose={() => setShowCheckin(false)}
          onComplete={() => {
            setShowCheckin(false)
            loadDashboard()
          }}
        />
      )}
    </div>
  )
}