import { useState } from 'react'
import { MOOD_OPTIONS, COMMITMENT_TEMPLATES, TAILWIND_CLASSES } from '@/lib/constants'
import Button from '@/components/common/Button'
import { Zap, Target, Brain } from 'lucide-react'

interface CheckInFormProps {
  onSubmit: (data: CheckInData) => Promise<void>
  isLoading?: boolean
}

export interface CheckInData {
  energy_level: number
  avoiding_what: string
  commitment: string
  mood: string
}

export default function CheckInForm({ onSubmit, isLoading }: CheckInFormProps) {
  const [formData, setFormData] = useState<CheckInData>({
    energy_level: 5,
    avoiding_what: '',
    commitment: '',
    mood: 'neutral'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Energy Level */}
      <div>
        <label className="block text-sm font-semibold text-[#FBFAEE]/90 mb-3">
          Energy Level (1-10)
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={formData.energy_level}
          onChange={(e) => setFormData({ ...formData, energy_level: parseInt(e.target.value) })}
          className="w-full cursor-pointer"
        />
        <div className="text-center mt-2 text-[#FBFAEE]/70">
          {formData.energy_level}/10
        </div>
      </div>

      {/* What are you avoiding? */}
      <div>
        <label className="block text-sm font-semibold text-[#FBFAEE]/90 mb-2 flex items-center">
          <Brain className="w-4 h-4 mr-2 text-[#C488F8]" />
          What are you avoiding? <span className="text-red-400 ml-1">*</span>
        </label>
        <textarea
          value={formData.avoiding_what}
          onChange={(e) => setFormData({ ...formData, avoiding_what: e.target.value })}
          placeholder="Be specific. What task or responsibility are you putting off?"
          className={TAILWIND_CLASSES.input}
          rows={3}
          required
        />
      </div>

      {/* Commitment */}
      <div>
        <label className="block text-sm font-semibold text-[#FBFAEE]/90 mb-2 flex items-center">
          <Target className="w-4 h-4 mr-2 text-green-400" />
          What will you ship today? <span className="text-red-400 ml-1">*</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMITMENT_TEMPLATES.map((template) => (
            <button
              key={template.text}
              type="button"
              onClick={() => setFormData({ ...formData, commitment: template.text })}
              className={`px-3 py-1.5 bg-gradient-to-r ${template.color} text-[#FBFAEE] text-xs rounded-full transition hover:scale-105`}
            >
              {template.text}
            </button>
          ))}
        </div>
        <textarea
          value={formData.commitment}
          onChange={(e) => setFormData({ ...formData, commitment: e.target.value })}
          placeholder="What specific, shippable task will you complete?"
          className={TAILWIND_CLASSES.input}
          rows={2}
          required
        />
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-semibold text-[#FBFAEE]/90 mb-2">How are you feeling?</label>
        <div className="grid grid-cols-5 gap-2">
          {MOOD_OPTIONS.map((mood) => (
            <button
              key={mood.value}
              type="button"
              onClick={() => setFormData({ ...formData, mood: mood.value })}
              className={`p-3 rounded-xl text-center transition border-2 ${
                formData.mood === mood.value
                  ? 'bg-gradient-to-br from-[#933DC9]/30 to-[#53118F]/30 border-[#933DC9]'
                  : 'bg-[#000000]/30 border-[#242424]/60 hover:border-[#933DC9]/50'
              }`}
            >
              <div className="text-2xl mb-1">{mood.emoji}</div>
              <div className="text-xs">{mood.label}</div>
            </button>
          ))}
        </div>
      </div>

      <Button variant="primary" type="submit" isLoading={isLoading} className="w-full">
        <Zap className="w-5 h-5" />
        Submit Check-in
      </Button>
    </form>
  )
}