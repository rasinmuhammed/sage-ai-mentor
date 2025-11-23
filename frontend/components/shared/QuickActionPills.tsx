import { MessageCircle, Target, BookOpen, Calendar, Zap } from 'lucide-react'

interface QuickActionPillsProps {
  onAction?: (action: string) => void
}

export default function QuickActionPills({ onAction }: QuickActionPillsProps) {
  const actions = [
    {
      id: 'checkin',
      label: 'Check-in',
      icon: Calendar,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      hover: 'group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30'
    },
    {
      id: 'timer',
      label: '2-Min Rule',
      icon: Zap,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      hover: 'group-hover:bg-yellow-500/20 group-hover:border-yellow-500/30'
    },
    {
      id: 'goal',
      label: 'New Goal',
      icon: Target,
      color: 'text-[#C488F8]',
      bg: 'bg-[#933DC9]/10',
      border: 'border-[#933DC9]/20',
      hover: 'group-hover:bg-[#933DC9]/20 group-hover:border-[#933DC9]/30'
    },
    {
      id: 'decision',
      label: 'Decision',
      icon: BookOpen,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      hover: 'group-hover:bg-pink-500/20 group-hover:border-pink-500/30'
    },
    {
      id: 'chat',
      label: 'Ask AI',
      icon: MessageCircle,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      hover: 'group-hover:bg-blue-500/20 group-hover:border-blue-500/30'
    },
  ]

  return (
    <div className="glass-panel rounded-2xl p-4 mb-8">
      <div className="flex flex-wrap md:flex-nowrap gap-3 justify-between">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={() => onAction?.(action.id)}
              className={`
                flex-1 min-w-[100px] py-3 px-4 rounded-xl border transition-all duration-300 group
                flex flex-col items-center justify-center gap-2
                ${action.bg} ${action.border} ${action.hover}
              `}
            >
              <Icon className={`w-5 h-5 ${action.color} transition-transform group-hover:scale-110`} />
              <span className={`text-xs font-medium ${action.color} opacity-90`}>{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}