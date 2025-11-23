'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Target, Plus, Loader2
} from 'lucide-react'
import EnhancedProgressModal from './EnhancedProgressModal'
import CreateGoalModal from './CreateGoalModal'
import { useDashboard } from '@/contexts/DashboardContext'
import { Button } from '../../ui/Button'
import GoalCard from './GoalCard'

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

  const [editingGoal, setEditingGoal] = useState<any>(null)
  const [activeMenuGoalId, setActiveMenuGoalId] = useState<number | null>(null)

  useEffect(() => {
    fetchGoals(filterStatus)
  }, [fetchGoals, filterStatus])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuGoalId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleDeleteGoal = async (goalId: number) => {
    if (!window.confirm('Are you sure you want to delete this goal? This action cannot be undone.')) return

    try {
      await axios.delete(`${API_URL}/goals/${githubUsername}/${goalId}`)
      fetchGoals(filterStatus, true)
    } catch (error) {
      console.error('Failed to delete goal:', error)
      alert('Failed to delete goal')
    }
  }

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal)
    setShowCreateModal(true)
    setActiveMenuGoalId(null)
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
          onClick={() => {
            setEditingGoal(null)
            setShowCreateModal(true)
          }}
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
              <Button
                onClick={() => {
                  setEditingGoal(null)
                  setShowCreateModal(true)
                }}
                className="shadow-lg shadow-purple-500/20"
              >
                Create Your First Goal
              </Button>
            )}
          </div>
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              activeMenuGoalId={activeMenuGoalId}
              setActiveMenuGoalId={setActiveMenuGoalId}
              onEdit={handleEditGoal}
              onDelete={handleDeleteGoal}
              onSelect={(g) => {
                setSelectedGoal(g)
                setShowProgressModal(true)
              }}
            />
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
          initialData={editingGoal}
          onClose={() => {
            setShowCreateModal(false)
            setEditingGoal(null)
          }}
          onComplete={() => {
            setShowCreateModal(false)
            setEditingGoal(null)
            fetchGoals(filterStatus, true)
          }}
        />
      )}
    </div>
  )
}