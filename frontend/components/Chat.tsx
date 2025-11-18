'use client'

import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Send, Brain, BarChart, AlertTriangle, Target, Loader2, MessageCircle, History, Eye, EyeOff, Sparkles, Terminal } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'

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
  timestamp: Date
}

interface ChatProps {
  githubUsername: string
}



export default function Chat({ githubUsername }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
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

  // Updated agentColors using the new palette
  const agentColors: Record<string, string> = {
    'Analyst': 'from-[#933DC9] to-[#53118F]', // Orchid to Violet
    'Psychologist': 'from-[#53118F] to-[#933DC9]', // Violet to Orchid
    'Contrarian': 'from-red-500 to-orange-500', // Keep contrast for Contrarian
    'Strategist': 'from-[#933DC9] to-[#53118F]' // Orchid to Violet
  }

  // Icons remain the same
  const agentIcons: Record<string, JSX.Element> = {
    'Analyst': <BarChart className="w-5 h-5" />,
    'Psychologist': <Brain className="w-5 h-5" />,
    'Contrarian': <AlertTriangle className="w-5 h-5" />,
    'Strategist': <Target className="w-5 h-5" />
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input
    setInput('')

    setMessages(prev => [...prev, {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }])

    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/chat/${githubUsername}`, {
        message: userMessage
      })

      setMessages(prev => [...prev, {
        type: 'assistant',
        content: response.data.response,
        debate: response.data.agent_debate, // Make sure backend provides this structure
        insights: response.data.key_insights,
        actions: response.data.recommended_actions,
        raw_deliberation: response.data.raw_deliberation,
        timestamp: new Date()
      }])
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
        {messages.length === 0 ? (
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
            <div key={idx}>
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
                    <div className="ml-8">
                      {/* Button style */}
                      <button
                        onClick={() => setShowRawDeliberation(showRawDeliberation === idx ? null : idx)}
                        className="flex items-center space-x-2 text-sm font-semibold text-[#FBFAEE]/60 hover:text-[#FBFAEE]/80 transition mb-3"
                      >
                        <Terminal className="w-4 h-4" />
                        <span>
                          {showRawDeliberation === idx ? 'Hide Raw Deliberation' : 'Show Raw Deliberation'}
                        </span>
                        {/* Green accent kept for status */}
                        <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full text-xs">
                          Behind the scenes
                        </span>
                      </button>

                      {showRawDeliberation === idx && (
                        <div className="space-y-3 animate-in slide-in-from-top duration-300 mb-4">
                          {msg.raw_deliberation.map((contribution, i) => (
                            // Raw deliberation item style
                            <div
                              key={i}
                              className="bg-[#000000]/50 border border-[#242424]/40 rounded-xl p-4 overflow-hidden"
                            >
                              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#242424]/40">
                                <div className="flex items-center space-x-2">
                                  {/* Agent color indicator */}
                                  <div className={`bg-gradient-to-r ${agentColors[contribution.agent]} w-3 h-3 rounded-full shadow-lg`}></div>
                                  <span className="text-[#FBFAEE]/80 font-bold text-sm">{contribution.agent}</span>
                                </div>
                                <span className="text-[#FBFAEE]/50 text-xs">
                                  {new Date(contribution.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="text-xs">
                                <pre className="text-[#FBFAEE]/70 font-mono whitespace-pre-wrap break-words">
                                    {cleanAnsi(contribution.output)}
                                </pre>
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
                            <span className="text-[#C488F8] mr-2">•</span>
                            <span>{insight}</span>
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
                            <span className={`font-bold mr-2 ${action.priority === 'high' ? 'text-red-400' : 'text-green-400'}`}>
                              {i + 1}.
                            </span>
                            <span>{action.action}</span>
                          </li>
                        ))}
                      </ul>
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
          <div className="flex items-start space-x-3">
             <div className="bg-[#242424] border border-[#242424]/60 px-6 py-4 rounded-2xl rounded-tl-none">
              <div className="flex items-center space-x-3">
                 <Loader2 className="w-5 h-5 animate-spin text-[#933DC9]" /> {/* Orchid spinner */}
                <div>
                   <p className="text-[#FBFAEE]/90 font-medium">Agents are deliberating...</p>
                   <p className="text-xs text-[#FBFAEE]/60 mt-1">
                    Analyst, Psychologist, Contrarian, and Strategist are debating your question
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
        <p className="text-xs text-[#FBFAEE]/50 mt-2 text-center">
          💡 Press Enter to send, Shift+Enter for new line. Powered by multi-agent deliberation.
        </p>
      </div>
    </div>
  )
}