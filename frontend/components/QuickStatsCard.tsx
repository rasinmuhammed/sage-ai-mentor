import { TrendingUp, TrendingDown, Zap, CheckCircle, Activity } from 'lucide-react'

interface Stats {
  total_checkins: number
  commitments_kept: number
  success_rate: number
  avg_energy: number
}

interface QuickStatsCardProps {
  stats: Stats
}

export default function QuickStatsCard({ stats }: QuickStatsCardProps) {
  const getEnergyColor = (energy: number) => {
    if (energy >= 7) return 'from-green-600 to-emerald-500'
    if (energy >= 5) return 'from-yellow-600 to-amber-500'
    return 'from-red-600 to-orange-500'
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-400'
    if (rate >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-[#FBFAEE]/70 mb-3 uppercase tracking-wider flex items-center">
        <Activity className="w-4 h-4 mr-2" />
        This Week
      </h3>
      
      <div className="space-y-3">
        {/* Success Rate */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-[#FBFAEE]/60">Success Rate</span>
            <div className="flex items-center space-x-1">
              <span className={`text-sm font-bold ${getSuccessRateColor(stats.success_rate)}`}>
                {stats.success_rate.toFixed(0)}%
              </span>
              {stats.success_rate >= 70 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
            </div>
          </div>
          <div className="w-full bg-[#000000]/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                stats.success_rate >= 70
                  ? 'bg-gradient-to-r from-green-600 to-emerald-500'
                  : stats.success_rate >= 50
                  ? 'bg-gradient-to-r from-yellow-600 to-amber-500'
                  : 'bg-gradient-to-r from-red-600 to-orange-500'
              }`}
              style={{ width: `${stats.success_rate}%` }}
            />
          </div>
        </div>

        {/* Energy Level */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-[#FBFAEE]/60">Avg Energy</span>
            <div className="flex items-center space-x-1">
              <span className="text-sm font-bold text-[#C488F8]">
                {stats.avg_energy.toFixed(1)}
              </span>
              <Zap className="w-3 h-3 text-[#C488F8]" />
            </div>
          </div>
          <div className="w-full bg-[#000000]/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 bg-gradient-to-r ${getEnergyColor(stats.avg_energy)}`}
              style={{ width: `${(stats.avg_energy / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Check-ins Progress */}
        <div className="pt-2 border-t border-[#242424]/50">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-[#FBFAEE]/60">Check-ins</span>
            <span className="font-semibold text-[#FBFAEE]">
              {stats.total_checkins}/7
            </span>
          </div>
          <div className="flex space-x-1">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-sm ${
                  i < stats.total_checkins
                    ? 'bg-gradient-to-r from-[#933DC9] to-[#53118F]'
                    : 'bg-[#000000]/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Commitments Kept */}
        <div className="flex items-center justify-between bg-[#000000]/30 rounded-lg p-2 border border-[#242424]/40">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[#FBFAEE]/70">Kept</span>
          </div>
          <span className="text-sm font-bold text-green-400">
            {stats.commitments_kept}
          </span>
        </div>
      </div>
    </div>
  )
}