import { MessageCircle, Target, BookOpen, Calendar, Plus, TrendingUp } from 'lucide-react'

interface QuickActionPillsProps {
  onAction?: (action: string) => void
}

export default function QuickActionPills({ onAction }: QuickActionPillsProps) {
  const actions = [
    { id: 'chat', label: 'Ask AI', icon: MessageCircle, color: 'from-blue-600 to-cyan-600' },
    { id: 'goal', label: 'New Goal', icon: Target, color: 'from-[#933DC9] to-[#53118F]' },
    { id: 'decision', label: 'Log Decision', icon: BookOpen, color: 'from-purple-600 to-pink-600' },
    { id: 'checkin', label: 'Check-in', icon: Calendar, color: 'from-green-600 to-emerald-600' },
  ]

  return (
    <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-[#FBFAEE]/70 mb-4 uppercase tracking-wider">
        Quick Actions
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => onAction?.(action.id)}
              className={`bg-gradient-to-r ${action.color} text-white p-4 rounded-xl hover:brightness-110 transition-all group flex flex-col items-center space-y-2 shadow-md hover:shadow-lg hover:scale-105 active:scale-95`}
            >
              <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold">{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}