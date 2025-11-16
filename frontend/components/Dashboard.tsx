'use client'

import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/nextjs'
import axios from 'axios'
import { 
  Github, Brain, Target, TrendingUp, MessageCircle, 
  BookOpen, Menu, Bell, X, Calendar as CalendarIcon,
  Zap, Activity, Timer, BarChart3, Settings, ChevronRight
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

  useEffect(() => {
    loadDashboard()
  }, [githubUsername])

  const loadDashboard = async () => {
    try {
      const [dashboardRes, commitmentRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/${githubUsername}`),
        axios.get(`${API_URL}/commitments/${githubUsername}/today`)
      ])
      setData(dashboardRes.data)
      setTodayCommitment(commitmentRes.data)
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
            {/* Left Sidebar - Quick Stats */}
            <div className="lg:col-span-3 space-y-4">
              {/* Quick Actions Card */}
              <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-[#FBFAEE]/70 mb-3 uppercase tracking-wider">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCheckin(true)}
                    className="w-full bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-4 py-3 rounded-xl font-semibold hover:brightness-110 transition flex items-center justify-between"
                  >
                    <span>Daily Check-in</span>
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('focus')}
                    className="w-full bg-[#000000]/40 border border-[#242424]/60 text-[#FBFAEE] px-4 py-3 rounded-xl font-medium hover:bg-[#000000]/60 transition flex items-center justify-between"
                  >
                    <span>Start Focus Session</span>
                    <Timer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-[#FBFAEE]/70 mb-3 uppercase tracking-wider">
                  This Week
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-[#FBFAEE]/60">Success Rate</span>
                      <span className="text-sm font-bold text-green-400">
                        {data?.stats?.success_rate?.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#000000]/50 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-green-600 to-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${data?.stats?.success_rate || 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-[#FBFAEE]/60">Energy Level</span>
                      <span className="text-sm font-bold text-[#C488F8]">
                        {data?.stats?.avg_energy?.toFixed(1)}/10
                      </span>
                    </div>
                    <div className="w-full bg-[#000000]/50 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-[#933DC9] to-[#53118F] h-1.5 rounded-full"
                        style={{ width: `${(data?.stats?.avg_energy || 0) * 10}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#242424]/50">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#FBFAEE]/60">Check-ins</span>
                      <span className="font-semibold text-[#FBFAEE]">
                        {data?.stats?.total_checkins}/7
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GitHub Mini Card */}
              <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Github className="w-4 h-4 text-[#FBFAEE]/70" />
                  <h3 className="text-sm font-semibold text-[#FBFAEE]/70 uppercase tracking-wider">
                    GitHub
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#FBFAEE]/60">Active Repos</span>
                    <span className="font-semibold text-green-400">
                      {data?.github?.active_repos}/{data?.github?.total_repos}
                    </span>
                  </div>
                  <div className="w-full bg-[#000000]/50 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-green-600 to-emerald-500 h-1.5 rounded-full"
                      style={{ 
                        width: `${data?.github?.total_repos > 0 ? (data?.github?.active_repos / data?.github?.total_repos * 100) : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-6 space-y-6">
              {/* Today's Focus Card */}
              {todayCommitment?.has_commitment && (
                <div className="bg-gradient-to-br from-[#933DC9]/20 to-[#53118F]/20 border border-[#933DC9]/40 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-[#FBFAEE]">Today's Focus</h3>
                    {todayCommitment.needs_review && (
                      <span className="px-3 py-1 bg-orange-600/30 text-orange-300 rounded-full text-xs font-semibold">
                        Needs Review
                      </span>
                    )}
                  </div>
                  <p className="text-[#FBFAEE]/90 italic mb-4">
                    "{todayCommitment.commitment}"
                  </p>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setActiveTab('focus')}
                      className="flex-1 bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] py-2 rounded-lg font-semibold hover:brightness-110 transition text-sm"
                    >
                      Start Focus Session
                    </button>
                    {todayCommitment.needs_review && (
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="px-4 py-2 bg-orange-600 text-[#FBFAEE] rounded-lg font-semibold hover:brightness-110 transition text-sm"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Activity Feed */}
              <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[#FBFAEE] mb-4">Recent Insights</h3>
                <div className="space-y-3">
                  {data?.recent_advice?.slice(0, 3).map((advice: any) => (
                    <div
                      key={advice.id}
                      className="bg-[#000000]/40 border border-[#242424]/40 rounded-xl p-4 hover:border-[#933DC9]/30 transition cursor-pointer"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] p-2 rounded-lg flex-shrink-0">
                          <Brain className="w-4 h-4 text-[#FBFAEE]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-[#FBFAEE]">
                              {advice.agent}
                            </span>
                            <span className="text-xs text-[#FBFAEE]/50">
                              {advice.date}
                            </span>
                          </div>
                          <p className="text-sm text-[#FBFAEE]/70 line-clamp-2">
                            {advice.advice}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Commitments */}
            <div className="lg:col-span-3">
              <CommitmentTracker
                githubUsername={githubUsername}
                onReviewComplete={loadDashboard}
              />
            </div>
          </div>
        )}

        {activeTab === 'focus' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#FBFAEE] mb-2">Focus Session</h2>
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