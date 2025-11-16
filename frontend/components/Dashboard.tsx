// frontend/components/Dashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/nextjs'
import axios from 'axios'
import { 
  Github, Brain, Target, TrendingUp, AlertCircle, CheckCircle, MessageCircle, 
  BookOpen, Menu, Bell, X, History, Eye, Calendar as CalendarIcon, ArrowRight,
  RefreshCw, Zap, Activity, Code, GitBranch, Star, Sparkles
} from 'lucide-react'
import CheckInModal from './CheckInModal' 
import AgentInsights from './AgentInsights' 
import Chat from './Chat' 
import LifeDecisions from './LifeDecisions' 
import InteractionHistory from './InteractionHistory' 
import MarkdownRenderer from './MarkdownRenderer' 
import CommitmentTracker from './CommitmentTracker' 
import NotificationBanner from './NotificationBanner' 
import CommitmentCalendar from './CommitmentCalendar'
import NotificationBell from './NotificationBell'
import Notifications from './Notifications'
import Goals from './Goals'
import DashboardOverview from './DashboardOverview'
import ActionPlans from './ActionPlans'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface DashboardProps {
  githubUsername: string
}

interface DashboardData {
  user: {
    username: string
    member_since: string
  }
  github: {
    total_repos: number
    active_repos: number
    languages: Record<string, number>
    patterns: Array<{
      type: string
      severity: string
      message: string
    }>
  }
  stats: {
    total_checkins: number
    commitments_kept: number
    success_rate: number
    avg_energy: number
  }
  recent_advice: Array<{
    id: number
    agent: string
    advice: string
    date: string
    type: string
  }>
}

