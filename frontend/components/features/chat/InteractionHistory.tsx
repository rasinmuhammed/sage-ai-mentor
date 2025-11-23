'use client'

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { History, MessageCircle, Calendar, Brain, Filter, X, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle, BarChart, AlertTriangle, Lightbulb, Target } from 'lucide-react' // Added Loader2, AlertCircle, Target
import MarkdownRenderer from '../../shared/MarkdownRenderer' // Ensure this uses #FBFAEE text color

// Assuming API_URL is defined elsewhere or replace with actual URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Interaction {
  id: number
  agent_name: string
  advice: string
  evidence: any // Consider defining a more specific type if possible
  created_at: string
  interaction_type: string
}

interface InteractionHistoryProps {
  githubUsername: string
  limit?: number
}

export default function InteractionHistory({ githubUsername, limit }: InteractionHistoryProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [filteredInteractions, setFilteredInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null); // Added error state
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    loadInteractions()
  }, [githubUsername])

  useEffect(() => {
    applyFilters()
  }, [interactions, filterType])

  const loadInteractions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/advice/${githubUsername}?limit=50`)
      // Assuming response.data is already sorted descending by date from the API
      setInteractions(response.data)
    } catch (error) {
      console.error('Failed to load interactions:', error)
      setError('Failed to load interaction history.');
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    if (filterType === 'all') {
      setFilteredInteractions(interactions)
    } else {
      setFilteredInteractions(interactions.filter(i => i.interaction_type === filterType))
    }
  }

  // --- Color & Icon Mappings ---
  const typeGradients: Record<string, string> = {
    chat: 'from-[#933DC9] to-[#53118F]', // Purple gradient for chat
    checkin: 'from-[#933DC9] to-[#53118F]', // Purple gradient for checkin
    analysis: 'from-[#933DC9] to-[#53118F]', // Purple gradient for analysis
    evening_review: 'from-[#933DC9] to-[#53118F]', // Purple gradient for review
    plan_creation: 'from-[#933DC9] to-[#53118F]', // Purple gradient for plan creation
    default: 'from-[#933DC9] to-[#53118F]' // Default purple gradient
  }

  const typeIcons: Record<string, React.ElementType> = {
    chat: MessageCircle,
    checkin: Calendar,
    analysis: Brain,
    evening_review: CheckCircle, // Example icon for review
    plan_creation: Target, // Target icon for plan creation
    default: Brain // Default icon
  }

  const agentColors: Record<string, string> = {
    'Analyst': 'from-[#933DC9] to-[#53118F]',
    'Psychologist': 'from-[#53118F] to-[#933DC9]',
    'Contrarian': 'from-red-600 to-orange-600', // Keep contrast
    'Strategist': 'from-[#933DC9] to-[#53118F]',
    'Multi-Agent Analysis': 'from-[#933DC9] to-[#53118F]',
    'Multi-Agent Chat': 'from-[#933DC9] to-[#53118F]',
    default: 'from-[#933DC9] to-[#53118F]'
  };

  const agentIcons: Record<string, React.ReactNode> = {
    'Analyst': <BarChart className="w-5 h-5" />,
    'Psychologist': <Brain className="w-5 h-5" />,
    'Contrarian': <AlertTriangle className="w-5 h-5" />,
    'Strategist': <Lightbulb className="w-5 h-5" />, // Changed to Lightbulb
    'Multi-Agent Analysis': <Brain className="w-5 h-5" />,
    'Multi-Agent Chat': <Brain className="w-5 h-5" />,
    default: <Brain className="w-5 h-5" />
  };


  const getDebateFromEvidence = (evidence: any): Array<{ agent: string; perspective: string }> | null => {
    // Look for 'deliberation' or 'agent_debate' keys in evidence
    const debate = evidence?.deliberation || evidence?.agent_debate || evidence?.debate;
    if (Array.isArray(debate)) {
      // Basic validation of structure
      if (debate.every(item => typeof item === 'object' && item !== null && 'agent' in item && 'perspective' in item)) {
        return debate as Array<{ agent: string; perspective: string }>;
      }
    }
    // Check if raw_deliberation exists and use it as a fallback
    const rawDebate = evidence?.raw_deliberation;
    if (Array.isArray(rawDebate)) {
      if (rawDebate.every(item => typeof item === 'object' && item !== null && 'agent' in item && 'output' in item)) {
        // Adapt raw format to expected format
        return rawDebate.map(item => ({ agent: item.agent, perspective: item.output }));
      }
    }
    return null;
  }


  return (
    <div className="space-y-6 text-[#FBFAEE]">
      {/* --- Header & Filters --- */}
      <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
          <div className="flex items-center">
            {/* Header Icon - Using History Icon with Purple Gradient */}
            <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-4 rounded-2xl shadow-lg mr-4 flex-shrink-0">
              <History className="w-8 h-8 text-[#FBFAEE]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-[#FBFAEE] mb-1">Interaction History</h2>
              <p className="text-[#FBFAEE]/70">Complete record of your AI conversations</p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-center gap-3 border-t border-[#242424]/50 pt-4">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Filter className="w-4 h-4 text-[#FBFAEE]/60" />
            <span className="text-sm text-[#FBFAEE]/70 font-medium">Filter by type:</span>
          </div>
          {/* Filter Buttons */}
          {['all', 'chat', 'checkin', 'analysis', 'evening_review', 'plan_creation'].map((type) => ( // Added evening_review and plan_creation
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${filterType === type
                ? 'bg-[#933DC9]/20 text-[#C488F8] border-[#933DC9]/40 shadow-sm ring-1 ring-[#933DC9]/30' // Active state
                : 'bg-[#000000]/40 text-[#FBFAEE]/70 hover:bg-[#000000]/60 hover:text-[#FBFAEE]/90 border-[#242424]/50' // Inactive state
                }`}
            >
              {/* Capitalize and replace underscore */}
              {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
            </button>
          ))}
          {/* Count Display */}
          <div className="ml-auto text-sm text-[#FBFAEE]/60 pt-1 sm:pt-0">
            Showing {filteredInteractions.length} of {interactions.length}
          </div>
        </div>
      </div>

      {/* --- Interactions List --- */}
      <div className="space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-16 bg-[#242424] border border-[#242424]/50 rounded-2xl text-[#FBFAEE]/70 flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-[#933DC9]" />
            Loading interaction history...
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="text-center py-16 bg-[#242424] border border-red-500/40 rounded-2xl shadow-xl">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading History</h3>
            <p className="text-[#FBFAEE]/70 text-sm mb-4">{error}</p>
            <button
              onClick={loadInteractions}
              className="px-4 py-1.5 bg-[#933DC9] text-[#FBFAEE] rounded-md text-sm hover:bg-[#7d34ad] transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredInteractions.length === 0 && (
          <div className="text-center py-16 bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl">
            <History className="w-16 h-16 mx-auto mb-4 text-[#FBFAEE]/30" />
            <h3 className="text-xl font-semibold text-[#FBFAEE]/90 mb-2">
              {interactions.length === 0 ? 'No interactions yet' : 'No interactions match filters'}
            </h3>
            <p className="text-[#FBFAEE]/60 text-sm max-w-md mx-auto">
              {interactions.length === 0
                ? 'Start chatting with Reflog or complete a check-in to build your interaction history.'
                : 'Try adjusting the filters above to see different types of interactions.'
              }
            </p>
          </div>
        )}

        {/* Interaction Cards */}
        {!loading && !error && filteredInteractions.length > 0 && (
          filteredInteractions.slice(0, limit || filteredInteractions.length).map((interaction) => {
            const Icon = typeIcons[interaction.interaction_type] || typeIcons.default;
            const gradient = typeGradients[interaction.interaction_type] || typeGradients.default;
            const isExpanded = expandedId === interaction.id;
            const debate = getDebateFromEvidence(interaction.evidence);

            return (
              <div
                key={interaction.id}
                className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden" // Added overflow hidden
              >
                {/* Collapsible Header */}
                <div className="p-5 cursor-pointer hover:bg-[#000000]/20" onClick={() => setExpandedId(isExpanded ? null : interaction.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      {/* Interaction Type Icon */}
                      <div className={`bg-gradient-to-r ${gradient} text-[#FBFAEE] p-2.5 rounded-lg flex-shrink-0 shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {/* Agent Name, Date, Preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                          <h3 className="text-base font-semibold text-[#FBFAEE] line-clamp-1 mr-2">{interaction.agent_name}</h3>
                          <span className="text-xs text-[#FBFAEE]/60 flex-shrink-0 mt-1 sm:mt-0">
                            {new Date(interaction.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {/* Interaction Type Tag */}
                        <div className="mb-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium border ${interaction.interaction_type === 'chat' ? 'bg-[#933DC9]/15 text-[#C488F8] border-[#933DC9]/30' :
                            interaction.interaction_type === 'checkin' ? 'bg-[#933DC9]/15 text-[#C488F8] border-[#933DC9]/30' : // Using same purple style
                              interaction.interaction_type === 'analysis' ? 'bg-[#933DC9]/15 text-[#C488F8] border-[#933DC9]/30' : // Using same purple style
                                'bg-[#933DC9]/15 text-[#C488F8] border-[#933DC9]/30' // Default purple style
                            }`}>
                            {interaction.interaction_type.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                        {/* Advice Preview (only shown when collapsed) */}
                        {!isExpanded && (
                          <div className="text-[#FBFAEE]/80 text-sm leading-relaxed line-clamp-2">
                            <MarkdownRenderer content={interaction.advice} className="text-[#FBFAEE]/80 text-sm" />
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Chevron Icon */}
                    <div className="pt-1 flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-[#FBFAEE]/60" /> : <ChevronDown className="w-5 h-5 text-[#FBFAEE]/60" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-[#242424]/50 animate-in fade-in duration-300">
                    {/* Full Advice */}
                    <div className="prose prose-sm max-w-none text-[#FBFAEE]/90 mb-4">
                      <MarkdownRenderer content={interaction.advice} className="text-[#FBFAEE]/90 text-sm" />
                    </div>

                    {/* Context/Evidence Section */}
                    {interaction.evidence && Object.keys(interaction.evidence).length > 0 && (
                      <div className="mt-4 p-4 bg-[#000000]/40 rounded-xl border border-[#242424]/40">
                        <h4 className="text-xs font-semibold text-[#FBFAEE]/60 mb-2 uppercase tracking-wider">Context & Evidence</h4>
                        {interaction.evidence.user_message && (
                          <div className="mb-2 p-2 bg-[#933DC9]/10 border border-[#933DC9]/20 rounded-lg">
                            <p className="text-[11px] text-[#FBFAEE]/60 mb-0.5">Your Question:</p>
                            <p className="text-xs text-[#FBFAEE]/80 italic">"{interaction.evidence.user_message}"</p>
                          </div>
                        )}
                        {/* Display Check-in Details Nicely */}
                        {interaction.evidence.checkin && (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-[#FBFAEE]/60">Energy:</span> <span className="text-[#FBFAEE]/80 font-medium">{interaction.evidence.checkin.energy_level}/10</span></div>
                            <div className="flex justify-between"><span className="text-[#FBFAEE]/60">Avoiding:</span> <span className="text-[#FBFAEE]/80 text-right max-w-[70%] truncate">{interaction.evidence.checkin.avoiding_what}</span></div>
                            <div className="flex justify-between"><span className="text-[#FBFAEE]/60">Commitment:</span> <span className="text-[#FBFAEE]/80 text-right max-w-[70%] truncate">{interaction.evidence.checkin.commitment}</span></div>
                          </div>
                        )}
                        {/* Fallback for other evidence types */}
                        {!interaction.evidence.user_message && !interaction.evidence.checkin && (
                          <pre className="text-[10px] text-[#FBFAEE]/50 bg-[#000]/30 p-2 rounded overflow-x-auto max-h-20"><code>{JSON.stringify(interaction.evidence, null, 2)}</code></pre>
                        )}
                      </div>
                    )}

                    {/* View Debate Button (if applicable) */}
                    {debate && (
                      <div className="mt-3 text-right">
                        <button
                          onClick={() => setSelectedInteraction(interaction)}
                          className="flex items-center space-x-1.5 text-xs text-[#C488F8] hover:text-[#933DC9] transition bg-[#933DC9]/10 hover:bg-[#933DC9]/20 border border-[#933DC9]/30 px-2.5 py-1 rounded-md ml-auto"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          <span>View Agent Debate</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* --- Agent Debate Modal --- */}
      {selectedInteraction && (
        <div className="fixed inset-0 bg-[#000000]/90 backdrop-blur-md flex items-center justify-center p-4 z-[70] animate-in fade-in duration-200"> {/* Higher z-index */}
          {/* Modal Content Box */}
          <div className="bg-[#242424] border border-[#242424]/60 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#242424]/60 sticky top-0 bg-[#242424]/95 backdrop-blur-md z-10 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-bold text-[#FBFAEE]">Agent Debate</h2>
                <p className="text-sm text-[#FBFAEE]/70 mt-1 line-clamp-1">Regarding: "{selectedInteraction.evidence?.user_message || selectedInteraction.advice.substring(0, 30) + '...'}"</p>
              </div>
              <button
                onClick={() => setSelectedInteraction(null)}
                className="text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition-colors p-2 hover:bg-[#000000]/30 rounded-lg flex-shrink-0 ml-4"
                aria-label="Close debate view"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 flex-1">
              {(getDebateFromEvidence(selectedInteraction.evidence) || []).map((agentDebate, idx) => {
                const gradient = agentColors[agentDebate.agent] || agentColors.default;
                const Icon = agentIcons[agentDebate.agent] || agentIcons.default;

                return (
                  <div
                    key={idx}
                    className="bg-[#000000]/40 border border-[#242424]/40 rounded-xl p-4 transition-all hover:bg-[#000000]/50"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Agent Icon */}
                      <div className={`bg-gradient-to-r ${gradient} text-[#FBFAEE] p-2.5 rounded-lg flex-shrink-0 shadow-sm`}>
                        {Icon && <div className="w-5 h-5">{Icon}</div>}
                      </div>
                      {/* Agent Name & Perspective */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-[#FBFAEE] mb-1">{agentDebate.agent}</h3>
                        <div className="prose prose-sm max-w-none text-[#FBFAEE]/80 leading-relaxed">
                          <MarkdownRenderer content={agentDebate.perspective} className="text-[#FBFAEE]/80 text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Separator and Final Response */}
              <div className="pt-4 mt-4 border-t border-[#242424]/50">
                <h4 className="text-sm font-semibold text-[#C488F8] mb-2">Final Synthesized Response:</h4>
                <div className="prose prose-sm max-w-none text-[#FBFAEE]/90 bg-[#000000]/30 p-4 rounded-lg border border-[#242424]/40">
                  <MarkdownRenderer content={selectedInteraction.advice} className="text-[#FBFAEE]/90 text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}