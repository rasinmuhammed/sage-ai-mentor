// frontend/components/DashboardOverview.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, Target, MessageCircle, TrendingUp, TrendingDown, 
  Zap, CheckCircle, ArrowRight, Activity, Github, Brain,
  Minus, Sparkles, Clock, Award, Flame
} from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface DashboardOverviewProps {
  githubUsername: string
  data: any
  onCheckIn: () => void
  onReviewCommitment: () => void
  onViewGoals: () => void
  onChat: () => void
}

export default function DashboardOverview({
  githubUsername,
  data,
  onCheckIn,
  onReviewCommitment,
  onViewGoals,
  onChat
}: DashboardOverviewProps) {
  const [todayCommitment, setTodayCommitment] = useState<any>(null)
  const [activeGoalsCount, setActiveGoalsCount] = useState(0)
  const [goalsProgress, setGoalsProgress] = useState(0)
  const [previousStats, setPreviousStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentStreak, setCurrentStreak] = useState(0)

  useEffect(() => {
    loadQuickData()
  }, [githubUsername])

  const loadQuickData = async () => {
    try {
      const [commitmentRes, goalsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/commitments/${githubUsername}/today`),
        axios.get(`${API_URL}/goals/${githubUsername}/dashboard`),
        axios.get(`${API_URL}/commitments/${githubUsername}/stats?days=14`)
      ])

      setTodayCommitment(commitmentRes.data)
      setActiveGoalsCount(goalsRes.data.active_goals_count)
      setGoalsProgress(goalsRes.data.average_progress)
      setCurrentStreak(statsRes.data.current_streak || 0)

      const twoWeeksAgo = statsRes.data
      setPreviousStats(twoWeeksAgo)
    } catch (error) {
      console.error('Failed to load quick data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendIndicator = (current: number, previous: number) => {
    if (!previous || current === previous) {
      return { icon: Minus, color: 'text-[#FBFAEE]/40', text: 'No change' }
    }
    const change = ((current - previous) / previous * 100).toFixed(0)
    if (current > previous) {
      return { icon: TrendingUp, color: 'text-green-400', text: `+${change}%` }
    }
    return { icon: TrendingDown, color: 'text-red-400', text: `${change}%` }
  }

  const needsCheckIn = !todayCommitment?.has_commitment
  const needsReview = todayCommitment?.needs_review

  return (
    <div className="space-y-6">
      {/* Hero Section with Quick Actions */}
      <div className="relative bg-gradient-to-br from-[#933DC9]/10 via-[#53118F]/10 to-[#933DC9]/10 border border-[#933DC9]/30 rounded-3xl p-8 shadow-2xl overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#933DC9]/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#53118F]/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-3xl font-bold text-[#FBFAEE] mb-2 flex items-center">
                <Sparkles className="w-8 h-8 mr-3 text-[#C488F8]" />
                Quick Actions
              </h3>
              <p className="text-[#FBFAEE]/70">Your daily workflow at a glance</p>
            </div>
            {currentStreak > 0 && (
              <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 px-4 py-2 rounded-full animate-pulse-glow">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-lg font-bold text-orange-300">{currentStreak}</span>
                <span className="text-sm text-orange-300/80">day streak</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily Check-in Card */}
            {needsCheckIn ? (
              <button
                onClick={onCheckIn}
                className="group relative overflow-hidden bg-gradient-to-br from-[#933DC9] to-[#53118F] text-[#FBFAEE] p-6 rounded-2xl hover:brightness-110 transition-all shadow-xl hover:shadow-2xl hover:shadow-[#933DC9]/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white/20 p-4 rounded-xl group-hover:scale-110 transition-transform">
                      <Calendar className="w-7 h-7" />
                    </div>
                    <div className="text-left">
                      <div className="text-xl font-bold mb-1">Daily Check-in</div>
                      <div className="text-sm text-[#FBFAEE]/90">Set today's commitment</div>
                    </div>
                  </div>
                  <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
                </div>
                <div className="absolute top-3 right-3">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                  </span>
                </div>
              </button>
            ) : needsReview ? (
              <button
                onClick={onReviewCommitment}
                className="group relative overflow-hidden bg-gradient-to-br from-orange-600 to-red-600 text-[#FBFAEE] p-6 rounded-2xl hover:brightness-110 transition-all shadow-xl hover:shadow-2xl hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white/20 p-4 rounded-xl group-hover:scale-110 transition-transform animate-pulse">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <div className="text-left">
                      <div className="text-xl font-bold mb-1">Review Commitment</div>
                      <div className="text-sm text-[#FBFAEE]/90">Did you ship it?</div>
                    </div>
                  </div>
                  <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
                </div>
                <div className="absolute top-3 right-3 text-3xl animate-bounce">⚠️</div>
              </button>
            ) : (
              <div className="bg-[#000000]/40 border border-[#242424]/50 p-6 rounded-2xl hover-lift">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="bg-gradient-to-br from-green-600 to-emerald-500 p-3 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-[#FBFAEE]" />
                  </div>
                  <div className="text-lg font-bold text-[#FBFAEE]">Today's Check-in</div>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-[#FBFAEE]/70">Commitment set</span>
                </div>
                <p className="text-sm text-[#FBFAEE]/60 italic line-clamp-2 bg-[#000000]/30 p-3 rounded-lg border border-[#242424]/30 mt-2">
                  "{todayCommitment?.commitment}"
                </p>
              </div>
            )}

            {/* Goals Quick Access */}
            <button
              onClick={onViewGoals}
              className="group bg-[#242424] border border-[#242424]/60 hover:border-[#933DC9]/50 p-6 rounded-2xl hover:bg-[#000000]/40 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] card-hover"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] p-4 rounded-xl group-hover:scale-110 transition-transform">
                    <Target className="w-7 h-7 text-[#FBFAEE]" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold text-[#FBFAEE] mb-1">Your Goals</div>
                    <div className="text-sm text-[#FBFAEE]/60 flex items-center space-x-2">
                      <Award className="w-4 h-4" />
                      <span>{activeGoalsCount} active goals</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-[#FBFAEE]/60 group-hover:translate-x-2 group-hover:text-[#FBFAEE] transition-all" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[#FBFAEE]/70 mb-1">
                  <span className="font-medium">Average Progress</span>
                  <span className="font-bold text-[#C488F8]">{goalsProgress.toFixed(0)}%</span>
                </div>
                <div className="relative w-full bg-[#000000]/50 rounded-full h-3 overflow-hidden border border-[#242424]/40">
                  <div
                    className="h-full bg-gradient-to-r from-[#933DC9] to-[#53118F] transition-all duration-1000 rounded-full relative overflow-hidden"
                    style={{ width: `${goalsProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              </div>
            </button>

            {/* Chat Quick Access */}
            <button
              onClick={onChat}
              className="group bg-[#242424] border border-[#242424]/60 hover:border-[#933DC9]/50 p-6 rounded-2xl hover:bg-[#000000]/40 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] card-hover"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] p-4 rounded-xl group-hover:scale-110 transition-transform relative">
                    <MessageCircle className="w-7 h-7 text-[#FBFAEE]" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#242424] animate-pulse"></div>
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold text-[#FBFAEE] mb-1">Chat with AI</div>
                    <div className="text-sm text-[#FBFAEE]/60">Get instant advice</div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-[#FBFAEE]/60 group-hover:translate-x-2 group-hover:text-[#FBFAEE] transition-all" />
              </div>
            </button>

            {/* Activity Overview */}
            <div className="bg-[#242424] border border-[#242424]/60 p-6 rounded-2xl hover-lift">
              <div className="flex items-center space-x-4 mb-4">
                <div className="bg-gradient-to-br from-[#933DC9]/20 to-[#53118F]/20 p-3 rounded-xl border border-[#933DC9]/30">
                  <Activity className="w-6 h-6 text-[#C488F8]" />
                </div>
                <div className="text-lg font-bold text-[#FBFAEE]">Recent Activity</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-[#000000]/30 p-3 rounded-lg border border-[#242424]/30">
                  <span className="text-sm text-[#FBFAEE]/70">Check-ins this week</span>
                  <span className="font-bold text-[#FBFAEE] text-lg">{data.stats.total_checkins}/7</span>
                </div>
                <div className="flex justify-between items-center bg-[#000000]/30 p-3 rounded-lg border border-[#242424]/30">
                  <span className="text-sm text-[#FBFAEE]/70">Success rate</span>
                  <span className="font-bold text-green-400 text-lg">{data.stats.success_rate.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats with Trends */}
      <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-[#FBFAEE] flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-[#933DC9]" />
            Performance Overview
          </h3>
          {previousStats && (
            <div className="text-xs text-[#FBFAEE]/60 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              vs. previous 7 days
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Success Rate */}
          <div className="bg-gradient-to-br from-[#000000]/60 to-[#000000]/40 rounded-xl p-5 border border-[#242424]/40 hover-lift relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#FBFAEE]/70 font-medium">Success Rate</span>
                {previousStats && (() => {
                  const trend = getTrendIndicator(
                    data.stats.success_rate,
                    previousStats.success_rate
                  )
                  const Icon = trend.icon
                  return (
                    <div className={`flex items-center space-x-1 text-xs ${trend.color} font-bold`}>
                      <Icon className="w-4 h-4" />
                      <span>{trend.text}</span>
                    </div>
                  )
                })()}
              </div>
              <div className="text-4xl font-bold text-[#FBFAEE] mb-3">
                {data.stats.success_rate.toFixed(0)}%
              </div>
              <div className="relative w-full bg-[#000000]/50 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-emerald-500 rounded-full transition-all duration-1000 relative overflow-hidden"
                  style={{ width: `${data.stats.success_rate}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Average Energy */}
          <div className="bg-gradient-to-br from-[#000000]/60 to-[#000000]/40 rounded-xl p-5 border border-[#242424]/40 hover-lift relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#933DC9]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#FBFAEE]/70 font-medium">Avg Energy</span>
                {previousStats && (() => {
                  const trend = getTrendIndicator(
                    data.stats.avg_energy,
                    previousStats.avg_energy
                  )
                  const Icon = trend.icon
                  return (
                    <div className={`flex items-center space-x-1 text-xs ${trend.color} font-bold`}>
                      <Icon className="w-4 h-4" />
                      <span>{trend.text}</span>
                    </div>
                  )
                })()}
              </div>
              <div className="flex items-baseline space-x-2 mb-3">
                <span className="text-4xl font-bold text-[#FBFAEE]">
                  {data.stats.avg_energy.toFixed(1)}
                </span>
                <span className="text-xl text-[#FBFAEE]/60">/10</span>
              </div>
              <div className="relative w-full bg-[#000000]/50 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#933DC9] to-[#53118F] rounded-full transition-all duration-1000 relative overflow-hidden"
                  style={{ width: `${data.stats.avg_energy * 10}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
          </div>

          {/* GitHub Activity */}
          <div className="bg-gradient-to-br from-[#000000]/60 to-[#000000]/40 rounded-xl p-5 border border-[#242424]/40 hover-lift relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#FBFAEE]/70 font-medium">Active Repos</span>
                <Github className="w-4 h-4 text-[#FBFAEE]/60" />
              </div>
              <div className="flex items-baseline space-x-2 mb-3">
                <span className="text-4xl font-bold text-[#FBFAEE]">
                  {data.github.active_repos}
                </span>
                <span className="text-xl text-[#FBFAEE]/60">/{data.github.total_repos}</span>
              </div>
              <div className="relative w-full bg-[#000000]/50 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-emerald-500 rounded-full transition-all duration-1000 relative overflow-hidden"
                  style={{ 
                    width: `${data.github.total_repos > 0 ? (data.github.active_repos / data.github.total_repos * 100) : 0}%` 
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}