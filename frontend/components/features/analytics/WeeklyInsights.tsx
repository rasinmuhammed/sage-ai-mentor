// frontend/components/WeeklyInsights.tsx
'use client'

import { useState, useEffect } from 'react'
import { apiService } from '@/lib/api'
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Loader2, RefreshCw } from 'lucide-react'
import MarkdownRenderer from '../../shared/MarkdownRenderer'

interface Pattern {
  type: string
  severity: string
  message: string
}

interface Insights {
  check_in_frequency: number
  avg_energy: number
  success_rate: number
  consistency_score: number
  detected_patterns: Pattern[]
  recommendations: string[]
}

interface WeeklyInsightsProps {
  githubUsername: string
}

export default function WeeklyInsights({ githubUsername }: WeeklyInsightsProps) {
  const [insights, setInsights] = useState<Insights | null>(null)
  const [report, setReport] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    loadInsights()
    // Refresh every hour
    const interval = setInterval(loadInsights, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [githubUsername])

  const loadInsights = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiService.get(`/insights/${githubUsername}/weekly`)
      setInsights(response.data.metrics)
      setReport(response.data.report)
      setLastUpdated(new Date(response.data.generated_at))
    } catch (err) {
      console.error('Failed to load insights:', err)
      setError('Failed to load weekly insights')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !insights) {
    return (
      <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#933DC9]" />
        <p className="text-[#FBFAEE]/70">Analyzing your week...</p>
      </div>
    )
  }

  if (error || !insights) {
    return (
      <div className="bg-[#242424] border border-red-500/40 rounded-2xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 mb-4">{error || 'No insights available'}</p>
        <button
          onClick={loadInsights}
          className="px-4 py-2 bg-[#933DC9] text-[#FBFAEE] rounded-lg hover:brightness-110 transition"
        >
          Retry
        </button>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreIcon = (score: number) => {
    return score >= 70 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-[#FBFAEE]">Weekly Insights</h3>
          <p className="text-sm text-[#FBFAEE]/60 mt-1">
            Last 7 days • Updated {lastUpdated?.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={loadInsights}
          disabled={loading}
          className="p-2 bg-[#000000]/40 hover:bg-[#000000]/60 rounded-lg transition border border-[#242424]/50 disabled:opacity-50"
          title="Refresh insights"
        >
          <RefreshCw className={`w-5 h-5 text-[#FBFAEE]/70 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Check-in Frequency */}
        <div className="bg-[#242424] border border-[#242424]/50 rounded-xl p-4">
          <div className="text-sm text-[#FBFAEE]/70 mb-1">Check-ins</div>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold text-[#FBFAEE]">
              {insights.check_in_frequency}
            </span>
            <span className="text-[#FBFAEE]/60 text-sm">/7</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-[#242424] border border-[#242424]/50 rounded-xl p-4">
          <div className="text-sm text-[#FBFAEE]/70 mb-1">Success Rate</div>
          <div className="flex items-center space-x-2">
            <span className={`text-3xl font-bold ${getScoreColor(insights.success_rate)}`}>
              {insights.success_rate.toFixed(0)}%
            </span>
            {getScoreIcon(insights.success_rate)}
          </div>
        </div>

        {/* Avg Energy */}
        <div className="bg-[#242424] border border-[#242424]/50 rounded-xl p-4">
          <div className="text-sm text-[#FBFAEE]/70 mb-1">Avg Energy</div>
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-bold text-[#FBFAEE]">
              {insights.avg_energy.toFixed(1)}
            </span>
            <span className="text-[#FBFAEE]/60 text-sm">/10</span>
          </div>
        </div>

        {/* Consistency */}
        <div className="bg-[#242424] border border-[#242424]/50 rounded-xl p-4">
          <div className="text-sm text-[#FBFAEE]/70 mb-1">Consistency</div>
          <div className="flex items-center space-x-2">
            <span className={`text-3xl font-bold ${getScoreColor(insights.consistency_score)}`}>
              {insights.consistency_score.toFixed(0)}
            </span>
            {getScoreIcon(insights.consistency_score)}
          </div>
        </div>
      </div>

      {/* Patterns Detected */}
      {insights.detected_patterns.length > 0 && (
        <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-[#FBFAEE] mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
            Patterns Detected
          </h4>
          <div className="space-y-3">
            {insights.detected_patterns.map((pattern, idx) => {
              const severityColors = {
                high: 'bg-red-900/30 border-red-500/40 text-red-300',
                warning: 'bg-yellow-900/30 border-yellow-500/40 text-yellow-300',
                medium: 'bg-[#933DC9]/20 border-[#933DC9]/40 text-[#C488F8]',
                info: 'bg-blue-900/30 border-blue-500/40 text-blue-300'
              }
              return (
                <div
                  key={idx}
                  className={`${severityColors[pattern.severity as keyof typeof severityColors] || severityColors.info} border rounded-lg p-3`}
                >
                  <p className="text-sm font-medium">{pattern.message}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-[#933DC9]/15 to-[#53118F]/15 border border-[#933DC9]/30 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-[#C488F8] mb-4 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2" />
            AI Recommendations
          </h4>
          <ul className="space-y-3">
            {insights.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-[#C488F8] font-bold mr-3 flex-shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-[#FBFAEE]/90 text-sm">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full Report */}
      <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-[#FBFAEE] mb-4">
          Detailed Analysis
        </h4>
        <MarkdownRenderer content={report} className="text-[#FBFAEE]/90" />
      </div>
    </div>
  )
}