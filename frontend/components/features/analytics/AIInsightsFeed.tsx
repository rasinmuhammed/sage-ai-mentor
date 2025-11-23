import { Brain, BarChart, AlertTriangle, Lightbulb, Clock } from 'lucide-react'

interface Insight {
  id: number
  agent: string
  advice: string
  date: string
  type: string
}

interface AIInsightsFeedProps {
  insights: Insight[]
  onViewAll?: () => void
}

export default function AIInsightsFeed({ insights, onViewAll }: AIInsightsFeedProps) {
  const getAgentIcon = (agent: string) => {
    const lowerAgent = agent.toLowerCase()
    if (lowerAgent.includes('analyst')) return <BarChart className="w-4 h-4" />
    if (lowerAgent.includes('psychologist')) return <Brain className="w-4 h-4" />
    if (lowerAgent.includes('contrarian')) return <AlertTriangle className="w-4 h-4" />
    if (lowerAgent.includes('strategist')) return <Lightbulb className="w-4 h-4" />
    return <Brain className="w-4 h-4" />
  }

  const getAgentColor = (agent: string) => {
    const lowerAgent = agent.toLowerCase()
    if (lowerAgent.includes('contrarian')) return 'from-red-600 to-orange-600'
    return 'from-[#933DC9] to-[#53118F]'
  }

  return (
    <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#FBFAEE]">Recent AI Insights</h3>
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="text-sm text-[#C488F8] hover:text-[#933DC9] transition"
          >
            View All →
          </button>
        )}
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-8">
          <Brain className="w-12 h-12 mx-auto mb-3 text-[#FBFAEE]/30" />
          <p className="text-[#FBFAEE]/60 text-sm">No insights yet</p>
          <p className="text-[#FBFAEE]/50 text-xs mt-1">Complete a check-in to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.slice(0, 3).map((insight) => (
            <div
              key={insight.id}
              className="bg-[#000000]/40 border border-[#242424]/40 rounded-xl p-4 hover:border-[#933DC9]/30 transition cursor-pointer group"
            >
              <div className="flex items-start space-x-3">
                <div className={`bg-gradient-to-r ${getAgentColor(insight.agent)} p-2 rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform shadow-md`}>
                  {getAgentIcon(insight.agent)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-[#FBFAEE]">
                      {insight.agent}
                    </span>
                    <div className="flex items-center space-x-1 text-xs text-[#FBFAEE]/50">
                      <Clock className="w-3 h-3" />
                      <span>{insight.date}</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#FBFAEE]/70 line-clamp-2 leading-relaxed">
                    {insight.advice}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}