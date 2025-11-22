'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Loader2, Calendar, Brain, AlertCircle, Zap, Target, Flame, History, CheckCircle, XCircle } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'
import FirstTimeTooltip from './FirstTimeTooltip'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface CheckInModalProps {
  githubUsername: string
  onClose: () => void
  onComplete: () => void
  suggestions?: any[]
}

interface CheckIn {
  id: number
  timestamp: string
  energy_level: number
  avoiding_what: string
  commitment: string
  shipped: boolean | null
  excuse: string | null
  mood: string | null
  ai_analysis: string | null
}

export default function CheckInModal({ githubUsername, onClose, onComplete, suggestions = [] }: CheckInModalProps) {
  const [energyLevel, setEnergyLevel] = useState(7)
  const [avoiding, setAvoiding] = useState('')
  const [commitment, setCommitment] = useState('')
  const [mood, setMood] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [step, setStep] = useState(1)
  const [recentCheckins, setRecentCheckins] = useState<CheckIn[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  useEffect(() => {
    loadStreak()
  }, [githubUsername])

  const loadStreak = async () => {
    try {
      const response = await axios.get(`${API_URL}/commitments/${githubUsername}/stats?days=30`)
      setStreak(response.data.current_streak)
    } catch (error) {
      console.error('Failed to load streak:', error)
    }
  }

  const commitmentTemplates = [
    { text: "Ship feature X by 5pm", icon: "🚀", color: "from-blue-600 to-blue-700" },
    { text: "Write 100 lines of code", icon: "💻", color: "from-green-600 to-green-700" },
    { text: "Deploy to production", icon: "🎯", color: "from-purple-600 to-purple-700" },
    { text: "Complete task without refactoring", icon: "⚡", color: "from-orange-600 to-orange-700" }
  ]

  const moodOptions = [
    { emoji: "😤", label: "Determined", value: "determined" },
    { emoji: "😊", label: "Optimistic", value: "optimistic" },
    { emoji: "😐", label: "Neutral", value: "neutral" },
    { emoji: "😰", label: "Anxious", value: "anxious" },
    { emoji: "😫", label: "Overwhelmed", value: "overwhelmed" }
  ]

  const loadRecentCheckins = async () => {
    if (recentCheckins.length > 0 && !showHistory) {
      setShowHistory(true)
      return
    }
    setHistoryLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${API_URL}/checkins/${githubUsername}?limit=7`)
      const sorted = response.data.sort((a: CheckIn, b: CheckIn) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      setRecentCheckins(sorted)
      setShowHistory(true)
    } catch (error) {
      console.error('Failed to load recent check-ins:', error)
      setError("Could not load check-in history.")
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!avoiding.trim() || !commitment.trim()) {
      setError("Please fill in what you're avoiding and your commitment.")
      return
    }
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(`${API_URL}/checkins/${githubUsername}`, {
        energy_level: energyLevel,
        avoiding_what: avoiding,
        commitment: commitment,
        mood: mood || null
      })

      setAiResponse(response.data.ai_response || "Check-in submitted successfully.")

      // Track onboarding progress
      if (typeof window !== 'undefined') {
        const { updateOnboardingProgress } = require('@/lib/onboardingStorage')
        updateOnboardingProgress({ hasCompletedFirstCheckin: true })
      }

      setStep(2)
    } catch (err) {
      console.error('Check-in failed:', err)
      setError('Failed to submit check-in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    onComplete()
    onClose()
  }

  const getEnergyColor = (level: number) => {
    if (level <= 3) return 'from-red-600 to-orange-500'
    if (level <= 6) return 'from-yellow-600 to-amber-500'
    return 'from-green-600 to-emerald-500'
  }

  const getEnergyEmoji = (level: number) => {
    if (level <= 3) return '😫'
    if (level <= 6) return '😐'
    return '😃'
  }

  return (
    <div className="fixed inset-0 bg-[#000000]/95 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 text-[#FBFAEE]">
      <div className="bg-gradient-to-br from-[#242424] via-[#1a1a1a] to-[#242424] border border-[#933DC9]/30 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header with Streak */}
        <div className="relative p-6 border-b border-[#242424]/60 bg-gradient-to-r from-[#933DC9]/10 to-[#53118F]/10">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-3 rounded-2xl shadow-lg">
                <Calendar className="w-7 h-7 text-[#FBFAEE]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#FBFAEE]">Daily Check-in</h2>
                <p className="text-sm text-[#FBFAEE]/70">Let's make today count</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {streak > 0 && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 px-3 py-1.5 rounded-full">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-orange-300">{streak} day streak</span>
                </div>
              )}
              <button
                onClick={loadRecentCheckins}
                className="text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition-colors px-3 py-1.5 hover:bg-[#000000]/30 rounded-lg text-sm flex items-center space-x-1 disabled:opacity-50"
                disabled={historyLoading}
              >
                {historyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
                <span>{showHistory ? 'Hide' : 'History'}</span>
              </button>
              <button
                onClick={onClose}
                className="text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition-colors p-2 hover:bg-[#000000]/30 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {showHistory ? (
            <div className="space-y-3 animate-in fade-in duration-300">
              <h3 className="text-lg font-semibold text-[#FBFAEE] mb-3">Recent Check-ins</h3>
              {historyLoading && <p className="text-[#FBFAEE]/60 text-center">Loading history...</p>}
              {!historyLoading && error && <p className="text-red-400 text-center">{error}</p>}
              {!historyLoading && !error && recentCheckins.length === 0 && <p className="text-[#FBFAEE]/60 text-center">No recent check-ins found.</p>}
              {!historyLoading && !error && recentCheckins.map((checkin) => (
                <div key={checkin.id} className="bg-[#000000]/40 border border-[#242424]/40 rounded-xl p-4 text-sm hover:bg-[#000000]/60 transition">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#242424]/40">
                    <div className="flex items-center space-x-2">
                      <div className={`bg-gradient-to-r ${checkin.energy_level <= 3 ? 'from-red-600 to-orange-500' : checkin.energy_level <= 6 ? 'from-yellow-600 to-amber-500' : 'from-green-600 to-emerald-500'} text-[#FBFAEE] px-2 py-0.5 rounded-md text-xs font-bold shadow-sm`}>
                        {checkin.energy_level}/10
                      </div>
                      <span className="text-xs text-[#FBFAEE]/60">
                        {new Date(checkin.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {checkin.shipped !== null && (
                      <div className={`flex items-center space-x-1 text-xs font-medium px-2 py-0.5 rounded-full border ${checkin.shipped ? 'bg-green-900/40 text-green-300 border-green-500/40' : 'bg-red-900/40 text-red-300 border-red-500/40'}`}>
                        {checkin.shipped ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{checkin.shipped ? 'Shipped' : 'Missed'}</span>
                      </div>
                    )}
                    {checkin.shipped === null && <span className="text-xs text-[#FBFAEE]/40 italic">Pending</span>}
                  </div>
                  <div className="space-y-1">
                    <div><span className="text-[#FBFAEE]/60 text-[11px] uppercase tracking-wide">Commitment:</span> <span className="text-[#FBFAEE]/90 ml-1">{checkin.commitment}</span></div>
                    <div><span className="text-[#FBFAEE]/60 text-[11px] uppercase tracking-wide">Avoiding:</span> <span className="text-[#FBFAEE]/90 ml-1">{checkin.avoiding_what}</span></div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setShowHistory(false)}
                className="w-full mt-4 bg-[#000000]/40 text-[#FBFAEE]/80 py-2.5 rounded-lg font-semibold hover:bg-[#000000]/60 transition border border-[#242424]/50 text-sm"
              >
                Back to New Check-in
              </button>
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-900/40 border border-red-500/50 text-red-300 rounded-lg text-sm flex items-center animate-in slide-in-from-top duration-300">
                  <AlertCircle className="w-4 h-4 mr-2" /> {error}
                </div>
              )}

              {/* Energy Level - Enhanced */}
              <div className="relative">
                <label className="block text-sm font-semibold text-[#FBFAEE]/90 mb-3">
                  Energy Level:
                  <span className={`text-3xl font-bold ml-3 inline-flex items-center gap-2`}>
                    <span className={`bg-gradient-to-r ${getEnergyColor(energyLevel)} bg-clip-text text-transparent`}>
                      {energyLevel}
                    </span>
                    <span className="text-2xl">{getEnergyEmoji(energyLevel)}</span>
                  </span>
                </label>
                <div className="relative pt-1">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                    className="w-full h-3 bg-[#000000]/50 rounded-lg appearance-none cursor-pointer range-lg accent-[#933DC9] hover:accent-[#A35AD4] transition"
                  />
                  <div className="flex justify-between text-xs text-[#FBFAEE]/50 mt-2 px-1">
                    <span>Drained</span>
                    <span>Moderate</span>
                    <span>Energized</span>
                  </div>
                </div>
              </div>

              {/* Mood Selection - Enhanced */}
              <div>
                <label className="block text-sm font-semibold text-[#FBFAEE]/90 mb-2">
                  How are you feeling?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {moodOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMood(option.value)}
                      className={`p-3 rounded-xl text-center transition-all border-2 ${mood === option.value
                        ? 'bg-gradient-to-br from-[#933DC9]/30 to-[#53118F]/30 border-[#933DC9] scale-105 shadow-lg'
                        : 'bg-[#000000]/30 border-[#242424]/60 hover:border-[#933DC9]/50 hover:scale-105'
                        }`}
                    >
                      <div className="text-3xl mb-1">{option.emoji}</div>
                      <div className="text-[10px] text-[#FBFAEE]/70 font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avoiding - Enhanced */}
              <div className={`transition-all ${focusedField === 'avoiding' ? 'ring-2 ring-[#933DC9]/50 rounded-xl' : ''}`}>
                <label className="block text-sm font-semibold text-[#FBFAEE]/90 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-orange-400" />
                  What are you avoiding today? <span className="text-red-400 ml-1">*</span>
                </label>
                <textarea
                  value={avoiding}
                  onChange={(e) => setAvoiding(e.target.value)}
                  onFocus={() => setFocusedField('avoiding')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Be brutally honest. What task makes you uncomfortable?"
                  className="w-full px-4 py-3 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] placeholder-[#FBFAEE]/40 rounded-xl focus:ring-2 focus:ring-[#933DC9] focus:border-[#933DC9] resize-none transition duration-150"
                  rows={2}
                  required
                />
                <p className="text-xs text-[#FBFAEE]/60 mt-2 flex items-start">
                  <Brain className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0 text-[#933DC9]" />
                  Honesty here unlocks better AI feedback
                </p>
              </div>

              {/* Commitment - Enhanced */}
              <div className={`transition-all ${focusedField === 'commitment' ? 'ring-2 ring-[#933DC9]/50 rounded-xl' : ''}`}>
                <label className="block text-sm font-semibold text-[#FBFAEE]/90 mb-2 flex items-center">
                  <Target className="w-4 h-4 mr-2 text-green-400" />
                  What will you ship today? <span className="text-red-400 ml-1">*</span>
                </label>

                {/* Smart Suggestions & Templates */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={`sugg-${idx}`}
                      type="button"
                      onClick={() => setCommitment(suggestion.title)}
                      className={`px-3 py-1.5 bg-gradient-to-r ${suggestion.type === 'Action Plan' ? 'from-[#933DC9] to-[#53118F]' : 'from-orange-600 to-orange-700'} text-[#FBFAEE] text-xs rounded-full transition hover:scale-105 hover:shadow-lg border border-white/20 flex items-center space-x-1 animate-in fade-in slide-in-from-bottom-2 duration-500`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <Zap className="w-3 h-3 text-yellow-300" />
                      <span>{suggestion.title.length > 25 ? suggestion.title.substring(0, 23) + '...' : suggestion.title}</span>
                    </button>
                  ))}

                  {commitmentTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCommitment(template.text)}
                      className={`px-3 py-1.5 bg-gradient-to-r ${template.color} text-[#FBFAEE] text-xs rounded-full transition hover:scale-105 hover:shadow-lg border border-white/20 flex items-center space-x-1 opacity-80 hover:opacity-100`}
                    >
                      <span>{template.icon}</span>
                      <span>{template.text.length > 20 ? template.text.substring(0, 18) + '...' : template.text}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  value={commitment}
                  onChange={(e) => setCommitment(e.target.value)}
                  onFocus={() => setFocusedField('commitment')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Define 'done'. Example: 'Deploy feature X', not 'Work on feature X'"
                  className="w-full px-4 py-3 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] placeholder-[#FBFAEE]/40 rounded-xl focus:ring-2 focus:ring-[#933DC9] focus:border-[#933DC9] resize-none transition duration-150"
                  rows={2}
                />
                <FirstTimeTooltip
                  id="first_checkin_commitment"
                  title="Be Specific"
                  description="Don't say 'work on project'. Say 'implement user auth API endpoint by 5pm'."
                  position="bottom"
                />
                <p className="text-xs text-[#FBFAEE]/60 mt-2 flex items-start">
                  <Zap className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0 text-yellow-400" />
                  Be specific. Vague goals = vague results.
                </p>
              </div>

              {/* Submit Button - Enhanced */}
              <button
                type="submit"
                disabled={loading || !avoiding.trim() || !commitment.trim()}
                className="w-full bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center shadow-xl hover:shadow-[#933DC9]/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Analyzing Your Commitment...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Submit & Get AI Feedback
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-gradient-to-br from-[#933DC9]/15 to-[#53118F]/15 border border-[#933DC9]/30 rounded-2xl p-6 shadow-inner">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] p-3 rounded-xl mr-3 shadow-md">
                    <Brain className="w-6 h-6 text-[#FBFAEE]" />
                  </div>
                  <h3 className="font-bold text-xl text-[#FBFAEE]">AI Analysis</h3>
                </div>
                <div className="prose prose-sm max-w-none text-[#FBFAEE]/90">
                  <MarkdownRenderer content={aiResponse} className="text-[#FBFAEE]/90 text-sm" />
                </div>
              </div>

              <div className="bg-[#000000]/40 border border-[#242424]/40 rounded-xl p-6">
                <h4 className="font-semibold text-[#FBFAEE]/90 mb-3 flex items-center text-base">
                  <Target className="w-5 h-5 mr-2 text-green-400" />
                  Your Commitment for Today
                </h4>
                <div className="bg-[#000000]/30 border border-[#242424]/30 rounded-lg p-4 mb-3">
                  <p className="text-[#FBFAEE] italic text-lg">"{commitment}"</p>
                </div>
                <p className="text-xs text-[#FBFAEE]/70">
                  Remember this goal. We'll check back later. Accountability matters.
                </p>
              </div>

              <button
                onClick={handleModalClose}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-[#FBFAEE] py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Got it. Let's work. 💪
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}