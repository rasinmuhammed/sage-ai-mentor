'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Target, Plus, TrendingUp, CheckCircle, Clock,
  MoreVertical, Edit, Trash2, Play, Loader2, X,
  ChevronRight, Award, Filter, Zap
} from 'lucide-react'
import EnhancedProgressModal from './EnhancedProgressModal'
import CreateGoalModal from './CreateGoalModal'
import { useDashboard } from '@/contexts/DashboardContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface GoalsProps {
  githubUsername: string
}

export default function Goals({ githubUsername }: GoalsProps) {
  const { goals, goalsDashboard: dashboard, fetchGoals, loading: contextLoading } = useDashboard()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<any>(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('active')

  useEffect(() => {
    fetchGoals(filterStatus)
  }, [fetchGoals, filterStatus])

  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: 'from-red-600 to-orange-600',
      high: 'from-orange-600 to-yellow-600',
      medium: 'from-[#933DC9] to-[#53118F]',
      low: 'from-gray-600 to-gray-500'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  // Only show loading if we have no goals and context is loading
  if (contextLoading && goals.length === 0) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#933DC9]" />
        <p className="text-[#FBFAEE]/70">Loading your goals...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gradient">Goals</h2>
          <p className="text-[#FBFAEE]/70 mt-1">
            Track your progress and achieve your targets
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition flex items-center space-x-2 shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Dashboard Stats */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4 hover:bg-white/5 transition-colors">
            <div className="text-3xl font-bold text-[#C488F8] mb-1">
              {dashboard.active_goals_count}
            </div>
            <div className="text-xs text-[#FBFAEE]/70 uppercase tracking-wider font-medium">Active Goals</div>
          </div>
          <div className="glass-card rounded-xl p-4 hover:bg-white/5 transition-colors">
            <div className="text-3xl font-bold text-green-400 mb-1">
              {dashboard.completed_goals_count}
            </div>
            <div className="text-xs text-[#FBFAEE]/70 uppercase tracking-wider font-medium">Completed</div>
          </div>
          <div className="glass-card rounded-xl p-4 hover:bg-white/5 transition-colors">
            <div className="text-3xl font-bold text-[#FBFAEE] mb-1">
              {dashboard.average_progress.toFixed(0)}%
            </div>
            <div className="text-xs text-[#FBFAEE]/70 uppercase tracking-wider font-medium">Avg Progress</div>
          </div>
          <div className="glass-card rounded-xl p-4 hover:bg-white/5 transition-colors">
            <div className="text-3xl font-bold text-orange-400 mb-1">
              {Object.keys(dashboard.goals_by_type || {}).length}
            </div>
            <div className="text-xs text-[#FBFAEE]/70 uppercase tracking-wider font-medium">Categories</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-2">
        {['active', 'completed', 'paused'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === status
              ? 'bg-[#933DC9]/20 text-[#C488F8] border border-[#933DC9]/40 shadow-lg shadow-purple-500/10'
              : 'bg-black/20 text-[#FBFAEE]/70 hover:bg-black/40 border border-white/5'
              }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {goals.length === 0 ? (
          <div className="col-span-full text-center py-16 glass-card rounded-2xl">
            <Target className="w-16 h-16 mx-auto mb-4 text-[#FBFAEE]/30" />
            <h3 className="text-xl font-semibold text-[#FBFAEE]/90 mb-2">
              No {filterStatus} goals
            </h3>
            <p className="text-[#FBFAEE]/60 mb-6">
              {filterStatus === 'active'
                ? 'Create your first goal to get started'
                : `You don't have any ${filterStatus} goals`}
            </p>
            {filterStatus === 'active' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl hover:brightness-110 transition font-semibold shadow-lg shadow-purple-500/20"
              >
                Create Your First Goal
              </button>
            )}
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="glass-card rounded-2xl p-5 hover:shadow-xl hover:border-[#933DC9]/40 transition-all cursor-pointer group hover:bg-black/30"
              onClick={() => {
                setSelectedGoal(goal)
                setShowProgressModal(true)
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-[#FBFAEE] mb-1 line-clamp-1 group-hover:text-[#C488F8] transition-colors">
                    {goal.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className={`px-2 py-1 rounded-full bg-gradient-to-r ${getPriorityColor(goal.priority)} text-white font-semibold shadow-sm`}>
                      {goal.priority}
                    </span>
                    <span className="text-[#FBFAEE]/60 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                      {goal.goal_type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle menu
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-[#FBFAEE]/60" />
                </button>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-[#FBFAEE]/60">Progress</span>
                  <span className="text-sm font-bold text-[#C488F8]">
                    {goal.progress?.toFixed(0) || 0}%
                  </span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-2 border border-white/5">
                  <div
                    className="bg-gradient-to-r from-[#933DC9] to-[#53118F] h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(147,61,201,0.5)]"
                    style={{ width: `${goal.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Milestones & Tasks */}
              <div className="mt-4 space-y-3">
                {/* Next Milestone */}
                {goal.milestones && goal.milestones.find((m: any) => !m.achieved) && (
                  <div className="bg-black/20 rounded-lg p-3 border border-white/5 flex items-start space-x-3">
                    <div className="bg-[#933DC9]/20 p-1.5 rounded-md mt-0.5">
                      <Award className="w-4 h-4 text-[#C488F8]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#FBFAEE]/60 uppercase tracking-wider font-medium mb-0.5">Next Milestone</div>
                      <div className="text-sm font-medium text-[#FBFAEE]">
                        {goal.milestones.find((m: any) => !m.achieved).title}
                      </div>
                      <div className="text-xs text-[#FBFAEE]/50 mt-1">
                        Target: {new Date(goal.milestones.find((m: any) => !m.achieved).target_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Subgoals/Tasks Count */}
                {goal.subgoals && goal.subgoals.length > 0 && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[#FBFAEE]/60 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1.5" />
                      Tasks Completed
                    </span>
                    <span className="font-medium text-[#FBFAEE] bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                      {goal.subgoals.filter((sg: any) => sg.status === 'completed').length} / {goal.subgoals.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                {goal.target_date && (
                  <div className="flex items-center space-x-1 text-xs text-[#FBFAEE]/60">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(goal.target_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedGoal(goal)
                    setShowProgressModal(true)
                  }}
                  className="text-xs text-[#C488F8] hover:text-[#933DC9] font-medium flex items-center space-x-1 transition-colors"
                >
                  <span>Update Progress</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Progress Modal */}
      {showProgressModal && selectedGoal && (
        <EnhancedProgressModal
          goal={selectedGoal}
          githubUsername={githubUsername}
          onClose={() => {
            setShowProgressModal(false)
            setSelectedGoal(null)
          }}
          onComplete={() => {
            setShowProgressModal(false)
            setSelectedGoal(null)
            fetchGoals(filterStatus, true)
          }}
        />
      )}

      {showCreateModal && (
        <CreateGoalModal
          githubUsername={githubUsername}
          onClose={() => setShowCreateModal(false)}
          onComplete={() => {
            setShowCreateModal(false)
            fetchGoals(filterStatus, true)
          }}
        />
      )}
    </div>
  )
}