'use client'

import { useEffect } from 'react'
import { Calendar, CheckCircle, XCircle, Circle, Loader2, AlertCircle } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface CommitmentCalendarProps {
  githubUsername: string
}

export default function CommitmentCalendar({ githubUsername }: CommitmentCalendarProps) {
  const { commitmentCalendar, fetchCommitmentCalendar, loading: contextLoading, error: contextError } = useDashboard()
  const days = commitmentCalendar || []

  useEffect(() => {
    fetchCommitmentCalendar()
  }, [fetchCommitmentCalendar])

  const getDayIcon = (shipped: boolean | null) => {
    if (shipped === true) return <CheckCircle className="w-5 h-5 text-green-400" />
    if (shipped === false) return <XCircle className="w-5 h-5 text-red-400" />
    return <Circle className="w-5 h-5 text-[#FBFAEE]/30" />
  }

  const getDayBgClass = (shipped: boolean | null, commitmentExists: boolean) => {
    if (!commitmentExists) return 'bg-black/20'
    if (shipped === true) return 'bg-green-500/20 hover:bg-green-500/30 border-green-500/30'
    if (shipped === false) return 'bg-red-500/20 hover:bg-red-500/30 border-red-500/30'
    return 'bg-[#933DC9]/20 hover:bg-[#933DC9]/30 border-[#933DC9]/30'
  }

  // Use local loading state only if we have no data yet
  const isLoading = contextLoading && days.length === 0

  return (
    <div className="glass-card rounded-2xl shadow-xl p-6 text-[#FBFAEE] animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#933DC9]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-[#933DC9]/20 transition-all duration-500"></div>

      {/* Header */}
      <div className="flex items-center mb-6 relative z-10">
        <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-2 rounded-lg mr-3 shadow-lg shadow-purple-500/20">
          <Calendar className="w-5 h-5 text-[#FBFAEE]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gradient">Commitment Calendar</h3>
          <p className="text-xs text-[#FBFAEE]/60">Last 4 Weeks Performance</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12 text-[#FBFAEE]/70 flex flex-col items-center">
          <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#933DC9]" />
          <span>Loading calendar...</span>
        </div>
      )}

      {/* Error State */}
      {!isLoading && contextError && days.length === 0 && (
        <div className="text-center py-12 text-red-400 flex flex-col items-center">
          <AlertCircle className="w-8 h-8 mb-2" />
          <span>{contextError}</span>
          <button
            onClick={() => fetchCommitmentCalendar(true)}
            className="mt-4 px-4 py-1 bg-[#933DC9] text-[#FBFAEE] rounded-md text-sm hover:bg-[#7d34ad] transition shadow-lg shadow-purple-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      {!isLoading && days.length > 0 && (
        <div className="grid grid-cols-7 gap-2 md:gap-3 relative z-10">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs text-[#FBFAEE]/50 pb-1 font-medium uppercase tracking-wider">{day}</div>
          ))}

          {days.map((day: any, idx: number) => {
            const commitmentExists = day.commitment !== null
            const dateObj = new Date(day.date + 'T00:00:00')

            const tooltip = commitmentExists
              ? `${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${day.commitment}`
              : `${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: No commitment`

            return (
              <div
                key={idx}
                className={`aspect-square ${getDayBgClass(day.shipped, commitmentExists)} border border-white/5 rounded-xl flex flex-col items-center justify-center p-1 transition-all duration-200 group/day cursor-pointer relative hover:scale-105 hover:shadow-lg`}
                title={tooltip}
              >
                <span className={`text-xs absolute top-1 right-1.5 font-medium ${commitmentExists ? 'text-[#FBFAEE]/80' : 'text-[#FBFAEE]/30'}`}>
                  {dateObj.getDate()}
                </span>

                {commitmentExists && (
                  <div className="mt-1 transform group-hover/day:scale-110 transition-transform">
                    {getDayIcon(day.shipped)}
                  </div>
                )}

                {commitmentExists && day.energy > 0 && (
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 h-1 rounded-full overflow-hidden bg-black/30">
                    <div
                      className={`h-full ${day.energy <= 3 ? 'bg-red-500' : day.energy <= 6 ? 'bg-yellow-500' : 'bg-green-500'} shadow-[0_0_5px_rgba(255,255,255,0.3)]`}
                      style={{ width: `${day.energy * 10}%` }}
                      title={`Energy: ${day.energy}/10`}
                    ></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !contextError && days.length === 0 && (
        <div className="text-center py-12 text-[#FBFAEE]/60">
          No commitment data found for the last month.
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-[#FBFAEE]/70 relative z-10">
        <div className="flex items-center bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
          <CheckCircle className="w-4 h-4 text-green-400 mr-1.5" />
          <span className="text-xs font-medium">Shipped</span>
        </div>
        <div className="flex items-center bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
          <XCircle className="w-4 h-4 text-red-400 mr-1.5" />
          <span className="text-xs font-medium">Missed</span>
        </div>
        <div className="flex items-center bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
          <Circle className="w-4 h-4 text-[#FBFAEE]/30 mr-1.5" />
          <span className="text-xs font-medium">Pending</span>
        </div>
        <div className="flex items-center bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
          <div className="flex space-x-0.5 mr-2">
            <span className="w-1.5 h-3 bg-red-500 rounded-sm"></span>
            <span className="w-1.5 h-3 bg-yellow-500 rounded-sm"></span>
            <span className="w-1.5 h-3 bg-green-500 rounded-sm"></span>
          </div>
          <span className="text-xs font-medium">Energy</span>
        </div>
      </div>
    </div>
  )
}