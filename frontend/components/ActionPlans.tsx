import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Target, Calendar, Clock, CheckCircle, Plus, ArrowRight,
  Loader2, ChevronRight, ChevronDown, Filter, X, Flame, Brain, Award,
  AlertCircle, Edit, Trash2, Play, Pause, RefreshCw // Added for completeness
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// --- Interfaces for Type Safety ---

interface Skill {
  name: string
  daily_time: number
  priority: string
}

interface PlanSkillFocus {
  skills: Skill[]
}

interface DailyTask {
  id: number
  day_number: number
  date: string
  title: string
  description: string
  task_type: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimated_time: number // minutes
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  actual_time_spent?: number
  difficulty_rating?: number
  notes?: string
}

interface ActionPlan {
  id: number
  title: string
  description: string
  plan_type: string
  focus_area: string
  status: 'active' | 'completed' | 'paused' | 'abandoned'
  start_date: string
  end_date: string | null
  current_day: number
  completion_percentage: number
  ai_analysis: string
  skills_to_focus: PlanSkillFocus
  milestones: any
  daily_tasks: DailyTask[] // Not always loaded via list endpoint, but useful for detail
}

interface SkillFocusSummary {
  total_time: number
  total_sessions: number
  skills: { [key: string]: any }
}

interface TaskCardProps {
  task: DailyTask
  planId: number
  onComplete: () => void
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
}

// --- Main Component ---

