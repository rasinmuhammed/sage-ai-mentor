import { Timer, Play, Coffee, Zap } from 'lucide-react'

interface PomodoroQuickStartProps {
  onStartFocus?: () => void
}

export default function PomodoroQuickStart({ onStartFocus }: PomodoroQuickStartProps) {
  const presets = [
    { duration: 25, label: 'Focus', icon: Zap, color: 'from-[#933DC9] to-[#53118F]' },
    { duration: 5, label: 'Break', icon: Coffee, color: 'from-green-600 to-emerald-500' },
  ]

  return (
    <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Timer className="w-4 h-4 text-[#FBFAEE]/70" />
          <h3 className="text-sm font-semibold text-[#FBFAEE]/90">Quick Focus</h3>
        </div>
      </div>

      <div className="space-y-2">
        {presets.map((preset) => {
          const Icon = preset.icon
          return (
            <button
              key={preset.duration}
              onClick={onStartFocus}
              className={`w-full bg-gradient-to-r ${preset.color} text-white p-3 rounded-xl hover:brightness-110 transition-all flex items-center justify-between group shadow-md hover:shadow-lg`}
            >
              <div className="flex items-center space-x-2">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-semibold">{preset.duration}min {preset.label}</span>
              </div>
              <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          )
        })}
      </div>

      <div className="mt-3 text-center">
        <button
          onClick={onStartFocus}
          className="text-xs text-[#C488F8] hover:text-[#933DC9] transition"
        >
          Advanced Timer →
        </button>
      </div>
    </div>
  )
}