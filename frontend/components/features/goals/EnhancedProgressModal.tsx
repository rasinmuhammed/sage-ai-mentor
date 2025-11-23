// frontend/components/EnhancedProgressModal.tsx
'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  X, Loader2, CheckCircle, BarChart3, Award, Zap, 
  ChevronDown, ChevronUp, Check, Circle
} from 'lucide-react'
import Confetti from 'react-confetti'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Task {
  id: number
  title: string
  status: string
}

interface SubGoal {
  id: number
  title: string
  tasks: Task[]
}

interface Goal {
  id: number
  title: string
  progress: number
  subgoals: SubGoal[]
}

interface EnhancedProgressModalProps {
  goal: Goal
  githubUsername: string
  onClose: () => void
  onComplete: () => void
}

export default function EnhancedProgressModal({
  goal,
  githubUsername,
  onClose,
  onComplete
}: EnhancedProgressModalProps) {
  const [currentProgress, setCurrentProgress] = useState(goal.progress)
  const [taskStatuses, setTaskStatuses] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {}
    goal.subgoals.forEach(sg => {
      sg.tasks.forEach(task => {
        initial[task.id] = task.status
      })
    })
    return initial
  })
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['pending', 'completed'])
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [celebrationMessage, setCelebrationMessage] = useState('')
  const [lastCompletedTask, setLastCompletedTask] = useState<number | null>(null)

  // Calculate progress from tasks
  const calculateProgress = () => {
    const allTasks = goal.subgoals.flatMap(sg => sg.tasks)
    if (allTasks.length === 0) return currentProgress

    const completed = Object.values(taskStatuses).filter(s => s === 'completed').length
    return (completed / allTasks.length) * 100
  }

  useEffect(() => {
    const newProgress = calculateProgress()
    setCurrentProgress(newProgress)
    checkMilestones(newProgress)
  }, [taskStatuses])

  const checkMilestones = (progress: number) => {
    const milestones = [25, 50, 75, 100]
    const currentMilestone = milestones.find(m => 
      progress >= m && goal.progress < m
    )

    if (currentMilestone) {
      triggerCelebration(currentMilestone)
    }
  }

  const triggerCelebration = (milestone: number) => {
    const messages = {
      25: "🎯 Quarter way there! Keep going!",
      50: "🔥 Halfway done! You're crushing it!",
      75: "⚡ Almost there! The finish line is in sight!",
      100: "🎉 GOAL COMPLETED! Amazing work!"
    }

    setCelebrationMessage(messages[milestone as keyof typeof messages])
    setShowConfetti(true)

    setTimeout(() => {
      setShowConfetti(false)
    }, 5000)
  }

  const toggleTask = (taskId: number) => {
    setTaskStatuses(prev => {
      const newStatus = prev[taskId] === 'completed' ? 'pending' : 'completed'
      
      if (newStatus === 'completed') {
        setLastCompletedTask(taskId)
        setTimeout(() => setLastCompletedTask(null), 600)
      }

      return { ...prev, [taskId]: newStatus }
    })
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const completeAllPending = () => {
    setTaskStatuses(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(taskId => {
        if (updated[Number(taskId)] === 'pending') {
          updated[Number(taskId)] = 'completed'
        }
      })
      return updated
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Update changed tasks
      const updatePromises = Object.entries(taskStatuses)
        .filter(([taskId, status]) => {
          let originalStatus = 'pending'
          goal.subgoals.forEach(sg => {
            const task = sg.tasks.find(t => t.id === Number(taskId))
            if (task) originalStatus = task.status
          })
          return originalStatus !== status
        })
        .map(([taskId, status]) =>
          axios.patch(
            `${API_URL}/goals/${githubUsername}/${goal.id}/tasks/${taskId}`,
            null,
            { params: { status } }
          )
        )

      await Promise.all(updatePromises)

      // Update goal progress
      await axios.post(
        `${API_URL}/goals/${githubUsername}/${goal.id}/progress`,
        {
          progress: currentProgress,
          notes: `Progress updated to ${currentProgress.toFixed(0)}%`,
          mood: 'focused'
        }
      )

      onComplete()
    } catch (err) {
      console.error('Failed to log progress:', err)
      setError('Failed to save progress. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Group tasks by status
  const groupedTasks = goal.subgoals.reduce((acc, subgoal) => {
    subgoal.tasks.forEach(task => {
      const status = taskStatuses[task.id]
      if (!acc[status]) acc[status] = []
      acc[status].push({ ...task, subgoalTitle: subgoal.title })
    })
    return acc
  }, {} as Record<string, any[]>)

  const completedCount = Object.values(taskStatuses).filter(s => s === 'completed').length
  const totalCount = Object.keys(taskStatuses).length
  const pendingCount = totalCount - completedCount

  return (
    <div
      className="fixed inset-0 bg-[#000000]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}

      <div
        className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#242424]/50 flex-shrink-0 bg-gradient-to-r from-[#933DC9]/10 to-[#53118F]/10">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <BarChart3 className="w-6 h-6 text-[#C488F8] flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-[#FBFAEE] truncate">{goal.title}</h3>
              <p className="text-sm text-[#FBFAEE]/70">
                {completedCount} of {totalCount} tasks completed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition flex-shrink-0 ml-4"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Celebration Message */}
        {celebrationMessage && (
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-y border-green-500/40 p-3 text-center animate-in slide-in-from-top duration-500">
            <p className="text-green-300 font-bold text-lg">{celebrationMessage}</p>
          </div>
        )}

        {/* Progress Overview */}
        <div className="p-5 bg-[#000000]/20 border-b border-[#242424]/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#FBFAEE]/90">
              Overall Progress
            </span>
            <span className="text-2xl font-bold text-[#C488F8]">
              {currentProgress.toFixed(0)}%
            </span>
          </div>
          <div className="relative w-full bg-[#000000]/50 rounded-full h-4 overflow-hidden border border-[#242424]/40">
            <div
              className="h-full bg-gradient-to-r from-[#933DC9] to-[#53118F] transition-all duration-1000 flex items-center justify-end pr-2"
              style={{ width: `${currentProgress}%` }}
            >
              {currentProgress > 10 && (
                <span className="text-xs font-bold text-white">
                  {currentProgress.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          
          {/* Milestone Indicators */}
          <div className="flex justify-between mt-2 text-xs">
            {[0, 25, 50, 75, 100].map(milestone => (
              <div
                key={milestone}
                className={`flex flex-col items-center ${
                  currentProgress >= milestone ? 'text-[#C488F8]' : 'text-[#FBFAEE]/40'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mb-1 ${
                  currentProgress >= milestone ? 'bg-[#C488F8]' : 'bg-[#FBFAEE]/40'
                }`}></div>
                <span>{milestone}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body - Task Lists */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* Quick Complete All Button */}
          {pendingCount > 0 && (
            <button
              onClick={completeAllPending}
              className="w-full mb-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold hover:brightness-110 transition flex items-center justify-center space-x-2 shadow-lg"
            >
              <Zap className="w-5 h-5" />
              <span>Mark All {pendingCount} Pending as Complete</span>
            </button>
          )}

          <div className="space-y-4">
            {/* Pending Tasks Section */}
            {groupedTasks.pending && groupedTasks.pending.length > 0 && (
              <div className="bg-[#000000]/30 rounded-xl border border-[#242424]/40 overflow-hidden">
                <button
                  onClick={() => toggleSection('pending')}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#000000]/40 transition"
                >
                  <div className="flex items-center space-x-3">
                    <Circle className="w-5 h-5 text-yellow-400" />
                    <span className="font-semibold text-[#FBFAEE]">
                      Pending Tasks ({groupedTasks.pending.length})
                    </span>
                  </div>
                  {expandedSections.has('pending') ? (
                    <ChevronUp className="w-5 h-5 text-[#FBFAEE]/60" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#FBFAEE]/60" />
                  )}
                </button>
                
                {expandedSections.has('pending') && (
                  <div className="p-4 pt-0 space-y-2">
                    {groupedTasks.pending.map((task: any) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        isCompleted={false}
                        onToggle={() => toggleTask(task.id)}
                        isAnimating={lastCompletedTask === task.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Completed Tasks Section */}
            {groupedTasks.completed && groupedTasks.completed.length > 0 && (
              <div className="bg-[#000000]/30 rounded-xl border border-[#242424]/40 overflow-hidden">
                <button
                  onClick={() => toggleSection('completed')}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#000000]/40 transition"
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="font-semibold text-[#FBFAEE]">
                      Completed Tasks ({groupedTasks.completed.length})
                    </span>
                  </div>
                  {expandedSections.has('completed') ? (
                    <ChevronUp className="w-5 h-5 text-[#FBFAEE]/60" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#FBFAEE]/60" />
                  )}
                </button>
                
                {expandedSections.has('completed') && (
                  <div className="p-4 pt-0 space-y-2">
                    {groupedTasks.completed.map((task: any) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        isCompleted={true}
                        onToggle={() => toggleTask(task.id)}
                        isAnimating={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {totalCount === 0 && (
            <p className="text-center text-[#FBFAEE]/60 py-8">
              No tasks defined for this goal.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-[#242424]/50 bg-[#000000]/20 flex-shrink-0">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex items-center space-x-3 ml-auto">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 bg-[#000000]/40 text-[#FBFAEE]/80 rounded-lg hover:bg-[#000000]/60 transition border border-[#242424]/50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-2.5 rounded-lg font-semibold hover:brightness-110 transition text-sm flex items-center justify-center min-w-[140px] shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Award className="w-5 h-5 mr-2" />
                  Save Progress
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Task Item Component with Animation
function TaskItem({ 
  task, 
  isCompleted, 
  onToggle, 
  isAnimating 
}: { 
  task: any
  isCompleted: boolean
  onToggle: () => void
  isAnimating: boolean
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
        isCompleted
          ? 'bg-green-900/20 hover:bg-green-900/30'
          : 'bg-[#242424]/40 hover:bg-[#242424]/60'
      } ${isAnimating ? 'animate-pulse scale-105' : ''}`}
    >
      {/* Larger, More Satisfying Checkbox */}
      <div
        className={`w-7 h-7 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
          isCompleted
            ? 'bg-gradient-to-r from-green-600 to-emerald-500 border-green-500 scale-110'
            : 'border-[#FBFAEE]/40 hover:border-[#C488F8]'
        }`}
      >
        {isCompleted && (
          <Check className="w-5 h-5 text-white animate-in zoom-in duration-300" />
        )}
      </div>
      
      {/* Task Content */}
      <div className="flex-1 text-left min-w-0">
        <span
          className={`text-sm block transition-all ${
            isCompleted
              ? 'text-green-300 line-through opacity-70'
              : 'text-[#FBFAEE]/90'
          }`}
        >
          {task.title}
        </span>
        <span className="text-xs text-[#FBFAEE]/50">
          {task.subgoalTitle}
        </span>
      </div>
    </button>
  )
}