export default function ActionPlans({ githubUsername }: { githubUsername: string }) {
  const [plans, setPlans] = useState<ActionPlan[]>([])
  const [activePlan, setActivePlan] = useState<ActionPlan | null>(null)
  const [todayTasks, setTodayTasks] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null)
  const [skillFocusSummary, setSkillFocusSummary] = useState<SkillFocusSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [advancingDay, setAdvancingDay] = useState(false)

  useEffect(() => {
    loadData()
  }, [githubUsername])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [plansRes, focusRes] = await Promise.all([
        axios.get<ActionPlan[]>(`${API_URL}/action-plans/${githubUsername}`),
        axios.get<SkillFocusSummary>(`${API_URL}/skill-focus/${githubUsername}/summary?days=7`)
      ])
      
      setPlans(plansRes.data)
      setSkillFocusSummary(focusRes.data)
      
      const active = plansRes.data.find(p => p.status === 'active')
      if (active) {
        setActivePlan(active)
        loadTodayTasks(active.id)
      } else {
        setActivePlan(null)
        setTodayTasks(null)
      }
    } catch (error: any) {
      console.error('Failed to load action plans:', error)
      setError('Failed to load action plans.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleAdvanceDay = async (planId: number) => {
    setAdvancingDay(true);
    try {
        const response = await axios.post(`${API_URL}/action-plans/${githubUsername}/${planId}/advance-day`);
        
        // Handle warning if tasks are incomplete but user advances anyway
        if (response.data.warning) {
            alert(`Warning: ${response.data.warning}. Incomplete tasks: ${response.data.incomplete_tasks.join(', ')}. Advancing anyway.`);
        } else if (response.data.plan_completed) {
            alert('Plan completed! Congratulations!');
        } else {
            alert(`Advanced to Day ${response.data.current_day}!`);
        }

        loadData(); // Reload all data to refresh active plan, tasks, and day number
    } catch (error) {
        console.error('Failed to advance day:', error);
        alert('Failed to advance day.');
    } finally {
        setAdvancingDay(false);
    }
  };


  const loadTodayTasks = async (planId: number) => {
    try {
      const response = await axios.get(`${API_URL}/action-plans/${githubUsername}/${planId}/today`)
      setTodayTasks(response.data)
    } catch (error) {
      console.error('Failed to load today tasks:', error)
    }
  }

  if (loading && !error) {
    return (
      <div className="text-center py-16 text-[#FBFAEE]/70">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#933DC9]" />
        <p>Loading your action plans...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-[#242424] border border-red-500/40 rounded-2xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-[#933DC9] text-[#FBFAEE] rounded-lg hover:brightness-110 transition"
        >
          Retry Load
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-[#FBFAEE]">
      {/* Header */}
      <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-4 rounded-2xl shadow-lg mr-4">
              <Target className="w-8 h-8 text-[#FBFAEE]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">30-Day Action Plans</h2>
              <p className="text-[#FBFAEE]/70">Structured learning paths to mastery</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Plan
          </button>
        </div>

        {/* Stats Row */}
        {skillFocusSummary && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#000000]/40 rounded-xl p-4 border border-[#242424]/40">
              <div className="text-3xl font-bold text-[#C488F8] mb-1">
                {Math.round((skillFocusSummary.total_time || 0) / 60)}h
              </div>
              <div className="text-xs text-[#FBFAEE]/70">Total Focus (7d)</div>
            </div>
            <div className="bg-[#000000]/40 rounded-xl p-4 border border-[#242424]/40">
              <div className="text-3xl font-bold text-green-400 mb-1">
                {Object.keys(skillFocusSummary.skills).length}
              </div>
              <div className="text-xs text-[#FBFAEE]/70">Skills Practiced</div>
            </div>
            <div className="bg-[#000000]/40 rounded-xl p-4 border border-[#242424]/40">
              <div className="text-3xl font-bold text-orange-400 mb-1">
                {skillFocusSummary.total_sessions}
              </div>
              <div className="text-xs text-[#FBFAEE]/70">Total Sessions</div>
            </div>
          </div>
        )}
      </div>

      {/* Today's Tasks Section */}
      {activePlan && todayTasks && (
        <div className="bg-gradient-to-br from-[#933DC9]/30 to-[#53118F]/30 border-2 border-[#933DC9]/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] p-3 rounded-xl mr-3">
                <Calendar className="w-6 h-6 text-[#FBFAEE]" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Day {todayTasks.day_number} of 30</h3>
                <p className="text-sm text-[#FBFAEE]/70">{activePlan.focus_area}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-orange-600/20 border border-orange-500/40 px-3 py-1 rounded-full">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 font-bold text-sm">Focus Day</span>
            </div>
          </div>

          {/* Today's Tasks */}
          <div className="space-y-3 mb-4">
            {todayTasks.tasks.map((task: DailyTask) => (
              <TaskCard key={task.id} task={task} planId={activePlan.id} onComplete={loadData} />
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-4 pt-4 border-t border-[#242424]/50">
            {todayTasks.tasks.every((t: DailyTask) => t.status === 'completed') ? (
              <button
                onClick={() => handleAdvanceDay(activePlan.id)}
                disabled={advancingDay}
                className="flex-1 bg-green-600 hover:bg-green-700 text-[#FBFAEE] py-3 rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center"
              >
                {advancingDay ? <Loader2 className="w-5 h-5 animate-spin"/> : <ArrowRight className="w-5 h-5 mr-2" />}
                {activePlan.current_day >= 30 ? 'Finalize Plan' : 'Advance to Next Day'}
              </button>
            ) : (
              <div className="flex-1 text-sm text-yellow-300 flex items-center space-x-2 bg-yellow-900/30 p-3 rounded-xl">
                <AlertCircle className="w-5 h-5"/>
                <span>Complete all tasks to advance to Day {activePlan.current_day + 1}.</span>
              </div>
            )}
          </div>

          {/* Skills to Focus */}
          {todayTasks.skills_to_focus && todayTasks.skills_to_focus.length > 0 && (
            <div className="mt-4 p-4 bg-[#000000]/50 rounded-xl border border-[#242424]/60">
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
      )}

      {/* Plans List */}
      <div className="space-y-4">
        {plans.length === 0 ? (
          <div className="text-center py-16 bg-[#242424] border border-[#242424]/50 rounded-2xl">
            <Target className="w-16 h-16 mx-auto mb-4 text-[#FBFAEE]/30" />
            <h3 className="text-xl font-semibold mb-2 text-[#FBFAEE]">No action plans yet</h3>
            <p className="text-[#FBFAEE]/70 mb-6">Create your first 30-day learning plan</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition"
            >
              Create Your First Plan
            </button>
          </div>
        ) : (
          plans.map(plan => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              expanded={expandedPlan === plan.id}
              onToggle={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
              onRefresh={loadData}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePlanModal
          githubUsername={githubUsername}
          onClose={() => setShowCreateModal(false)}
          onComplete={() => {
            setShowCreateModal(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

// --- Helper Components (Moved from JSX file and typed) ---

function TaskCard({ task, planId, onComplete }: TaskCardProps) {
  const [completing, setCompleting] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [timeSpent, setTimeSpent] = useState<string>('')
  const [difficulty, setDifficulty] = useState(3)
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleComplete = async () => {
    if (task.status === 'completed') return
    
    setCompleting(true)
    try {
      const response = await axios.post(
        `${API_URL}/action-plans/${planId}/tasks/${task.id}/complete`,
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
      alert('Failed to complete task')
    } finally {
      setCompleting(false)
    }
  }

  if (task.status === 'completed') {
    return (
      <div className="bg-green-900/20 border border-green-500/40 rounded-xl p-4">
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
      <div className="bg-[#242424]/80 border border-[#933DC9]/50 rounded-xl p-4">
        <div className="flex items-center mb-3">
          <Brain className="w-5 h-5 mr-2 text-[#C488F8]" />
          <h4 className="font-semibold text-[#C488F8]">AI Feedback</h4>
        </div>
        {/* Using MarkdownRenderer here to display the AI feedback content */}
        <p className="text-sm text-[#FBFAEE]/70 leading-relaxed">{feedback}</p> 
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
    <div className="bg-[#000000]/40 border border-[#242424]/60 rounded-xl p-4 hover:border-[#933DC9]/50 transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-[#FBFAEE] mb-1">{task.title}</h4>
          <p className="text-sm text-[#FBFAEE]/70">{task.description}</p>
          <div className="flex items-center space-x-3 mt-2 text-xs text-[#FBFAEE]/60">
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {task.estimated_time} mins
            </span>
            <span className={`px-2 py-0.5 rounded ${
              task.difficulty === 'easy' ? 'bg-green-900/40 text-green-300 border border-green-500/40' :
              task.difficulty === 'medium' ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-500/40' :
              'bg-red-900/40 text-red-300 border border-red-500/40'
            }`}>
              {task.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Complete Form */}
      <div className="space-y-3 mt-4 pt-3 border-t border-[#242424]/50">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#FBFAEE]/60 mb-1">Time Spent (mins)</label>
            <input
              type="number"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              placeholder={task.estimated_time.toString()}
              className="w-full px-3 py-2 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg text-sm focus:ring-1 focus:ring-[#933DC9]"
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
              className="w-full px-3 py-2 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg text-sm focus:ring-1 focus:ring-[#933DC9]"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#FBFAEE]/60 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you learn? Any challenges?"
            className="w-full px-3 py-2 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg text-sm resize-none focus:ring-1 focus:ring-[#933DC9]"
            rows={2}
          />
        </div>
        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-[#FBFAEE] py-2 rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50 text-sm flex items-center justify-center shadow-md"
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
    <div className="bg-[#242424] border border-[#242424]/60 rounded-2xl overflow-hidden shadow-lg transition-all hover:shadow-xl hover:border-[#933DC9]/50">
      <div className="p-5 cursor-pointer hover:bg-[#000000]/20 transition" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] p-3 rounded-xl">
              <Target className="w-5 h-5 text-[#FBFAEE]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#FBFAEE] mb-1">{plan.title}</h3>
              <p className="text-sm text-[#FBFAEE]/70 mb-2">{plan.focus_area}</p>
              <div className="flex items-center space-x-3 text-xs text-[#FBFAEE]/60">
                <span>Day {plan.current_day}/30</span>
                <span>•</span>
                <span>{plan.completion_percentage.toFixed(0)}% complete</span>
                {plan.status === 'active' && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-300 border border-green-500/40">Active</span>}
              </div>
              <div className="mt-2 w-full bg-[#000000]/50 rounded-full h-2 overflow-hidden border border-[#242424]/40">
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
        <div className="px-5 pb-5 border-t border-[#242424]/50 pt-4">
          {plan.ai_analysis && (
            <div className="bg-[#000000]/40 rounded-xl p-4 mb-4 border border-[#242424]/40">
              <h4 className="text-sm font-semibold text-[#C488F8] mb-2 flex items-center">
                <Brain className="w-4 h-4 mr-2" />
                AI Analysis
              </h4>
              <p className="text-sm text-[#FBFAEE]/70 line-clamp-3">{plan.ai_analysis}</p>
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
            className="flex items-center space-x-2 text-xs text-[#FBFAEE]/60 hover:text-[#FBFAEE] mt-3"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Check for updates</span>
          </button>
        </div>
      )}
    </div>
  )
}

function CreatePlanModal({ githubUsername, onClose, onComplete }: CreatePlanModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [focusArea, setFocusArea] = useState('')
  const [skills, setSkills] = useState('')
  const [skillLevel, setSkillLevel] = useState('beginner')
  const [hoursPerDay, setHoursPerDay] = useState(2)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await axios.post(`${API_URL}/action-plans/${githubUsername}`, {
        title,
        description,
        plan_type: '30_day',
        focus_area: focusArea,
        skills_to_learn: skills.split(',').map(s => s.trim()).filter(s => s),
        current_skill_level: skillLevel,
        available_hours_per_day: hoursPerDay
      })

      onComplete()
    } catch (error) {
      console.error('Failed to create plan:', error)
      alert('Failed to create plan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
      <div className="bg-[#242424] border border-[#242424]/60 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#242424]/60">
          <h2 className="text-2xl font-bold text-[#FBFAEE]">Create 30-Day Action Plan</h2>
          <button onClick={onClose} className="text-[#FBFAEE]/60 hover:text-[#FBFAEE]">
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
              className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9]"
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
              className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9]"
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
              className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9]"
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
                className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9] appearance-none"
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
                className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9]"
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
              className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg resize-none focus:ring-1 focus:ring-[#933DC9]"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 bg-[#000000]/40 text-[#FBFAEE]/80 rounded-xl font-semibold hover:bg-[#000000]/60 transition border border-[#242424]/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title || !focusArea || !skills}
              className="flex-1 bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-2.5 rounded-xl font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
            >
              {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : 'Generate Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}