type TabType = 'overview' | 'chat' | 'commitments' |'action-plans' | 'goals' | 'decisions' | 'history' | 'notifications' 

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header Skeleton */}
      <div className="h-20 bg-[#242424]/50 rounded-2xl"></div>
      
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="h-64 bg-[#242424]/50 rounded-2xl"></div>
          <div className="h-48 bg-[#242424]/50 rounded-2xl"></div>
        </div>
        <div className="lg:col-span-2">
          <div className="h-96 bg-[#242424]/50 rounded-2xl"></div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ githubUsername }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCheckin, setShowCheckin] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [refetchingGithub, setRefetchingGithub] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [githubUsername, refreshKey])

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        await axios.post(`${API_URL}/notifications/${githubUsername}/check`)
      } catch (error) {
        console.error('Failed to check notifications:', error)
      }
    }
    
    checkNotifications()
    const interval = setInterval(checkNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [githubUsername])

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/dashboard/${githubUsername}`)
      setData(response.data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefetchGithub = async () => {
    setRefetchingGithub(true)
    try {
      await axios.post(`${API_URL}/analyze-github/${githubUsername}`)
      await loadDashboard()
      alert('✅ GitHub analysis updated successfully!')
    } catch (error) {
      console.error('Failed to refetch GitHub:', error)
      alert('❌ Failed to update GitHub analysis. Please try again.')
    } finally {
      setRefetchingGithub(false)
    }
  }

  const handleCheckinComplete = () => {
    setShowCheckin(false)
    setRefreshKey(prev => prev + 1)
  }


  // --- FIX: Move activePercentage calculation inside the main render/if(data) ---
  let activePercentage = 0;
  if (data?.github) {
    activePercentage = data.github.total_repos > 0
      ? parseFloat(((data.github.active_repos / data.github.total_repos) * 100).toFixed(0))
      : 0;
  }
  // --- END FIX ---


  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'commitments', label: 'Commitments', icon: CalendarIcon },
    { id: 'action-plans', label: 'Action Plans', icon: Target },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'decisions', label: 'Decisions', icon: BookOpen },
    { id: 'history', label: 'History', icon: History },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  if (loading || !data) { // Ensure data existence is checked here too
    return (
      <div className="min-h-screen bg-[#000000] text-[#FBFAEE]">
        <NotificationBanner
          githubUsername={githubUsername}
          onReviewClick={() => setActiveTab('commitments')}
        />
        <header className="bg-[#000000]/80 border-b border-[#242424]/50 sticky top-0 z-40 backdrop-blur-lg">
          {/* ... header content ... */}
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardSkeleton />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#FBFAEE]">
      <NotificationBanner
        githubUsername={githubUsername}
        onReviewClick={() => setActiveTab('commitments')}
      />

      {/* Enhanced Header */}
      <header className="bg-[#000000]/80 border-b border-[#242424]/50 sticky top-0 z-40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo and Username */}
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-3 rounded-2xl shadow-lg relative group">
                <Brain className="w-7 h-7 text-[#FBFAEE]" />
                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#933DC9] to-[#53118F] bg-clip-text text-transparent">
                  Reflog
                </h1>
                <p className="text-xs text-[#FBFAEE]/60">@{data.user.username}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 bg-[#242424]/40 rounded-full p-1 border border-[#242424]/60">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-full transition-all flex items-center space-x-2 text-sm relative ${
                      isActive
                        ? 'bg-[#933DC9]/20 text-[#C488F8] shadow-md ring-1 ring-[#933DC9]/30'
                        : 'text-[#FBFAEE]/70 hover:text-[#FBFAEE] hover:bg-[#242424]/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#C488F8]' : 'text-[#FBFAEE]/70'}`} />
                    <span className="font-medium">{tab.label}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-[#933DC9] to-[#53118F] rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-3">
              {/* Enhanced Check-in Button */}
              <button
                onClick={() => setShowCheckin(true)}
                className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-[#933DC9] to-[#53118F] px-5 py-2.5 rounded-xl font-semibold hover:brightness-110 transition-all shadow-lg hover:shadow-[#933DC9]/40 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <CalendarIcon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Daily Check-in</span>
                <Sparkles className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform" />
              </button>

              <NotificationBell githubUsername={githubUsername} />

              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10 ring-2 ring-[#933DC9]/40"
                  }
                }}
              />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-[#FBFAEE]/70 hover:text-[#FBFAEE] p-2 hover:bg-[#242424]/50 rounded-xl transition"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 pt-2 border-t border-[#242424]/50 animate-in slide-in-from-top duration-300">
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition-all text-base ${
                        isActive
                          ? 'bg-[#933DC9]/20 text-[#C488F8]'
                          : 'text-[#FBFAEE]/80 hover:bg-[#242424]/50 hover:text-[#FBFAEE]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setShowCheckin(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full mt-3 bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-4 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:brightness-110 transition shadow-lg"
              >
                <CalendarIcon className="w-5 h-5" />
                <span>Daily Check-in</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <>
            <DashboardOverview
              githubUsername={githubUsername}
              data={data}
              onCheckIn={() => setShowCheckin(true)}
              onReviewCommitment={() => setActiveTab('commitments')}
              onViewGoals={() => setActiveTab('goals')}
              onChat={() => setActiveTab('chat')}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              {/* Left Column */}
              <div className="lg:col-span-1 space-y-6">
                {/* Enhanced GitHub Stats */}
                <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl p-6 relative overflow-hidden group">
                  {/* Animated background effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#933DC9]/5 to-[#53118F]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-br from-[#333] to-[#111] p-3 rounded-xl mr-3 shadow-md">
                          <Github className="w-6 h-6 text-[#FBFAEE]/90" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-[#FBFAEE]">GitHub Reality</h2>
                          <p className="text-xs text-[#FBFAEE]/60">Your actual activity</p>
                        </div>
                      </div>
                      <button
                        onClick={handleRefetchGithub}
                        disabled={refetchingGithub}
                        className="p-2 bg-[#000000]/40 hover:bg-[#000000]/60 rounded-lg transition border border-[#242424]/50 disabled:opacity-50 group/btn"
                        title="Refresh GitHub analysis"
                      >
                        <RefreshCw className={`w-4 h-4 text-[#FBFAEE]/70 ${refetchingGithub ? 'animate-spin' : 'group-hover/btn:rotate-180 transition-transform duration-500'}`} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-[#000000]/40 rounded-xl p-4 border border-[#242424]/40">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Code className="w-4 h-4 text-[#933DC9]" />
                              <span className="text-sm text-[#FBFAEE]/70">Total Repos</span>
                            </div>
                            {/* FIX: Use optional chaining to safely display data */}
                            <span className="text-3xl font-bold text-[#FBFAEE]">{data.github.total_repos}</span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <Activity className="w-4 h-4 text-green-400" />
                              <span className="text-sm text-[#FBFAEE]/70">Active</span>
                            </div>
                             {/* FIX: Use optional chaining to safely display data */}
                            <span className="text-3xl font-bold text-green-400">{data.github.active_repos}</span>
                          </div>
                        </div>
                        
                        <div className="relative w-full bg-[#000000]/50 rounded-full h-3 mt-3 overflow-hidden border border-[#242424]/30">
                          <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-600 to-emerald-500 rounded-full transition-all duration-1000 relative overflow-hidden"
                            style={{ width: `${activePercentage}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                          </div>
                        </div>
                        <p className="text-xs text-[#FBFAEE]/60 mt-2 text-center font-medium">
                          {activePercentage}% actively maintained
                        </p>
                      </div>

                      <div className="bg-[#000000]/40 rounded-xl p-4 border border-[#242424]/40">
                        <div className="flex items-center space-x-2 mb-3">
                          <GitBranch className="w-4 h-4 text-[#933DC9]" />
                          <span className="text-sm text-[#FBFAEE]/70 font-medium">Top Languages</span>
                        </div>
                        <div className="space-y-2">
                           {/* FIX: Safely iterate over languages, handling null/undefined */}
                          {Object.entries(data.github.languages || {}).slice(0, 3).map(([lang, count]) => (
                            <div key={lang} className="flex items-center justify-between group/lang">
                              <div className="flex items-center space-x-2">
                                <Star className="w-3 h-3 text-[#933DC9] group-hover/lang:text-[#C488F8] transition-colors" />
                                <span className="text-[#FBFAEE]/90 text-sm font-medium">{lang}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-[#000000]/50 rounded-full h-1.5 border border-[#242424]/30 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-[#933DC9] to-[#53118F] h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(((count as number) / (data.github.total_repos || 1)) * 100, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-[#FBFAEE]/60 text-xs w-8 text-right font-medium">{count}</span>
                              </div>
                            </div>
                          ))}
                          {Object.keys(data.github.languages || {}).length === 0 && (
                            <p className="text-xs text-[#FBFAEE]/60 text-center py-2">No language data found.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rest of the left column content remains the same */}
                {/* Accountability Stats - keeping existing code */}
                <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl p-6">
                  <div className="flex items-center mb-6">
                    <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-3 rounded-xl mr-3 shadow-md">
                      <Target className="w-6 h-6 text-[#FBFAEE]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#FBFAEE]">Accountability</h2>
                      <p className="text-xs text-[#FBFAEE]/60">Your commitment track record</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="relative bg-gradient-to-br from-[#933DC9]/20 to-[#53118F]/20 border border-[#933DC9]/30 rounded-2xl p-6 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#933DC9]/10 to-transparent"></div>
                      <div className="relative text-center">
                        <div className="text-5xl font-bold bg-gradient-to-r from-[#C488F8] to-[#933DC9] bg-clip-text text-transparent mb-2">
                           {/* FIX: Use optional chaining to safely display data */}
                          {data.stats.success_rate.toFixed(0)}%
                        </div>
                        <div className="text-sm text-[#FBFAEE]/80 font-medium">Success Rate</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#000000]/40 rounded-xl p-4 text-center border border-[#242424]/40">
                         {/* FIX: Use optional chaining to safely display data */}
                        <div className="text-3xl font-bold text-[#FBFAEE] mb-1">{data.stats.total_checkins}</div>
                        <div className="text-xs text-[#FBFAEE]/70">Check-ins</div>
                      </div>
                      <div className="bg-[#000000]/40 rounded-xl p-4 text-center border border-[#242424]/40">
                         {/* FIX: Use optional chaining to safely display data */}
                        <div className="text-3xl font-bold text-green-400 mb-1">{data.stats.commitments_kept}</div>
                        <div className="text-xs text-[#FBFAEE]/70">Kept</div>
                      </div>
                    </div>
                    <div className="bg-[#000000]/40 rounded-xl p-4 border border-[#242424]/40">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#FBFAEE]/70">Average Energy</span>
                         {/* FIX: Use optional chaining to safely display data */}
                        <span className="text-lg font-bold text-[#FBFAEE]">{data.stats.avg_energy.toFixed(1)}<span className="text-[#FBFAEE]/60 text-sm">/10</span></span>
                      </div>
                      <div className="w-full bg-[#000000]/50 rounded-full h-1.5 border border-[#242424]/30">
                        <div
                           // FIX: Use optional chaining to safely set width style
                          className="bg-gradient-to-r from-[#933DC9] to-[#53118F] h-1.5 rounded-full transition-all duration-1000"
                          style={{ width: `${(data.stats.avg_energy || 0) * 10}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - keeping existing content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Interactions and other content remain the same */}
                <AgentInsights advice={data.recent_advice} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-5xl mx-auto">
            <Chat githubUsername={githubUsername} />
          </div>
        )}

        {activeTab === 'commitments' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <CommitmentTracker
              githubUsername={githubUsername}
              onReviewComplete={() => setRefreshKey(prev => prev + 1)}
            />
            <CommitmentCalendar githubUsername={githubUsername} />
          </div>
        )}

        {activeTab === 'action-plans' && (
          <div className="max-w-6xl mx-auto">
            <ActionPlans githubUsername={githubUsername} />
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="max-w-6xl mx-auto">
            <Goals githubUsername={githubUsername} />
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="max-w-6xl mx-auto">
            <LifeDecisions githubUsername={githubUsername} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-5xl mx-auto">
            <InteractionHistory githubUsername={githubUsername} />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-6xl mx-auto">
            <Notifications githubUsername={githubUsername} />
          </div>
        )}
      </main>

      {showCheckin && (
        <CheckInModal
          githubUsername={githubUsername}
          onClose={() => setShowCheckin(false)}
          onComplete={handleCheckinComplete}
        />
      )}

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}