'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, BookOpen, TrendingUp, AlertCircle, CheckCircle, Lightbulb, Calendar, X, Loader2, Clock, Filter, Brain, RefreshCw, MoreVertical, Edit, Trash2 } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'
import { useDashboard } from '@/contexts/DashboardContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface LifeDecision {
  id: number
  title: string
  description: string
  decision_type: string
  impact_areas: string[]
  timestamp: string
  time_horizon?: string
  ai_analysis?: string
  lessons_learned?: string[]
}

interface LifeDecisionsProps {
  githubUsername: string
}

export default function LifeDecisions({ githubUsername }: LifeDecisionsProps) {
  const { decisions, fetchDecisions, loading: contextLoading } = useDashboard()

  const [filteredDecisions, setFilteredDecisions] = useState<LifeDecision[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedDecision, setSelectedDecision] = useState<LifeDecision | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterHorizon, setFilterHorizon] = useState<string>('all')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [decisionType, setDecisionType] = useState('major_decision')
  const [timeHorizon, setTimeHorizon] = useState('medium_term')
  const [impactAreas, setImpactAreas] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [reanalyzeError, setReanalyzeError] = useState('')
  const [error, setError] = useState<string | null>(null);

  const [editingDecision, setEditingDecision] = useState<LifeDecision | null>(null)
  const [activeMenuDecisionId, setActiveMenuDecisionId] = useState<number | null>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuDecisionId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleDeleteDecision = async (decisionId: number) => {
    if (!window.confirm('Are you sure you want to delete this decision? This action cannot be undone.')) return

    try {
      await axios.delete(`${API_URL}/life-decisions/${githubUsername}/${decisionId}`)
      await fetchDecisions(true)
    } catch (error) {
      console.error('Failed to delete decision:', error)
      alert('Failed to delete decision')
    }
  }

  const handleEditDecision = (decision: LifeDecision) => {
    setEditingDecision(decision)
    setTitle(decision.title)
    setDescription(decision.description)
    setDecisionType(decision.decision_type)
    setTimeHorizon(decision.time_horizon || 'medium_term')
    setImpactAreas(decision.impact_areas)
    setShowModal(true)
    setActiveMenuDecisionId(null)
  }

  useEffect(() => {
    fetchDecisions()
  }, [fetchDecisions])

  useEffect(() => {
    applyFilters()
  }, [decisions, filterType, filterHorizon])

  const handleReanalyze = async (decisionId: number) => {
    setReanalyzing(true)
    setReanalyzeError('')
    try {
      const response = await axios.post(
        `${API_URL}/life-decisions/${githubUsername}/${decisionId}/reanalyze`
      )
      if (selectedDecision && selectedDecision.id === decisionId) {
        setSelectedDecision({
          ...selectedDecision,
          ai_analysis: response.data.ai_analysis,
          lessons_learned: response.data.lessons_learned
        })
      }
      await fetchDecisions(true) // Refresh the main list
      alert('✅ Analysis complete! The decision has been re-analyzed.')
    } catch (error) {
      console.error('Failed to reanalyze:', error)
      setReanalyzeError('Failed to reanalyze decision.')
      alert('❌ Failed to re-analyze the decision.')
    } finally {
      setReanalyzing(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...decisions]
    if (filterType !== 'all') {
      filtered = filtered.filter(d => d.decision_type === filterType)
    }
    if (filterHorizon !== 'all') {
      filtered = filtered.filter(d => d.time_horizon === filterHorizon)
    }
    setFilteredDecisions(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description || impactAreas.length === 0) {
      alert("Please fill in all required fields.");
      return;
    }
    setSubmitting(true)
    try {
      const payload = {
        title,
        description,
        decision_type: decisionType,
        impact_areas: impactAreas,
        time_horizon: timeHorizon
      }

      if (editingDecision) {
        await axios.put(`${API_URL}/life-decisions/${githubUsername}/${editingDecision.id}`, payload)
      } else {
        await axios.post(`${API_URL}/life-decisions/${githubUsername}`, payload)
      }

      await fetchDecisions(true)
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Failed to save decision:', error)
      alert('Failed to save decision. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDecisionType('major_decision')
    setTimeHorizon('medium_term')
    setImpactAreas([])
    setEditingDecision(null)
  }

  const toggleImpactArea = (area: string) => {
    setImpactAreas(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
    )
  }

  // --- Color & Icon Mappings ---
  const decisionTypeGradients: Record<string, string> = {
    major_decision: 'from-[#933DC9] to-[#53118F]',
    mistake: 'from-red-600 to-orange-600',
    win: 'from-green-600 to-emerald-500',
    pattern: 'from-[#933DC9] to-[#53118F]'
  }

  const decisionTypeIcons: Record<string, React.ReactNode> = {
    major_decision: <TrendingUp className="w-5 h-5" />,
    mistake: <AlertCircle className="w-5 h-5" />,
    win: <CheckCircle className="w-5 h-5" />,
    pattern: <Lightbulb className="w-5 h-5" />
  }

  const timeHorizonStyles: Record<string, string> = {
    short_term: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    medium_term: 'bg-[#933DC9]/10 text-[#C488F8] border-[#933DC9]/20',
    long_term: 'bg-[#53118F]/20 text-[#E1BEE7] border-[#53118F]/30'
  }

  const timeHorizonLabels: Record<string, string> = {
    short_term: 'Short-term (0-6mo)',
    medium_term: 'Medium-term (6-24mo)',
    long_term: 'Long-term (2+ yrs)'
  }

  const impactAreaOptions = [
    'Career', 'Finance', 'Relationships', 'Health',
    'Learning', 'Personal Growth', 'Business', 'Lifestyle'
  ]

  return (
    <div className="space-y-6 text-[#FBFAEE] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* --- Header & Filters --- */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#933DC9]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-[#933DC9]/20 transition-all duration-500"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6 relative z-10">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-4 rounded-2xl shadow-lg mr-4 flex-shrink-0 shadow-purple-500/20">
              <BookOpen className="w-8 h-8 text-[#FBFAEE]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gradient mb-1">Life Decisions Log</h2>
              <p className="text-[#FBFAEE]/70">Track major decisions and learn from them over time</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition-all shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 flex items-center whitespace-nowrap w-full lg:w-auto justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Log Decision
          </button>
        </div>

        {/* Filters Section */}
        <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-center gap-3 border-t border-white/5 pt-4 relative z-10">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Filter className="w-4 h-4 text-[#FBFAEE]/60" />
            <span className="text-sm text-[#FBFAEE]/70 font-medium">Filters:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-black/20 border border-white/10 text-[#FBFAEE]/90 rounded-lg text-sm focus:ring-2 focus:ring-[#933DC9] focus:border-transparent appearance-none hover:bg-black/30 transition-colors cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23FBFAEE' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
          >
            <option value="all">All Types</option>
            <option value="major_decision">Major Decisions</option>
            <option value="mistake">Mistakes</option>
            <option value="win">Wins</option>
            <option value="pattern">Patterns</option>
          </select>
          <select
            value={filterHorizon}
            onChange={(e) => setFilterHorizon(e.target.value)}
            className="px-4 py-2 bg-black/20 border border-white/10 text-[#FBFAEE]/90 rounded-lg text-sm focus:ring-2 focus:ring-[#933DC9] focus:border-transparent appearance-none hover:bg-black/30 transition-colors cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23FBFAEE' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
          >
            <option value="all">All Time Horizons</option>
            <option value="short_term">{timeHorizonLabels.short_term}</option>
            <option value="medium_term">{timeHorizonLabels.medium_term}</option>
            <option value="long_term">{timeHorizonLabels.long_term}</option>
          </select>
          <div className="ml-auto text-sm text-[#FBFAEE]/60 pt-1 sm:pt-0">
            Showing {filteredDecisions.length} of {decisions.length}
          </div>
        </div>
      </div>

      {/* --- Decisions Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {contextLoading && decisions.length === 0 && (
          <div className="col-span-1 lg:col-span-2 text-center py-16 text-[#FBFAEE]/70 flex flex-col items-center glass-card rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#933DC9]" />
            Loading decisions...
          </div>
        )}

        {!contextLoading && error && (
          <div className="col-span-1 lg:col-span-2 text-center py-16 glass-card border-red-500/40 rounded-2xl shadow-xl">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading Decisions</h3>
            <p className="text-[#FBFAEE]/70 text-sm mb-4">{error}</p>
            <button
              onClick={() => fetchDecisions(true)}
              className="px-4 py-1.5 bg-[#933DC9] text-[#FBFAEE] rounded-md text-sm hover:bg-[#7d34ad] transition shadow-lg shadow-purple-500/20"
            >
              Retry
            </button>
          </div>
        )}

        {!contextLoading && !error && filteredDecisions.length === 0 && (
          <div className="col-span-1 lg:col-span-2 text-center py-16 glass-card rounded-2xl shadow-xl">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-[#FBFAEE]/30" />
            <h3 className="text-xl font-semibold text-[#FBFAEE]/90 mb-2">
              {decisions.length === 0 ? 'No decisions logged yet' : 'No decisions match filters'}
            </h3>
            <p className="text-[#FBFAEE]/60 mb-6 max-w-md mx-auto text-sm">
              {decisions.length === 0
                ? 'Start tracking your major life decisions to get AI analysis and extract lessons over time.'
                : 'Try adjusting the filters above or log a new decision.'
              }
            </p>
            {decisions.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-purple-500/20 font-semibold"
              >
                Log Your First Decision
              </button>
            )}
          </div>
        )}

        {!contextLoading && !error && filteredDecisions.length > 0 && (
          filteredDecisions.map(decision => (
            <div
              key={decision.id}
              className="glass-card rounded-2xl shadow-lg p-6 hover:shadow-xl hover:border-[#933DC9]/40 transition-all duration-300 cursor-pointer group flex flex-col justify-between hover:bg-black/30 hover:-translate-y-1"
              onClick={() => setSelectedDecision(decision)}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className={`bg-gradient-to-r ${decisionTypeGradients[decision.decision_type]} text-[#FBFAEE] p-3 rounded-xl flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      {decisionTypeIcons[decision.decision_type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-[#FBFAEE] mb-1 line-clamp-2 group-hover:text-[#C488F8] transition-colors">{decision.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#FBFAEE]/60">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(decision.timestamp).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: '2-digit'
                          })}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{decision.decision_type.replace('_', ' ')}</span>
                        {decision.time_horizon && (
                          <>
                            <span>•</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium border text-[11px] ${timeHorizonStyles[decision.time_horizon]}`}>
                              <Clock className="w-2.5 h-2.5 mr-1" />
                              {timeHorizonLabels[decision.time_horizon]}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu Button */}
                  <div className="relative ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuDecisionId(activeMenuDecisionId === decision.id ? null : decision.id)
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-[#FBFAEE]/60" />
                    </button>

                    {/* Dropdown */}
                    {activeMenuDecisionId === decision.id && (
                      <div className="absolute right-0 top-full mt-2 w-32 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditDecision(decision)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-[#FBFAEE]/80 hover:bg-white/5 hover:text-[#FBFAEE] flex items-center space-x-2 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDecision(decision.id)
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

                <p className="text-[#FBFAEE]/80 text-sm mb-4 line-clamp-2">{decision.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {decision.impact_areas.slice(0, 3).map((area, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-[#933DC9]/10 text-[#C488F8] border border-[#933DC9]/20 rounded-full text-xs font-medium"
                    >
                      {area}
                    </span>
                  ))}
                  {decision.impact_areas.length > 3 && (
                    <span className="px-2.5 py-1 bg-black/20 text-[#FBFAEE]/60 rounded-full text-xs font-medium border border-white/10">
                      +{decision.impact_areas.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {decision.lessons_learned && decision.lessons_learned.length > 0 && (
                <div className="mt-auto pt-3 border-t border-white/5">
                  <div className="flex items-center text-yellow-400 text-xs font-semibold mb-1">
                    <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                    Key Lesson:
                  </div>
                  <p className="text-xs text-[#FBFAEE]/70 line-clamp-1 italic">
                    {decision.lessons_learned[0]}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* --- Add Decision Modal --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col border border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#1A1A1A]/95 backdrop-blur-md z-10 rounded-t-3xl">
              <h2 className="text-2xl font-bold text-gradient">
                {editingDecision ? 'Edit Life Decision' : 'Log Life Decision'}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition-colors p-2 hover:bg-white/10 rounded-lg"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
                  Decision Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Accepted senior developer role at StartupXYZ"
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/10 text-[#FBFAEE] placeholder-[#FBFAEE]/30 rounded-lg focus:ring-2 focus:ring-[#933DC9] focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
                  Description / Context <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the decision, the situation, why you made it, and what you hoped/expected..."
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/10 text-[#FBFAEE] placeholder-[#FBFAEE]/30 rounded-lg focus:ring-2 focus:ring-[#933DC9] focus:border-transparent resize-none transition-all"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
                    Decision Type
                  </label>
                  <select
                    value={decisionType}
                    onChange={(e) => setDecisionType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/10 text-[#FBFAEE]/90 rounded-lg focus:ring-2 focus:ring-[#933DC9] focus:border-transparent transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23FBFAEE' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="major_decision">Major Decision</option>
                    <option value="mistake">Mistake / Learning</option>
                    <option value="win">Win / Success</option>
                    <option value="pattern">Pattern / Insight</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">
                    Time Horizon
                  </label>
                  <select
                    value={timeHorizon}
                    onChange={(e) => setTimeHorizon(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/10 text-[#FBFAEE]/90 rounded-lg focus:ring-2 focus:ring-[#933DC9] focus:border-transparent transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23FBFAEE' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="short_term">{timeHorizonLabels.short_term}</option>
                    <option value="medium_term">{timeHorizonLabels.medium_term}</option>
                    <option value="long_term">{timeHorizonLabels.long_term}</option>
                  </select>
                  <p className="text-xs text-[#FBFAEE]/60 mt-1">
                    Expected timeframe for impact/results.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-2">
                  Impact Areas <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {impactAreaOptions.map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleImpactArea(area)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${impactAreas.includes(area)
                        ? 'bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] border-[#933DC9]/50 shadow-md scale-100 ring-1 ring-[#933DC9]/30'
                        : 'bg-black/30 text-[#FBFAEE]/70 hover:bg-black/50 hover:text-[#FBFAEE]/90 border-white/10'
                        }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
                {impactAreas.length === 0 && (
                  <p className="text-xs text-red-400 mt-1.5">Select at least one impact area.</p>
                )}
              </div>

              <div className="flex space-x-3 pt-4 sticky bottom-0 bg-[#1A1A1A] pb-1 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-6 py-2.5 bg-white/5 text-[#FBFAEE]/80 rounded-xl font-semibold hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title || !description || impactAreas.length === 0}
                  className="flex-1 bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-2.5 rounded-xl font-semibold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-purple-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing & Saving...
                    </>
                  ) : (
                    editingDecision ? 'Save Changes' : 'Log Decision'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Decision Detail Modal --- */}
      {selectedDecision && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col border border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#1A1A1A]/95 backdrop-blur-md z-10 rounded-t-3xl">
              <h2 className="text-2xl font-bold text-[#FBFAEE] line-clamp-1 pr-4">{selectedDecision.title}</h2>
              <button
                onClick={() => setSelectedDecision(null)}
                className="text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition-colors p-2 hover:bg-white/10 rounded-lg flex-shrink-0"
                aria-label="Close detail view"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-x-6 gap-y-3">
                <div className="flex items-center space-x-3">
                  <div className={`bg-gradient-to-r ${decisionTypeGradients[selectedDecision.decision_type]} text-[#FBFAEE] p-3 rounded-xl shadow-md`}>
                    {decisionTypeIcons[selectedDecision.decision_type]}
                  </div>
                  <div>
                    <p className="text-xs text-[#FBFAEE]/60">Decision Type</p>
                    <p className="text-[#FBFAEE] font-semibold capitalize">{selectedDecision.decision_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-black/30 border border-white/10 p-3 rounded-xl shadow-inner">
                    <Calendar className="w-5 h-5 text-[#FBFAEE]/70" />
                  </div>
                  <div>
                    <p className="text-xs text-[#FBFAEE]/60">Date</p>
                    <p className="text-[#FBFAEE] font-semibold">
                      {new Date(selectedDecision.timestamp).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {selectedDecision.time_horizon && (
                  <div className="flex items-center space-x-3">
                    <div className="bg-black/30 border border-white/10 p-3 rounded-xl shadow-inner">
                      <Clock className="w-5 h-5 text-[#FBFAEE]/70" />
                    </div>
                    <div>
                      <p className="text-xs text-[#FBFAEE]/60">Time Horizon</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium border ${timeHorizonStyles[selectedDecision.time_horizon]}`}>
                        {timeHorizonLabels[selectedDecision.time_horizon]}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-black/20 rounded-xl p-5 border border-white/5">
                <h3 className="text-sm font-medium text-[#FBFAEE]/70 mb-2">Description & Context</h3>
                <div className="prose prose-sm max-w-none text-[#FBFAEE]/90">
                  <MarkdownRenderer
                    content={selectedDecision.description}
                    className="text-[#FBFAEE]/90"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[#FBFAEE]/70 mb-2">Impact Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDecision.impact_areas.map((area, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-[#933DC9]/15 text-[#C488F8] border border-[#933DC9]/30 rounded-full text-sm font-medium"
                    >
                      {area}
                    </span>
                  ))}
                  {selectedDecision.impact_areas.length === 0 && (
                    <p className="text-sm text-[#FBFAEE]/60 italic">No impact areas specified.</p>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#933DC9]/10 to-[#53118F]/10 border border-[#933DC9]/20 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#933DC9]/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <h3 className="text-lg font-semibold text-[#C488F8] flex items-center">
                    <Brain className="w-5 h-5 mr-2" />
                    AI Analysis
                  </h3>
                  <button
                    onClick={() => handleReanalyze(selectedDecision.id)}
                    disabled={reanalyzing}
                    className="text-xs text-[#FBFAEE]/60 hover:text-[#FBFAEE] bg-black/20 hover:bg-black/40 border border-white/10 px-3 py-1 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {reanalyzing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                    Re-analyze
                  </button>
                </div>

                {reanalyzeError && <p className="text-xs text-red-400 mb-2">{reanalyzeError}</p>}

                {selectedDecision.ai_analysis && selectedDecision.ai_analysis.length > 0 ? (
                  <div className="prose prose-sm max-w-none text-[#FBFAEE]/90 relative z-10">
                    <MarkdownRenderer
                      content={selectedDecision.ai_analysis}
                      className="text-[#FBFAEE]/90"
                    />
                  </div>
                ) : (
                  <div className="text-center py-4 relative z-10">
                    <p className="text-[#FBFAEE]/60 text-sm mb-3">
                      No AI analysis available for this decision yet.
                    </p>
                    <button
                      onClick={() => handleReanalyze(selectedDecision.id)}
                      disabled={reanalyzing}
                      className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-4 py-1.5 rounded-lg text-sm font-semibold hover:brightness-110 transition disabled:opacity-60 shadow-lg shadow-purple-500/20"
                    >
                      {reanalyzing ? 'Analyzing...' : 'Analyze Now'}
                    </button>
                  </div>
                )}
              </div>

              {selectedDecision.lessons_learned && selectedDecision.lessons_learned.length > 0 ? (
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Key Lessons Learned
                  </h3>
                  <ul className="space-y-3">
                    {selectedDecision.lessons_learned.map((lesson, idx) => (
                      <li key={idx} className="flex items-start bg-black/20 rounded-lg p-3 border border-white/5">
                        <span className="text-yellow-400 mr-3 text-lg font-bold flex-shrink-0 pt-0.5">{idx + 1}.</span>
                        <div className="prose prose-sm max-w-none text-[#FBFAEE]/90 flex-1">
                          <MarkdownRenderer
                            content={lesson}
                            className="text-[#FBFAEE]/90"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-[#FBFAEE]/60 text-sm">No specific lessons extracted yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}