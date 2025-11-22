'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  CheckCircle, XCircle, Clock, Flame, TrendingUp,
  Calendar, ChevronRight, Loader2, AlertCircle // Added AlertCircle
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface CommitmentTrackerProps {
  githubUsername: string
  onReviewComplete: () => void
  onCheckIn: () => void
  suggestions?: any[]
}

interface StreakData {
  current_streak: number
  best_streak: number
  has_checked_in_today: boolean
  at_risk: boolean
  total_days_active: number
  last_checkin_date: string | null
}

export default function CommitmentTracker({
  githubUsername,
  onReviewComplete,
  onCheckIn,
  suggestions = []
}: CommitmentTrackerProps) {
  const [todayCommitment, setTodayCommitment] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [shipped, setShipped] = useState(true)
  const [excuse, setExcuse] = useState('')
  const [streakData, setStreakData] = useState<StreakData>({
    current_streak: 0,
    best_streak: 0,
    has_checked_in_today: false,
    at_risk: false,
    total_days_active: 0,
    last_checkin_date: null
  })


  useEffect(() => {
    loadCommitmentData()
  }, [githubUsername])

  const loadCommitmentData = async () => {
    // MODIFICATION: Renamed `loadData` to `loadCommitmentData` to avoid conflict
    try {
      const [commitmentRes, statsRes, streakRes] = await Promise.all([
        axios.get(`${API_URL}/commitments/${githubUsername}/today`),
        axios.get(`${API_URL}/commitments/${githubUsername}/stats?days=7`), // Always fetch 7-day stats
        axios.get(`${API_URL}/commitments/${githubUsername}/streak-detailed`)
      ])

      setTodayCommitment(commitmentRes.data)
      setStats(statsRes.data)
      setStreakData(streakRes.data)

    } catch (error) {
      console.error('Failed to load commitment data:', error)
    } finally {
      if (loading) setLoading(false)
    }
  }


  const handleReview = async () => {
    if (!todayCommitment?.checkin_id) return

    setReviewing(true)
    try {
      await axios.post(
        `${API_URL}/commitments/${githubUsername}/${todayCommitment.checkin_id}/review`,
        { shipped, excuse: shipped ? null : excuse }
      )
      setShowReviewModal(false)
      await loadCommitmentData() // MODIFICATION: Call renamed function
      onReviewComplete()
    } catch (error) {
      console.error('Failed to review commitment:', error)
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-4">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#933DC9]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Today's Status Card */}
      <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-6 relative overflow-hidden group hover:border-[#933DC9]/30 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#933DC9]/10 rounded-full blur-[50px] -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-sm font-bold text-[#FBFAEE] uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#933DC9]" />
            Daily Commitment
          </h3>
          {todayCommitment?.has_commitment && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${todayCommitment.shipped === true
              ? 'bg-green-900/20 text-green-400 border-green-500/30'
              : todayCommitment.shipped === false
                ? 'bg-red-900/20 text-red-400 border-red-500/30'
                : 'bg-[#933DC9]/10 text-[#C488F8] border-[#933DC9]/30'
              }`}>
              {todayCommitment.shipped === true
                ? 'SHIPPED'
                : todayCommitment.shipped === false
                  ? 'MISSED'
                  : 'IN PROGRESS'}
            </span>
          )}
        </div>

        {todayCommitment?.has_commitment ? (
          <div className="relative z-10">
            <p className="text-lg text-[#FBFAEE] mb-4 font-medium leading-relaxed">
              "{todayCommitment.commitment}"
            </p>

            {todayCommitment.needs_review && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-xl font-bold hover:brightness-110 transition shadow-lg shadow-orange-900/20 flex items-center justify-center space-x-2"
              >
                <Clock className="w-5 h-5" />
                <span>Review Day</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-2 relative z-10">
            <p className="text-[#FBFAEE]/60 text-sm mb-4">No commitment set for today yet.</p>
            <button
              onClick={onCheckIn}
              className="w-full bg-[#FBFAEE] text-black py-3 rounded-xl font-bold hover:bg-white transition shadow-lg shadow-white/10 flex items-center justify-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Flame className="w-5 h-5 text-orange-500" />
              <span>Set Daily Commitment</span>
            </button>
          </div>
        )}
      </div>
      {/* Enhanced Streak Display */}
      <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-2 border-orange-500/50 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Flame className={`w-12 h-12 ${streakData.at_risk
              ? 'text-red-400 animate-pulse'
              : streakData.current_streak > 0
                ? 'text-orange-400'
                : 'text-[#FBFAEE]/30'
              }`} />
            <div>
              <div className="text-5xl font-bold text-[#FBFAEE] mb-1">
                {streakData.current_streak}
              </div>
              <div className="text-sm text-[#FBFAEE]/70">Day Streak</div>
              {streakData.at_risk && (
                <div className="text-xs text-red-300 mt-2 animate-pulse flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Check in today to save your streak!
                </div>
              )}
              {streakData.has_checked_in_today && (
                <div className="text-xs text-green-300 mt-2 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Checked in today ✓
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#FBFAEE]/60 mb-1">
              {streakData.best_streak}
            </div>
            <div className="text-xs text-[#FBFAEE]/50">Personal Best</div>
            <div className="text-xs text-[#FBFAEE]/40 mt-2">
              {streakData.total_days_active} total days
            </div>
          </div>
        </div>

        {/* Streak Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-[#FBFAEE]/60">
            <span>Progress to Personal Best</span>
            <span>{streakData.current_streak}/{streakData.best_streak}</span>
          </div>
          <div className="w-full bg-[#000000]/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${streakData.current_streak === streakData.best_streak
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse'
                : 'bg-gradient-to-r from-orange-500 to-red-500'
                }`}
              style={{
                width: `${streakData.best_streak > 0
                  ? (streakData.current_streak / streakData.best_streak * 100)
                  : 0}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats Card */}
      {stats && (
        <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-[#FBFAEE]/70 mb-3 uppercase tracking-wider">
            7-Day Stats
          </h3>

          <div className="space-y-3">
            {/* --- MODIFICATION: REMOVED CONFLICTING STREAK DISPLAY ---
            {stats.current_streak > 0 && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-sm font-semibold text-[#FBFAEE]">Streak</span>
                </div>
                <span className="text-lg font-bold text-orange-300">
                  {stats.current_streak}
                </span>
              </div>
            )}
            */}

            {/* Success Rate */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#FBFAEE]/60">Success Rate</span>
                <span className="text-sm font-bold text-green-400">
                  {stats.success_rate.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-[#000000]/50 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-green-600 to-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${stats.success_rate}%` }}
                />
              </div>
            </div>

            {/* Shipped/Total */}
            <div className="flex justify-between text-xs pt-2 border-t border-[#242424]/50">
              <span className="text-[#FBFAEE]/60">Shipped</span>
              <span className="font-semibold text-[#FBFAEE]">
                {stats.shipped}/{stats.total_commitments}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#242424] border border-[#242424]/60 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-[#FBFAEE] mb-4">
              Did you ship it?
            </h3>

            <p className="text-sm text-[#FBFAEE]/70 mb-4 italic">
              "{todayCommitment.commitment}"
            </p>

            <div className="flex space-x-3 mb-4">
              <button
                onClick={() => setShipped(true)}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${shipped
                  ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white'
                  : 'bg-[#000000]/40 text-[#FBFAEE]/60 border border-[#242424]/60'
                  }`}
              >
                <CheckCircle className="w-5 h-5 mx-auto mb-1" />
                Yes, Shipped
              </button>
              <button
                onClick={() => setShipped(false)}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${!shipped
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
                  : 'bg-[#000000]/40 text-[#FBFAEE]/60 border border-[#242424]/60'
                  }`}
              >
                <XCircle className="w-5 h-5 mx-auto mb-1" />
                No, Missed
              </button>
            </div>

            {!shipped && (
              <div className="mb-4">
                <label className="block text-sm text-[#FBFAEE]/70 mb-2">
                  What happened?
                </label>
                <textarea
                  value={excuse}
                  onChange={(e) => setExcuse(e.target.value)}
                  placeholder="Be honest..."
                  className="w-full px-4 py-3 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] placeholder-[#FBFAEE]/50 rounded-lg resize-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 px-4 py-2 bg-[#000000]/40 text-[#FBFAEE]/80 rounded-lg hover:bg-[#000000]/60 transition border border-[#242424]/50"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={reviewing}
                className="flex-1 bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-4 py-2 rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {reviewing ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}