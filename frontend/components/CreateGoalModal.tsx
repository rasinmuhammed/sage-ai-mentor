'use client'
import { useState } from 'react'
import axios from 'axios'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import FirstTimeTooltip from './FirstTimeTooltip'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function CreateGoalModal({ githubUsername, onClose, onComplete }: any) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalType, setGoalType] = useState('career')
  const [priority, setPriority] = useState('high')
  const [targetDate, setTargetDate] = useState('')
  const [successCriteria, setSuccessCriteria] = useState<string[]>([''])
  const [submitting, setSubmitting] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await axios.post(`${API_URL}/goals/${githubUsername}`, {
        title,
        description,
        goal_type: goalType,
        priority,
        target_date: targetDate || null,
        success_criteria: successCriteria.filter(c => c.trim())
      })

      // Track onboarding progress
      if (typeof window !== 'undefined') {
        const { updateOnboardingProgress } = require('@/lib/onboardingStorage')
        updateOnboardingProgress({ hasCreatedFirstGoal: true })
      }

      onComplete()
    } catch (error) {
      console.error('Failed to create goal:', error)
      alert('Failed to create goal')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#000000]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#242424] border border-[#242424]/60 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#242424]/60">
          <h2 className="text-2xl font-bold text-[#FBFAEE]">Create New Goal</h2>
          <button onClick={onClose} className="text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
              Goal Title <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Become a Senior Developer"
                className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] placeholder-[#FBFAEE]/50 rounded-lg focus:ring-2 focus:ring-[#933DC9] focus:border-transparent"
                required
              />
              <FirstTimeTooltip
                id="first_goal_title"
                title="Think Big"
                description="Goals should be ambitious but achievable. 'Learn Rust' is better than 'Read a book'."
                position="top"
              />
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
              className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] placeholder-[#FBFAEE]/50 rounded-lg focus:ring-2 focus:ring-[#933DC9] focus:border-transparent resize-none"
              rows={4}
              required
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">Type</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg focus:ring-2 focus:ring-[#933DC9]"
              >
                <option value="career">Career</option>
                <option value="personal">Personal</option>
                <option value="financial">Financial</option>
                <option value="health">Health</option>
                <option value="learning">Learning</option>
                <option value="project">Project</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg focus:ring-2 focus:ring-[#933DC9]"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
              Target Date (Optional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-lg focus:ring-2 focus:ring-[#933DC9]"
            />
          </div>

          {/* Success Criteria */}
          <div>
            <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
              Success Criteria
            </label>
            <div className="space-y-2">
              {successCriteria.map((criterion, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={criterion}
                    onChange={(e) => updateCriterion(index, e.target.value)}
                    placeholder="e.g., Lead 2 major projects"
                    className="flex-1 px-4 py-2 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] placeholder-[#FBFAEE]/50 rounded-lg focus:ring-2 focus:ring-[#933DC9]"
                  />
                  {successCriteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      className="p-2 text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCriterion}
              className="mt-2 text-sm text-[#C488F8] hover:text-[#933DC9] flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Criterion
            </button>
          </div>

          {/* Submit */}
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
              disabled={submitting || !title || !description}
              className="flex-1 bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-2.5 rounded-xl font-semibold hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating & Analyzing...
                </>
              ) : (
                'Create Goal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}