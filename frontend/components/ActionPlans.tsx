import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Target, Calendar, Clock, CheckCircle, Plus, ArrowRight,
  Loader2, ChevronRight, ChevronDown, Filter, X, Flame, Brain, Award,
  AlertCircle, Edit, Trash2, Play, Pause, RefreshCw
} from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'
import { useActionPlansQuery, ActionPlan, DailyTask, Skill, PlanSkillFocus, SkillFocusSummary } from '@/hooks/useActionPlansQuery'
import EditTaskModal from './EditTaskModal'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TaskCardProps {
  task: DailyTask
  planId: number
  githubUsername: string
  onComplete: () => void
  onOptimisticComplete: (taskId: number, updates: Partial<DailyTask>) => void
  onEdit: (task: DailyTask) => void
  onDelete: (taskId: number) => void
}

interface PlanCardProps {
  plan: ActionPlan
  expanded: boolean
  onToggle: () => void
  onRefresh: () => void
}

interface CreatePlanModalProps {
  githubUsername: string
  onClose: () => void
  onComplete: () => void
  initialData?: ActionPlan | null
}

export default function ActionPlans({ githubUsername }: { githubUsername: string }) {
  const { plans, skillFocusSummary, isLoading: contextLoading, invalidate } = useActionPlansQuery(githubUsername)

  const [activePlan, setActivePlan] = useState<ActionPlan | null>(null)
  const [todayTasks, setTodayTasks] = useState<any>(null)
  const [localLoading, setLocalLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [advancingDay, setAdvancingDay] = useState(false)

  const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null)
  const [activeMenuPlanId, setActiveMenuPlanId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null)

  const loadTodayTasks = async (planId: number) => {
    try {
      setLocalLoading(true)
      const response = await axios.get(`${API_URL}/action-plans/${githubUsername}/${planId}/today`)
      setTodayTasks(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setError('Failed to load today\'s tasks')
    } finally {
      setLocalLoading(false)
    }
  }

  const handleOptimisticTaskCompletion = (taskId: number, updates: Partial<DailyTask>) => {
    if (!todayTasks) return

    setTodayTasks((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map((t: DailyTask) =>
          t.id === taskId ? { ...t, ...updates } : t
        )
      }
    })
  }

  const handleAdvanceDay = async () => {
    if (!activePlan) return
    setAdvancingDay(true)
    try {
      const response = await axios.post(`${API_URL}/action-plans/${githubUsername}/${activePlan.id}/advance-day`)

      if (response.data.warning) {
        alert(`Warning: ${response.data.warning}. Incomplete tasks: ${response.data.incomplete_tasks.join(', ')}. Advancing anyway.`);
      } else if (response.data.plan_completed) {
        alert('Plan completed! Congratulations!');
      } else {
        alert(`Advanced to Day ${response.data.current_day}!`);
      }

      invalidate()
      loadTodayTasks(activePlan.id)
    } catch (error) {
      console.error('Failed to advance day:', error)
      alert('Failed to advance day')
    } finally {
      setAdvancingDay(false)
    }
  }

  const handleDeletePlan = async (planId: number) => {
    if (!window.confirm('Are you sure you want to delete this plan? This cannot be undone.')) return
    try {
      await axios.delete(`${API_URL}/action-plans/${githubUsername}/${planId}`)
      invalidate()
      if (activePlan?.id === planId) {
        setActivePlan(null)
        setTodayTasks(null)
      }
    } catch (error) {
      console.error('Failed to delete plan:', error)
      alert('Failed to delete plan')
    }
  }

  const handleEditPlan = (plan: ActionPlan) => {
    setEditingPlan(plan)
    setShowCreateModal(true)
    setActiveMenuPlanId(null)
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!activePlan) return
    if (!window.confirm('Are you sure you want to delete this task?')) return

    try {
      await axios.delete(`${API_URL}/action-plans/${githubUsername}/${activePlan.id}/tasks/${taskId}`)
      loadTodayTasks(activePlan.id)
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert('Failed to delete task')
    }
  }

  const handleRefresh = () => {
    invalidate()
  }

  useEffect(() => {
    if (plans && plans.length > 0) {
      const active = plans.find(p => p.status === 'active') || plans[0]
      setActivePlan(active)
      loadTodayTasks(active.id)
    }
  }, [plans])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuPlanId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  if (contextLoading && plans.length === 0) {
    return (
      <div className="text-center py-16 text-[#FBFAEE]/70">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#933DC9]" />
        <p>Loading your action plans...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card border-red-500/40 rounded-2xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-[#933DC9] text-[#FBFAEE] rounded-lg hover:brightness-110 transition"
        >
          Retry Load
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-[#FBFAEE] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#933DC9]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-[#933DC9]/20 transition-all duration-500"></div>

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-4 rounded-2xl shadow-lg mr-5 shadow-purple-500/20">
              <Target className="w-8 h-8 text-[#FBFAEE]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gradient">Learning Paths</h2>
              <p className="text-[#FBFAEE]/60 mt-1">Structured action plans to master new skills</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingPlan(null)
              setShowCreateModal(true)
            }}
            className="bg-[#FBFAEE] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#FBFAEE]/90 transition flex items-center shadow-lg shadow-white/5 hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Plan
          </button>
        </div>

        {/* Skill Visualization */}
        {skillFocusSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {/* Total Time Card */}
            <div className="bg-black/20 rounded-xl p-5 border border-white/5 backdrop-blur-sm hover:bg-black/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#FBFAEE]/60 uppercase tracking-wider">Total Focus</span>
                <Clock className="w-4 h-4 text-[#C488F8]" />
              </div>
              <div className="text-4xl font-bold text-[#FBFAEE] mb-1">
                {Math.round((skillFocusSummary.total_time || 0) / 60)}<span className="text-lg text-[#FBFAEE]/40 font-normal ml-1">hrs</span>
              </div>
              <div className="text-xs text-[#FBFAEE]/40">Last 7 days</div>
            </div>

            {/* Skills Breakdown */}
            <div className="col-span-2 bg-black/20 rounded-xl p-5 border border-white/5 backdrop-blur-sm flex flex-col justify-center hover:bg-black/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#FBFAEE]/60 uppercase tracking-wider">Skill Distribution</span>
                <span className="text-xs text-[#FBFAEE]/40">{Object.keys(skillFocusSummary.skills).length} active skills</span>
              </div>
              <div className="space-y-3">
                {Object.entries(skillFocusSummary.skills).slice(0, 3).map(([name, data]: [string, any], idx) => (
                  <div key={idx} className="relative">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#FBFAEE]/80 font-medium">{name}</span>
                      <span className="text-[#FBFAEE]/60">{Math.round(data.total_minutes / 60)}h</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#933DC9] to-[#C488F8] h-full rounded-full opacity-80"
                        style={{ width: `${Math.min(100, (data.total_minutes / (skillFocusSummary.total_time || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Today's Tasks Section */}
      {activePlan && todayTasks && (
        <div className="glass-card border-2 border-[#933DC9]/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#933DC9]/10 to-transparent pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] p-3 rounded-xl mr-3 shadow-lg shadow-purple-500/20">
                  <Calendar className="w-6 h-6 text-[#FBFAEE]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#FBFAEE]">Day {todayTasks.day_number} of 30</h3>
                  <p className="text-sm text-[#FBFAEE]/70">{activePlan.focus_area}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-orange-500/10 border border-orange-500/20 px-4 py-1.5 rounded-full">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-orange-300 font-bold text-sm">Focus Day</span>
              </div>
            </div>

            {/* Today's Tasks */}
            <div className="space-y-3 mb-6">
              {todayTasks.tasks.map((task: DailyTask) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  planId={activePlan.id}
                  githubUsername={githubUsername}
                  onComplete={() => loadTodayTasks(activePlan.id)}
                  onOptimisticComplete={handleOptimisticTaskCompletion}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4 pt-4 border-t border-white/5">
              {todayTasks.tasks.every((t: DailyTask) => t.status === 'completed') ? (
                <button
                  onClick={() => handleAdvanceDay()}
                  disabled={advancingDay}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-[#FBFAEE] py-3 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center shadow-lg shadow-green-500/20"
                >
                  {advancingDay ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 mr-2" />}
                  {activePlan.current_day >= 30 ? 'Finalize Plan' : 'Advance to Next Day'}
                </button>
              ) : (
                <div className="flex-1 text-sm text-yellow-300 flex items-center justify-center space-x-2 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                  <span>Complete all tasks to advance to Day {activePlan.current_day + 1}.</span>
                </div>
              )}
            </div>

            {/* Skills to Focus */}
            {todayTasks.skills_to_focus && todayTasks.skills_to_focus.length > 0 && (
              <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/5">
                <h4 className="text-sm font-semibold text-[#FBFAEE]/70 mb-2 flex items-center">
                  <Brain className="w-4 h-4 mr-2 text-[#C488F8]" />
                  Focus Skills Today:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {todayTasks.skills_to_focus.map((skill: Skill, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-[#933DC9]/20 text-[#C488F8] border border-[#933DC9]/40 rounded-full text-xs font-medium">
                      {skill.name} ({Math.round(skill.daily_time)} mins)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans List */}
      <div className="space-y-4">
        {plans.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-2xl">
            <Target className="w-16 h-16 mx-auto mb-4 text-[#FBFAEE]/30" />
            <h3 className="text-xl font-semibold mb-2 text-[#FBFAEE]">No action plans yet</h3>
            <p className="text-[#FBFAEE]/70 mb-6">Create your first 30-day learning plan</p>
            <button
              onClick={() => {
                setEditingPlan(null)
                setShowCreateModal(true)
              }}
              className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition shadow-lg shadow-purple-500/20"
            >
              Create Your First Plan
            </button>
          </div>
        ) : (
          plans.map(plan => (
            <div key={plan.id} className="relative group">
              <PlanCard
                plan={plan}
                expanded={expandedPlan === plan.id}
                onToggle={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                onRefresh={handleRefresh}
              />

              {/* Menu Button */}
              <div className="absolute top-5 right-14 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveMenuPlanId(activeMenuPlanId === plan.id ? null : plan.id)
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-[#FBFAEE]/60" />
                </button>

                {/* Dropdown */}
                {activeMenuPlanId === plan.id && (
                  <div className="absolute right-0 top-full mt-2 w-32 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditPlan(plan)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-[#FBFAEE]/80 hover:bg-white/5 hover:text-[#FBFAEE] flex items-center space-x-2 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePlan(plan.id)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center space-x-2 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePlanModal
          githubUsername={githubUsername}
          initialData={editingPlan}
          onClose={() => {
            setShowCreateModal(false)
            setEditingPlan(null)
          }}
          onComplete={() => {
            setShowCreateModal(false)
            setEditingPlan(null)
            invalidate()
          }}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && activePlan && (
        <EditTaskModal
          task={editingTask}
          planId={activePlan.id}
          githubUsername={githubUsername}
          onClose={() => setEditingTask(null)}
          onComplete={() => {
            setEditingTask(null)
            loadTodayTasks(activePlan.id)
          }}
        />
      )}
    </div>
  )
}

// --- Helper Components ---

function TaskCard({ task, planId, githubUsername, onComplete, onOptimisticComplete, onEdit, onDelete }: TaskCardProps) {
  const [completing, setCompleting] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [timeSpent, setTimeSpent] = useState<string>('')
  const [difficulty, setDifficulty] = useState(3)
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleComplete = async () => {
    if (task.status === 'completed') return

    setCompleting(true)

    // Optimistic update
    onOptimisticComplete(task.id, { status: 'completed' });

    try {
      const response = await axios.post(
        `${API_URL}/action-plans/${githubUsername}/${planId}/tasks/${task.id}/complete`,
        {
          status: 'completed',
          actual_time_spent: parseInt(timeSpent || '0') || task.estimated_time,
          difficulty_rating: difficulty,
          notes: notes
        }
      )
      setFeedback(response.data.feedback)
      setShowFeedback(true)
      onComplete()
    } catch (error) {
      console.error('Failed to complete task:', error)
      // Revert optimistic update
      onOptimisticComplete(task.id, { status: 'pending' });
      alert('Failed to complete task')
    } finally {
      setCompleting(false)
    }
  }

  if (task.status === 'completed') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <h4 className="font-semibold text-[#FBFAEE]">{task.title}</h4>
              <p className="text-xs text-[#FBFAEE]/70">
                Completed • {task.actual_time_spent || task.estimated_time} mins
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showFeedback && feedback) {
    return (
      <div className="glass-card border-[#933DC9]/50 rounded-xl p-4">
        <div className="flex items-center mb-3">
          <Brain className="w-5 h-5 mr-2 text-[#C488F8]" />
          <h4 className="font-semibold text-[#C488F8]">AI Feedback</h4>
        </div>
        <div className="text-sm text-[#FBFAEE]/70 leading-relaxed prose prose-invert max-w-none">
          <MarkdownRenderer content={feedback} />
        </div>
        <button
          onClick={() => setShowFeedback(false)}
          className="mt-3 text-sm text-[#C488F8] hover:text-[#933DC9]"
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="bg-black/20 border border-white/5 rounded-xl p-4 hover:border-[#933DC9]/50 transition-all hover:bg-black/30 group relative">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className="font-semibold text-[#FBFAEE] mb-1 group-hover:text-[#C488F8] transition-colors pr-8">{task.title}</h4>

            {/* Task Menu */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-1 hover:bg-white/10 rounded text-[#FBFAEE]/40 hover:text-[#FBFAEE] transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(task); }}
                    className="w-full px-4 py-2 text-left text-xs text-[#FBFAEE]/80 hover:bg-white/5 hover:text-[#FBFAEE] flex items-center space-x-2"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(task.id); }}
                    className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center space-x-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
              {/* Overlay to close menu */}
              {showMenu && (
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
              )}
            </div>
          </div>

          <p className="text-sm text-[#FBFAEE]/70">{task.description}</p>
          <div className="flex items-center space-x-3 mt-2 text-xs text-[#FBFAEE]/60">
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {task.estimated_time} mins
            </span>
            <span className={`px-2 py-0.5 rounded ${task.difficulty === 'easy' ? 'bg-green-500/10 text-green-300 border border-green-500/20' :
              task.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' :
                'bg-red-500/10 text-red-300 border border-red-500/20'
              }`}>
              {task.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Complete Form */}
      <div className="space-y-3 mt-4 pt-3 border-t border-white/5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#FBFAEE]/60 mb-1">Time Spent (mins)</label>
            <input
              type="number"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder={task.estimated_time.toString()}
              className="w-full px-3 py-2 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg text-sm focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-[#FBFAEE]/60 mb-1">Difficulty (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={difficulty}
              onChange={(e) => setDifficulty(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg text-sm focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#FBFAEE]/60 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you learn? Any challenges?"
            className="w-full px-3 py-2 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg text-sm resize-none focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
            rows={2}
          />
        </div>
        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-[#FBFAEE] py-2 rounded-lg font-semibold transition-all disabled:opacity-50 text-sm flex items-center justify-center shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          {completing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Complete
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function PlanCard({ plan, expanded, onToggle, onRefresh }: PlanCardProps) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:border-[#933DC9]/50 group">
      <div className="p-5 cursor-pointer hover:bg-white/5 transition" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] p-3 rounded-xl shadow-lg shadow-purple-500/10">
              <Target className="w-5 h-5 text-[#FBFAEE]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#FBFAEE] mb-1 group-hover:text-[#C488F8] transition-colors">{plan.title}</h3>
              <p className="text-sm text-[#FBFAEE]/70 mb-2">{plan.focus_area}</p>
              <div className="flex items-center space-x-3 text-xs text-[#FBFAEE]/60">
                <span>Day {plan.current_day}/30</span>
                <span>•</span>
                <span>{plan.completion_percentage.toFixed(0)}% complete</span>
                {plan.status === 'active' && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-300 border border-green-500/20">Active</span>}
              </div>
              <div className="mt-2 w-full bg-black/30 rounded-full h-2 overflow-hidden border border-white/5">
                <div
                  className="bg-gradient-to-r from-[#933DC9] to-[#53118F] h-2 rounded-full transition-all"
                  style={{ width: `${plan.completion_percentage}%` }}
                />
              </div>
            </div>
          </div>
          {expanded ? <ChevronDown className="w-5 h-5 text-[#FBFAEE]/60" /> : <ChevronRight className="w-5 h-5 text-[#FBFAEE]/60" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 bg-black/10">
          {plan.ai_analysis && (
            <div className="bg-black/20 rounded-xl p-4 mb-4 border border-white/5">
              <h4 className="text-sm font-semibold text-[#C488F8] mb-2 flex items-center">
                <Brain className="w-4 h-4 mr-2" />
                AI Analysis
              </h4>
              <div className="text-sm text-[#FBFAEE]/70 prose prose-invert max-w-none">
                <MarkdownRenderer content={plan.ai_analysis} />
              </div>
            </div>
          )}

          {plan.skills_to_focus && plan.skills_to_focus.skills && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-[#FBFAEE] mb-2">Focus Skills</h4>
              <div className="flex flex-wrap gap-2">
                {plan.skills_to_focus.skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 bg-[#933DC9]/20 text-[#C488F8] border border-[#933DC9]/40 rounded-full text-xs font-medium">
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 text-xs text-[#FBFAEE]/60 hover:text-[#FBFAEE] mt-3 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Check for updates</span>
          </button>
        </div>
      )}
    </div>
  )
}

function CreatePlanModal({ githubUsername, onClose, onComplete, initialData }: CreatePlanModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [focusArea, setFocusArea] = useState('')
  const [skills, setSkills] = useState('')
  const [skillLevel, setSkillLevel] = useState('beginner')
  const [hoursPerDay, setHoursPerDay] = useState(2)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '')
      setDescription(initialData.description || '')
      setFocusArea(initialData.focus_area || '')
      if (initialData.skills_to_focus && initialData.skills_to_focus.skills) {
        setSkills(initialData.skills_to_focus.skills.map((s: any) => s.name).join(', '))
      } else {
        setSkills('')
      }
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        title,
        description,
        plan_type: '30_day',
        focus_area: focusArea,
        skills_to_learn: skills.split(',').map(s => s.trim()).filter(s => s),
        current_skill_level: skillLevel,
        available_hours_per_day: hoursPerDay
      }

      if (initialData) {
        await axios.put(`${API_URL}/action-plans/${githubUsername}/${initialData.id}`, payload)
      } else {
        await axios.post(`${API_URL}/action-plans/${githubUsername}`, payload)
      }

      onComplete()
    } catch (error) {
      console.error('Failed to save plan:', error)
      alert('Failed to save plan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="glass-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-gradient">
            {initialData ? 'Edit Action Plan' : 'Create 30-Day Action Plan'}
          </h2>
          <button onClick={onClose} className="text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-2">
              Plan Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Backend Development Mastery"
              className="w-full px-4 py-2.5 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
              required
            />
          </div>

          {/* Focus Area */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-2">
              Focus Area <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="e.g., Backend Development, System Design"
              className="w-full px-4 py-2.5 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
              required
            />
          </div>

          {/* Skills to Learn */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-2">
              Skills to Learn <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g., Node.js, PostgreSQL, Docker (comma-separated)"
              className="w-full px-4 py-2.5 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
              required
            />
          </div>

          {/* Level and Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-2">Current Level</label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all appearance-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-2">Hours/Day</label>
              <input
                type="number"
                min="0.5"
                max="8"
                step="0.5"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do you want to achieve in 30 days?"
              className="w-full px-4 py-2.5 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg resize-none focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 bg-white/5 text-[#FBFAEE]/80 rounded-xl font-semibold hover:bg-white/10 transition border border-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title || !focusArea || !skills}
              className="flex-1 bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-2.5 rounded-xl font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-purple-500/20"
            >
              {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : (initialData ? 'Save Changes' : 'Generate Plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}