'use client'

import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Send, Brain, BarChart, AlertTriangle, Target, Loader2, MessageCircle, History, Eye, EyeOff, Sparkles, Terminal } from 'lucide-react'
import MarkdownRenderer from '../../shared/MarkdownRenderer'
import FirstTimeTooltip from '../onboarding/FirstTimeTooltip'
import PlanPreview from './PlanPreview'

// Assuming API_URL is defined elsewhere or replace with actual URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AgentContribution {
  agent: string
  output: string
  timestamp: string
}

interface Message {
  type: 'user' | 'assistant' | 'error'
  content: string
  debate?: Array<{
    agent: string
    perspective: string
    color: string // Keep this for potential future dynamic coloring based on response
  }>
  insights?: string[]
  actions?: Array<{
    action: string
    priority: string
  }>
  raw_deliberation?: AgentContribution[]
  plan_proposal?: any // Type this properly if shared
  timestamp: Date
}

interface ChatProps {
  githubUsername: string
}



import { useDashboard } from '@/contexts/DashboardContext'

export default function Chat({ githubUsername }: ChatProps) {
  const { activeGoals, actionPlans, todayCommitment } = useDashboard()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [showDebateByDefault, setShowDebateByDefault] = useState(true)
  const [expandedDebateIndex, setExpandedDebateIndex] = useState<number | null>(null)
  const [showRawDeliberation, setShowRawDeliberation] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const cleanAnsi = (text: string): string => {
    if (!text) return '';

    const pattern = "[\\u001B\\u009B]\\[[()#;?]*?(?:(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-OR-Zcf-nqry=><])";
    const ansiRegex = new RegExp(pattern, 'g');

    return text.replace(ansiRegex, '');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true)
        const response = await axios.get(`${API_URL}/advice/${githubUsername}`)
        const history = response.data.map((item: any) => {
          // Parse evidence if string, otherwise use as is
          const evidence = typeof item.evidence === 'string' ? JSON.parse(item.evidence) : item.evidence

          return [
            {
              type: 'user',
              content: evidence?.user_message || 'User Message',
              timestamp: new Date(item.created_at)
            },
            {
              type: 'assistant',
              content: item.advice,
              insights: evidence?.key_insights || [],
              actions: evidence?.actions || [],
              timestamp: new Date(item.created_at) // Approximate timestamp
            }
          ]
        }).flat()

        // Sort by timestamp asc
        history.sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime())

        setMessages(history)
      } catch (error) {
        console.error('Failed to fetch chat history:', error)
      } finally {
        setHistoryLoading(false)
      }
    }

    if (githubUsername) {
      fetchHistory()
    }
  }, [githubUsername])

  // Updated agentColors using the new palette
  const agentColors: Record<string, string> = {
    'Analyst': 'from-[#933DC9] to-[#53118F]', // Orchid to Violet
    'Data Analyst': 'from-[#933DC9] to-[#53118F]',
    'Psychologist': 'from-[#53118F] to-[#933DC9]', // Violet to Orchid
    'Developer Psychologist': 'from-[#53118F] to-[#933DC9]',
    'Contrarian': 'from-red-500 to-orange-500', // Keep contrast for Contrarian
    'Devil\'s Advocate': 'from-red-500 to-orange-500',
    'Strategist': 'from-[#933DC9] to-[#53118F]', // Orchid to Violet
    'Strategic Advisor': 'from-[#933DC9] to-[#53118F]'
  }

  // Icons remain the same
  const agentIcons: Record<string, React.ReactNode> = {
    'Analyst': <BarChart className="w-5 h-5" />,
    'Data Analyst': <BarChart className="w-5 h-5" />,
    'Psychologist': <Brain className="w-5 h-5" />,
    'Developer Psychologist': <Brain className="w-5 h-5" />,
    'Contrarian': <AlertTriangle className="w-5 h-5" />,
    'Devil\'s Advocate': <AlertTriangle className="w-5 h-5" />,
    'Strategist': <Target className="w-5 h-5" />,
    'Strategic Advisor': <Target className="w-5 h-5" />
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input
    setInput('')

    // Add user message
    setMessages(prev => [...prev, {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }])

    setLoading(true)

    // Add placeholder assistant message
    setMessages(prev => [...prev, {
      type: 'assistant',
      content: '',
      debate: [],
      insights: [],
      actions: [],
      raw_deliberation: [],
      timestamp: new Date()
    }])

    try {
      const groqKey = localStorage.getItem('groq_api_key')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (groqKey) {
        headers['X-Groq-Key'] = groqKey
      }

      // Construct context summary
      const contextSummary = {
        active_goals: activeGoals.map(g => ({ title: g.title, progress: g.progress })),
        active_plan: actionPlans.find(p => p.status === 'active') ? {
          title: actionPlans.find(p => p.status === 'active')?.title,
          day: actionPlans.find(p => p.status === 'active')?.current_day,
          focus: actionPlans.find(p => p.status === 'active')?.focus_area
        } : null,
        today_commitment: todayCommitment ? {
          commitment: todayCommitment.commitment,
          shipped: todayCommitment.shipped
        } : null
      }

      const response = await fetch(`${API_URL}/chat/${githubUsername}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage,
          context: contextSummary
        })
      })

      if (!response.ok) throw new Error('Network response was not ok')
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            setMessages(prev => {
              const newMessages = [...prev]
              const lastMessage = newMessages[newMessages.length - 1]

              if (lastMessage.type !== 'assistant') return prev

              if (data.type === 'step') {
                // Update raw deliberation
                const newDeliberation = [...(lastMessage.raw_deliberation || [])]
                newDeliberation.push({
                  agent: data.agent,
                  output: data.output,
                  timestamp: data.timestamp
                })

                // Also update debate if it's a significant step (simplified logic)
                // In a real app, we might want to parse the output to see if it's a full thought
                const newDebate = [...(lastMessage.debate || [])]
                // Only add to debate if it's a new agent or significant update
                // For now, we'll just rely on raw_deliberation for the stream

                return newMessages.map((msg, idx) =>
                  idx === newMessages.length - 1
                    ? { ...msg, raw_deliberation: newDeliberation }
                    : msg
                )
              } else if (data.type === 'final') {
                // Update final response
                const finalData = data.data
                return newMessages.map((msg, idx) =>
                  idx === newMessages.length - 1
                    ? {
                      ...msg,
                      content: finalData.final_response,
                      insights: finalData.key_insights,
                      actions: finalData.actions,
                      plan_proposal: finalData.plan_proposal // Capture plan proposal
                    }
                    : msg
                )
              } else if (data.type === 'error') {
                // Handle error from backend
                return newMessages.map((msg, idx) =>
                  idx === newMessages.length - 1
                    ? {
                      ...msg,
                      type: 'error',
                      content: data.message.includes('Invalid API Key')
                        ? 'Error: Invalid Groq API Key. Please update your API key in Settings.'
                        : `Error: ${data.message}`
                    }
                    : msg
                )
              }

              return prev
            })
          }
        }
      }

      // Track onboarding progress
      if (typeof window !== 'undefined') {
        const { updateOnboardingProgress } = require('@/lib/onboardingStorage')
        updateOnboardingProgress({ hasUsedChat: true })
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'Failed to get response. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickPrompts = [
    "Should I learn a new framework or deepen my current skills?",
    "I keep starting projects but never finish them. Why?",
    "Should I apply for senior roles or stay at my level?",
    "How do I know if I'm actually improving or just busy?"
  ]

  // MODIFICATION: Changed `h-[calc(100vh-12rem)]` to `h-full`
  return (
    // Main container - Use Raisin Black, Floral White text
    <div className="flex flex-col h-full bg-[#242424] border border-[#242424]/50 rounded-3xl shadow-2xl overflow-hidden text-[#FBFAEE]">
      {/* Header - Use Purple gradient */}
      <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Icon background slightly transparent white */}
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl">
              <MessageCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Chat with Reflog</h2> {/* Updated Name */}
              <p className="text-[#FBFAEE]/80 text-sm">Multi-agent AI deliberation</p>
            </div>
          </div>
          {/* Button style */}
          <button
            onClick={() => setShowDebateByDefault(!showDebateByDefault)}
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition backdrop-blur-sm"
          >
            {showDebateByDefault ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{showDebateByDefault ? 'Debates On' : 'Debates Off'}</span>
          </button>
        </div>
      </div>

      {/* Messages Area - Use Black background, Floral White text */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#000000]">
        {historyLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-[#933DC9]" />
          </div>
        ) : messages.length === 0 ? (
          // Empty state - Use Purple gradient for icon background
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-4 rounded-3xl shadow-lg w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Brain className="w-12 h-12 text-[#FBFAEE]" />
            </div>
            <h3 className="text-2xl font-bold text-[#FBFAEE] mb-3">Ask me anything</h3>
            <p className="text-[#FBFAEE]/70 mb-8 max-w-md mx-auto">
              I'll analyze your question with multiple AI agents who will debate to give you the best advice.
            </p>
            {/* Quick prompt buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(prompt)}
                  className="p-4 text-left bg-[#242424]/50 hover:bg-[#242424] border border-[#242424]/60 hover:border-[#242424]/80 rounded-xl text-sm transition text-[#FBFAEE]/80 hover:text-[#FBFAEE] group"
                >
                  <Sparkles className="w-4 h-4 inline mr-2 text-[#933DC9] group-hover:text-[#A35AD4]" /> {/* Orchid color for Sparkles */}
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Display messages
          messages.map((msg, idx) => (
            <div key={idx} className="animate-in slide-in-from-bottom-2 duration-300">
              {msg.type === 'user' ? (
                // User message - Use Purple gradient
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-4 rounded-2xl rounded-tr-none max-w-2xl shadow-lg">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ) : msg.type === 'assistant' ? (
                // Assistant message section
                <div className="space-y-4">
                  {/* Main Response - Raisin background, Floral White text */}
                  <div className="bg-[#242424]/80 backdrop-blur-sm border border-[#242424]/60 px-6 py-5 rounded-2xl rounded-tl-none max-w-3xl shadow-lg">
                    <MarkdownRenderer
                      content={msg.content}
                      className="text-[#FBFAEE]/90" // Slightly less bright text for readability
                    />
                  </div>

                  {/* Raw Deliberation Section */}
                  {msg.raw_deliberation && msg.raw_deliberation.length > 0 && (
                    <div className="ml-2 sm:ml-8 mt-4">
                      <button
                        onClick={() => setShowRawDeliberation(showRawDeliberation === idx ? null : idx)}
                        className="flex items-center space-x-2 text-xs sm:text-sm font-medium text-[#FBFAEE]/50 hover:text-[#FBFAEE]/90 transition-all mb-4 group w-full sm:w-auto"
                      >
                        <div className={`p-1.5 rounded-lg transition-all duration-300 ${showRawDeliberation === idx ? 'bg-[#933DC9] text-white rotate-90' : 'bg-[#242424] group-hover:bg-[#333] text-[#FBFAEE]/60'}`}>
                          <Terminal className="w-3.5 h-3.5" />
                        </div>
                        <span className="uppercase tracking-wider text-[10px] sm:text-xs">
                          {showRawDeliberation === idx ? 'Hide Thinking Process' : 'View AI Deliberation'}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
                      </button>

                      {showRawDeliberation === idx && (
                        <div className="relative pl-2 sm:pl-4 space-y-6 mb-8 animate-in slide-in-from-top-4 duration-500 fade-in">
                          {/* Vertical Connecting Line */}
                          <div className="absolute left-[1.65rem] sm:left-[2.15rem] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#933DC9]/30 via-[#53118F]/20 to-transparent rounded-full" />

                          {msg.raw_deliberation.map((contribution, i) => (
                            <div key={i} className="relative flex items-start space-x-4 group">
                              {/* Agent Icon */}
                              <div className={`relative z-10 flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-black/50 bg-gradient-to-br ${agentColors[contribution.agent] || 'from-gray-600 to-gray-800'} ring-4 ring-[#1a1a1a] group-hover:scale-110 transition-transform duration-300`}>
                                <div className="text-white drop-shadow-md">
                                  {agentIcons[contribution.agent] || <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </div>

                                {/* Pulse Effect for latest item */}
                                {i === msg.raw_deliberation!.length - 1 && loading && (
                                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/30 animate-ping" />
                                )}
                              </div>

                              {/* Content Bubble */}
                              <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-baseline justify-between mb-2 pl-1">
                                  <span className={`text-xs sm:text-sm font-bold uppercase tracking-wide ${agentColors[contribution.agent] ? 'bg-clip-text text-transparent bg-gradient-to-r ' + agentColors[contribution.agent] : 'text-[#FBFAEE]/70'}`}>
                                    {contribution.agent}
                                  </span>
                                  <span className="text-[10px] text-[#FBFAEE]/20 font-mono tabular-nums">
                                    {new Date(contribution.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>

                                <div className="bg-[#1a1a1a]/80 border border-white/5 rounded-2xl rounded-tl-none p-4 sm:p-5 shadow-xl backdrop-blur-md group-hover:border-white/10 transition-colors relative overflow-hidden">
                                  {/* Subtle background gradient based on agent */}
                                  <div className={`absolute inset-0 opacity-[0.03] bg-gradient-to-br ${agentColors[contribution.agent] || 'from-gray-500 to-gray-900'} pointer-events-none`} />

                                  <div className="relative z-10">
                                    <MarkdownRenderer
                                      content={cleanAnsi(contribution.output)}
                                      className="text-xs sm:text-sm text-[#FBFAEE]/80 leading-relaxed prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Agent Debate Section */}
                  {msg.debate && msg.debate.length > 0 && (
                    <div className="ml-8 space-y-3">
                      {/* Button style */}
                      <button
                        onClick={() => setExpandedDebateIndex(expandedDebateIndex === idx ? null : idx)}
                        className="flex items-center space-x-2 text-sm font-semibold text-[#FBFAEE]/60 hover:text-[#FBFAEE]/80 transition mb-3"
                      >
                        <History className="w-4 h-4" />
                        <span>
                          {(showDebateByDefault || expandedDebateIndex === idx)
                            ? 'Hide Agent Debate'
                            : 'Show Agent Debate'}
                        </span>
                        {/* Purple accent for agent count */}
                        <span className="bg-[#933DC9]/20 text-[#C488F8] px-2 py-0.5 rounded-full text-xs">
                          {msg.debate.length} agents
                        </span>
                      </button>

                      {(showDebateByDefault || expandedDebateIndex === idx) && (
                        <div className="space-y-3 animate-in slide-in-from-top duration-300">
                          {msg.debate.map((agent, i) => (
                            // Debate item style
                            <div
                              key={i}
                              className="flex items-start space-x-3 p-4 bg-[#242424]/40 border border-[#242424]/50 rounded-xl hover:bg-[#242424]/60 transition-all group"
                            >
                              {/* Agent icon background */}
                              <div className={`bg-gradient-to-r ${agentColors[agent.agent]} text-[#FBFAEE] p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                                {agentIcons[agent.agent]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-semibold text-[#FBFAEE]">{agent.agent}</div>
                                </div>
                                <div className="text-sm leading-relaxed">
                                  <MarkdownRenderer
                                    content={agent.perspective}
                                    className="text-[#FBFAEE]/80"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Key Insights - Purple accent */}
                  {msg.insights && msg.insights.length > 0 && (
                    <div className="ml-8 bg-gradient-to-r from-[#933DC9]/10 to-[#53118F]/10 border border-[#933DC9]/30 rounded-xl p-4">
                      <h4 className="font-semibold text-[#C488F8] mb-3 flex items-center"> {/* Lighter purple text */}
                        <Brain className="w-4 h-4 mr-2" />
                        Key Insights:
                      </h4>
                      <ul className="space-y-2">
                        {msg.insights.map((insight, i) => (
                          <li key={i} className="text-sm text-[#FBFAEE]/80 flex items-start">
                            <span className="text-[#C488F8] mr-2 mt-1">•</span>
                            <div className="flex-1">
                              <MarkdownRenderer content={insight} className="text-sm" />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Immediate Actions - Kept Green/Red for clarity */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="ml-8 bg-gradient-to-r from-green-500/10 to-teal-500/10 border border-green-500/30 rounded-xl p-4">
                      <h4 className="font-semibold text-green-400 mb-3 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        Immediate Actions:
                      </h4>
                      <ul className="space-y-2">
                        {msg.actions.map((action, i) => (
                          <li key={i} className="text-sm text-[#FBFAEE]/80 flex items-start">
                            <span className={`font-bold mr-2 mt-1 ${action.priority === 'high' ? 'text-red-400' : 'text-green-400'}`}>
                              {i + 1}.
                            </span>
                            <div className="flex-1">
                              <MarkdownRenderer content={action.action} className="text-sm" />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Generative UI: Plan Preview */}
                  {msg.plan_proposal && (
                    <div className="ml-8">
                      <PlanPreview
                        proposal={msg.plan_proposal}
                        githubUsername={githubUsername}
                        onPlanCreated={() => {
                          // Optional: Add a system message confirming creation
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                // Error message style - Kept Red
                <div className="bg-red-900/30 border border-red-500/40 text-red-300 px-6 py-3 rounded-lg max-w-md">
                  <p>{msg.content}</p>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-start space-x-3 animate-in fade-in duration-300">
            <div className="bg-[#242424] border border-[#242424]/60 px-6 py-4 rounded-2xl rounded-tl-none relative overflow-hidden group shadow-lg shadow-[#933DC9]/5">
              <div className="absolute inset-0 bg-gradient-to-r from-[#933DC9]/5 via-[#53118F]/10 to-[#933DC9]/5 animate-[shimmer_2s_infinite]" />
              <div className="flex items-center space-x-4 relative z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#933DC9] blur-md opacity-40 animate-pulse" />
                  <Brain className="w-6 h-6 text-[#C488F8] animate-bounce" />
                </div>
                <div>
                  <p className="text-[#FBFAEE]/90 font-medium flex items-center">
                    The Council is Deliberating
                    <span className="flex space-x-1 ml-2">
                      <span className="w-1 h-1 bg-[#C488F8] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1 h-1 bg-[#C488F8] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1 h-1 bg-[#C488F8] rounded-full animate-bounce" />
                    </span>
                  </p>
                  <p className="text-xs text-[#FBFAEE]/60 mt-1">
                    Synthesizing perspectives from Analyst, Strategist, and Contrarian...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Raisin background, black for input */}
      <div className="border-t border-[#242424]/50 p-4 bg-[#242424]">
        <div className="flex items-end space-x-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Reflog anything..." // Updated placeholder
            className="flex-1 px-4 py-3 bg-[#000000]/70 border border-[#242424]/80 text-[#FBFAEE] placeholder-[#FBFAEE]/50 rounded-xl focus:ring-2 focus:ring-[#933DC9] focus:border-transparent resize-none shadow-inner transition duration-200"
            rows={2}
            disabled={loading}
          />
          {/* Send button - Purple gradient */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] p-4 rounded-xl hover:from-[#A35AD4] hover:to-[#6E2EA4] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[#933DC9]/50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="text-xs text-[#FBFAEE]/50 mt-2 text-center relative">
          💡 Press Enter to send, Shift+Enter for new line. Powered by multi-agent deliberation.
          <FirstTimeTooltip
            id="first_chat_message"
            title="Ask Anything"
            description="Try asking: 'How can I improve my coding speed?' or 'Analyze my recent goals'."
            position="top"
          />
        </div>
      </div>
    </div>
  )
}