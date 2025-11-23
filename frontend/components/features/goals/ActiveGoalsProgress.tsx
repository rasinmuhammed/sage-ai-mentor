import { Target, Clock, CheckCircle, ChevronRight } from 'lucide-react'

interface Goal {
  id: number
  title: string
  progress: number
  target_date?: string
  subgoals?: Array<{ status: string }>
}

interface ActiveGoalsProgressProps {
  goals: Goal[]
  onViewAll?: () => void
}

export default function ActiveGoalsProgress({ goals, onViewAll }: ActiveGoalsProgressProps) {
  const formatDistanceToNow = (date: string) => {
    const days = Math.floor((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return `${Math.abs(days)}d overdue`
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days < 7) return `${days}d left`
    if (days < 30) return `${Math.floor(days / 7)}w left`
    return `${Math.floor(days / 30)}mo left`
  }

  return (
    <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#FBFAEE]">Active Goals</h3>
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="text-sm text-[#C488F8] hover:text-[#933DC9] transition flex items-center"
          >
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>
      
      {goals.length === 0 ? (
        <div className="text-center py-8">
          <Target className="w-12 h-12 mx-auto mb-3 text-[#FBFAEE]/30" />
          <p className="text-[#FBFAEE]/60 text-sm mb-3">No active goals</p>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-[#C488F8] hover:text-[#933DC9] transition"
            >
              Create your first goal →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {goals.slice(0, 3).map(goal => {
            const completedSubgoals = goal.subgoals?.filter(sg => sg.status === 'completed').length || 0
            const totalSubgoals = goal.subgoals?.length || 0
            
            return (
              <div 
                key={goal.id} 
                className="group hover:bg-[#000000]/40 p-3 rounded-xl transition cursor-pointer border border-transparent hover:border-[#933DC9]/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#FBFAEE] line-clamp-1 flex-1">
                    {goal.title}
                  </span>
                  <span className="text-xs text-[#C488F8] font-bold ml-2">
                    {goal.progress.toFixed(0)}%
                  </span>
                </div>
                
                <div className="w-full bg-[#000000]/50 rounded-full h-2 overflow-hidden border border-[#242424]/40 mb-2">
                  <div 
                    className="bg-gradient-to-r from-[#933DC9] to-[#53118F] h-2 rounded-full transition-all duration-500 relative overflow-hidden"
                    style={{ width: `${goal.progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-[#FBFAEE]/60">
                  <span className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {completedSubgoals}/{totalSubgoals} subgoals
                  </span>
                  {goal.target_date && (
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDistanceToNow(goal.target_date)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}