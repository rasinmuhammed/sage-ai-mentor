import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Loader2, Plus, Trash2, Calendar, Flag } from 'lucide-react'
import FirstTimeTooltip from '../onboarding/FirstTimeTooltip'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface CreateGoalModalProps {
  githubUsername: string
  onClose: () => void
  onComplete: () => void
  initialData?: any
}

interface MilestoneData {
  id?: number
  title: string
  description?: string
  target_date: string
  status?: 'new' | 'existing' | 'deleted' | 'updated'
}

export default function CreateGoalModal({ githubUsername, onClose, onComplete, initialData }: CreateGoalModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalType, setGoalType] = useState('career')
  const [priority, setPriority] = useState('high')
  const [targetDate, setTargetDate] = useState('')
  const [successCriteria, setSuccessCriteria] = useState<string[]>([''])
  const [milestones, setMilestones] = useState<MilestoneData[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '')
      setDescription(initialData.description || '')
      setGoalType(initialData.goal_type || 'career')
      setPriority(initialData.priority || 'high')
      setTargetDate(initialData.target_date ? initialData.target_date.split('T')[0] : '')
      if (initialData.success_criteria?.criteria) {
        setSuccessCriteria(initialData.success_criteria.criteria)
      }
      if (initialData.milestones) {
        setMilestones(initialData.milestones.map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          target_date: m.target_date ? m.target_date.split('T')[0] : '',
          status: 'existing'
        })))
      }
    }
  }, [initialData])

  const addCriterion = () => {
    setSuccessCriteria([...successCriteria, ''])
  }

  const updateCriterion = (index: number, value: string) => {
    const updated = [...successCriteria]
    updated[index] = value
    setSuccessCriteria(updated)
  }

  const removeCriterion = (index: number) => {
    setSuccessCriteria(successCriteria.filter((_, i) => i !== index))
  }

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', target_date: '', status: 'new' }])
  }

  const updateMilestone = (index: number, field: keyof MilestoneData, value: string) => {
    const updated = [...milestones]
    updated[index] = { ...updated[index], [field]: value }
    if (updated[index].status === 'existing') {
      updated[index].status = 'updated'
    }
    setMilestones(updated)
  }

  const removeMilestone = (index: number) => {
    const updated = [...milestones]
    if (updated[index].status === 'new') {
      updated.splice(index, 1)
    } else {
      updated[index].status = 'deleted'
    }
    setMilestones(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        title,
        description,
        goal_type: goalType,
        priority,
        target_date: targetDate || null,
        success_criteria: successCriteria.filter(c => c.trim())
      }

      if (initialData) {
        // Update Goal
        await axios.patch(`${API_URL}/goals/${githubUsername}/${initialData.id}`, payload)

        // Handle Milestones
        for (const m of milestones) {
          if (m.status === 'new' && m.title && m.target_date) {
            await axios.post(`${API_URL}/goals/${githubUsername}/${initialData.id}/milestones`, {
              title: m.title,
              description: m.description,
              target_date: m.target_date
            })
          } else if (m.status === 'updated' && m.id) {
            await axios.put(`${API_URL}/goals/${githubUsername}/${initialData.id}/milestones/${m.id}`, {
              title: m.title,
              description: m.description,
              target_date: m.target_date
            })
          } else if (m.status === 'deleted' && m.id) {
            await axios.delete(`${API_URL}/goals/${githubUsername}/${initialData.id}/milestones/${m.id}`)
          }
        }

      } else {
        // Create Goal with Milestones
        const createPayload = {
          ...payload,
          milestones: milestones.filter(m => m.status !== 'deleted' && m.title && m.target_date).map(m => ({
            title: m.title,
            description: m.description,
            target_date: m.target_date
          }))
        }
        await axios.post(`${API_URL}/goals/${githubUsername}`, createPayload)

        // Track onboarding progress only for new goals
        if (typeof window !== 'undefined') {
          const { updateOnboardingProgress } = require('@/lib/onboardingStorage')
          updateOnboardingProgress({ hasCreatedFirstGoal: true })
        }
      }

      // Show success message
      alert('Goal created! The AI Council is now deliberating on your strategy...')
      onComplete()
    } catch (error) {
      console.error('Failed to save goal:', error)
      alert('Failed to save goal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#000000]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#242424] border border-[#242424]/60 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-900/20">
        <div className="flex items-center justify-between p-6 border-b border-[#242424]/60 sticky top-0 bg-[#242424] z-10">
          <h2 className="text-2xl font-bold text-[#FBFAEE]">
            {initialData ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <button onClick={onClose} className="text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition bg-white/5 p-2 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
              Goal Title <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Become a Senior Developer"
                required
              />
              {!initialData && (
                <FirstTimeTooltip
                  id="first_goal_title"
                  title="Think Big"
                  description="Goals should be ambitious but achievable. 'Learn Rust' is better than 'Read a book'."
                  position="top"
                />
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your goal in detail..."
              className="w-full px-4 py-3 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] placeholder-[#FBFAEE]/30 rounded-xl focus:ring-2 focus:ring-[#933DC9] focus:border-transparent resize-none transition-all"
              rows={4}
              required
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">Type</label>
              <div className="relative">
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-xl focus:ring-2 focus:ring-[#933DC9] appearance-none"
                >
                  <option value="career">Career</option>
                  <option value="personal">Personal</option>
                  <option value="financial">Financial</option>
                  <option value="health">Health</option>
                  <option value="learning">Learning</option>
                  <option value="project">Project</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#FBFAEE]/50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">Priority</label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-3 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-xl focus:ring-2 focus:ring-[#933DC9] appearance-none"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#FBFAEE]/50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
              Target Date (Optional)
            </label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
          </div>

          {/* Milestones */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
              Milestones
            </label>
            <div className="space-y-3">
              {milestones.filter(m => m.status !== 'deleted').map((milestone, index) => (
                <div key={index} className="flex items-start space-x-2 group bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="mt-2.5">
                    <Flag className="w-4 h-4 text-[#C488F8]" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={milestone.title}
                      onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                      placeholder="Milestone Title"
                      className="bg-transparent border-none focus:ring-0 p-0 text-sm font-medium placeholder:text-[#FBFAEE]/30 h-auto"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={milestone.target_date}
                        onChange={(e) => updateMilestone(index, 'target_date', e.target.value)}
                        className="bg-black/20 border-white/10 text-xs py-1 h-8 w-auto"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMilestone(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition opacity-50 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={addMilestone}
              className="mt-3 text-[#C488F8] hover:text-[#933DC9]"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Milestone
            </Button>
          </div>

          {/* Success Criteria */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
              Success Criteria
            </label>
            <div className="space-y-3">
              {successCriteria.map((criterion, index) => (
                <div key={index} className="flex items-center space-x-2 group">
                  <Input
                    value={criterion}
                    onChange={(e) => updateCriterion(index, e.target.value)}
                    placeholder="e.g., Lead 2 major projects"
                  />
                  {successCriteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition opacity-50 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={addCriterion}
              className="mt-3 text-[#C488F8] hover:text-[#933DC9]"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Criterion
            </Button>
          </div>

          {/* Submit */}
          <div className="flex space-x-3 pt-6 border-t border-[#242424]/60">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title || !description}
              isLoading={submitting}
              className="flex-1 shadow-lg shadow-purple-900/20"
            >
              {initialData ? 'Save Changes' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}