'use client'

import { Brain, BarChart, Lightbulb } from 'lucide-react'
import MarkdownRenderer from '../../shared/MarkdownRenderer' // Ensure MarkdownRenderer uses #FBFAEE text color

interface Advice {
  agent: string
  advice: string
  date: string
}

interface AgentInsightsProps {
  advice: Advice[]
}

export default function AgentInsights({ advice }: AgentInsightsProps) {
  // Agent icons remain the same
  const getAgentIcon = (agentName: string) => {
    switch (agentName.toLowerCase()) {
      case 'analyst':
        return <BarChart className="w-5 h-5" />
      case 'psychologist':
      case 'contrarian': // Added Contrarian to use Brain icon too
        return <Brain className="w-5 h-5" />
      case 'strategist':
        return <Lightbulb className="w-5 h-5" />
      default:
        // Defaulting to Multi-Agent Analysis or Chat
        return <Brain className="w-5 h-5" />
    }
  }

  // Updated agent colors to use the new purple gradient
  const getAgentColorGradient = (agentName: string) => {
     // Use purple gradient for Analyst, Psychologist, Strategist. Keep Red/Orange for Contrarian.
     switch (agentName.toLowerCase()) {
      case 'contrarian':
        return 'from-red-600 to-orange-600' // Keep contrast for contrarian
      case 'analyst':
      case 'psychologist':
      case 'strategist':
      case 'multi-agent analysis': // Handle the combined analysis case
      case 'multi-agent chat': // Handle the chat case
      default:
        return 'from-[#933DC9] to-[#53118F]' // Orchid to Violet
    }
  }

  // --- Empty State ---
  if (advice.length === 0) {
    return (
      // Use Raisin Black background, adjusted border, Floral White text
      <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-[#FBFAEE] mb-4">Agent Insights</h2>
        <p className="text-[#FBFAEE]/60 text-center py-8">
          No insights yet. Complete your first check-in or run a GitHub analysis.
        </p>
      </div>
    )
  }

  // --- Main Component ---
  return (
    // Use Raisin Black background, adjusted border, Floral White text
    <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl p-6">
      <h2 className="text-xl font-bold text-[#FBFAEE] mb-6">Recent Agent Insights</h2>

      {/* Advice Items List */}
      <div className="space-y-4">
        {advice.map((item, idx) => (
          // Use Black background with opacity, adjusted border and hover states
          <div
            key={idx}
            className="bg-[#000000]/40 border border-[#242424]/40 rounded-xl p-4 hover:bg-[#242424]/30 hover:border-[#242424]/60 transition group"
          >
            <div className="flex items-start space-x-3 mb-3">
              {/* Agent Icon Background */}
              <div className={`bg-gradient-to-r ${getAgentColorGradient(item.agent)} text-[#FBFAEE] p-2 rounded-lg mr-1 shadow-md flex-shrink-0 group-hover:scale-105 transition-transform`}>
                {getAgentIcon(item.agent)}
              </div>
              {/* Agent Name and Date */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#FBFAEE]">{item.agent}</h3>
                <p className="text-xs text-[#FBFAEE]/60">{item.date}</p>
              </div>
            </div>

            {/* Rendered Advice Content */}
            <MarkdownRenderer
              content={item.advice}
              className="text-[#FBFAEE]/80 text-sm" // Pass appropriate text color class
            />
          </div>
        ))}
      </div>

      {/* Tip Box */}
      <div className="mt-6 p-4 bg-gradient-to-r from-[#933DC9]/10 to-[#53118F]/10 border border-[#933DC9]/30 rounded-xl">
        <p className="text-sm text-[#FBFAEE]/80">
          💡 <strong className="text-[#FBFAEE]">Tip:</strong> These insights are based on your actual behavior patterns,
          not generic advice. Review them regularly to track your growth.
        </p>
      </div>
    </div>
  )
}