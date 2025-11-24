import {
    MoreVertical, Edit, Trash2, Loader2, Target, Flag, CheckCircle, Clock, ChevronRight
} from 'lucide-react'
import { motion } from 'framer-motion'

interface GoalCardProps {
    goal: any
    activeMenuGoalId: number | null
    setActiveMenuGoalId: (id: number | null) => void
    onEdit: (goal: any) => void
    onDelete: (goalId: number) => void
    onSelect: (goal: any) => void
}

export default function GoalCard({
    goal,
    activeMenuGoalId,
    setActiveMenuGoalId,
    onEdit,
    onDelete,
    onSelect
}: GoalCardProps) {

    const getPriorityColor = (priority: string) => {
        const colors = {
            critical: 'from-red-600 to-orange-600',
            high: 'from-orange-600 to-yellow-600',
            medium: 'from-[#933DC9] to-[#53118F]',
            low: 'from-gray-600 to-gray-500'
        }
        return colors[priority as keyof typeof colors] || colors.medium
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4, scale: 1.01, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)" }}
            transition={{ duration: 0.2 }}
            className={`glass-card rounded-2xl p-5 border border-white/5 hover:border-[#933DC9]/40 transition-colors cursor-pointer group relative overflow-hidden`}
            style={{ zIndex: activeMenuGoalId === goal.id ? 50 : 0 }}
            onClick={(e) => {
                // Prevent triggering if clicking on menu or buttons
                if ((e.target as HTMLElement).closest('button')) return;
                onSelect(goal)
            }}
        >
            {/* Background Gradient on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#933DC9]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-[#FBFAEE] mb-1 line-clamp-1 group-hover:text-[#C488F8] transition-colors">
                            {goal.title}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs">
                            <span className={`px-2 py-1 rounded-full bg-gradient-to-r ${getPriorityColor(goal.priority)} text-white font-semibold shadow-sm`}>
                                {goal.priority}
                            </span>
                            <span className="text-[#FBFAEE]/60 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                                {goal.goal_type}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onEdit(goal)
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[#FBFAEE]/60 hover:text-[#FBFAEE]"
                            title="Edit Goal"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete(goal.id)
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-[#FBFAEE]/60 hover:text-red-400"
                            title="Delete Goal"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[#FBFAEE]/60">Progress</span>
                        <span className="text-sm font-bold text-[#C488F8]">
                            {goal.progress?.toFixed(0) || 0}%
                        </span>
                    </div>
                    <div className="w-full bg-black/30 rounded-full h-2 border border-white/5">
                        <motion.div
                            className="bg-gradient-to-r from-[#933DC9] to-[#53118F] h-2 rounded-full shadow-[0_0_10px_rgba(147,61,201,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${goal.progress || 0}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                </div>

                {/* Detailed Content */}
                <div className="mt-5 space-y-5 border-t border-white/5 pt-4">

                    {/* AI Analysis Status (Non-blocking) */}
                    {!goal.ai_analysis && (
                        <div className="relative overflow-hidden rounded-xl bg-[#933DC9]/10 p-3 border border-[#933DC9]/20 mb-4 group/council">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#933DC9]/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                            <div className="flex items-center space-x-3 relative z-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[#933DC9] blur-md opacity-40 animate-pulse" />
                                    <Loader2 className="w-4 h-4 text-[#C488F8] animate-spin relative z-10" />
                                </div>
                                <div className="flex-1">
                                    <span className="text-xs text-[#C488F8] font-bold block">Council is Deliberating</span>
                                    <span className="text-[10px] text-[#C488F8]/70">Analyzing strategy & risks...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Criteria */}
                    {goal.success_criteria?.criteria && goal.success_criteria.criteria.length > 0 && (
                        <div>
                            <h4 className="text-xs text-[#FBFAEE]/50 uppercase tracking-wider font-medium mb-2 flex items-center">
                                <Target className="w-3 h-3 mr-1.5" />
                                Success Criteria
                            </h4>
                            <div className="space-y-1.5">
                                {goal.success_criteria.criteria.map((criterion: string, idx: number) => (
                                    <div key={idx} className="flex items-start text-sm text-[#FBFAEE]/80">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#933DC9]/50 mr-2 flex-shrink-0" />
                                        <span className="leading-snug">{criterion}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Milestones Timeline */}
                    {goal.milestones && goal.milestones.length > 0 && (
                        <div>
                            <h4 className="text-xs text-[#FBFAEE]/50 uppercase tracking-wider font-medium mb-2 flex items-center">
                                <Flag className="w-3 h-3 mr-1.5" />
                                Milestones
                            </h4>
                            <div className="relative pl-2 space-y-4 before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                                {goal.milestones.sort((a: any, b: any) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime()).map((milestone: any, idx: number) => {
                                    const isPast = new Date(milestone.target_date) < new Date() && !milestone.achieved;
                                    return (
                                        <div key={idx} className="relative pl-4">
                                            {/* Timeline Dot */}
                                            <div className={`absolute left-0 top-1.5 w-[7px] h-[7px] rounded-full border-2 ${milestone.achieved
                                                ? 'bg-green-500 border-green-500'
                                                : isPast
                                                    ? 'bg-red-500/50 border-red-500'
                                                    : 'bg-[#1a1a1a] border-white/30'
                                                }`} />

                                            <div className="flex items-start justify-between group/milestone">
                                                <div>
                                                    <div className={`text-sm font-medium ${milestone.achieved ? 'text-green-400 line-through opacity-70' : 'text-[#FBFAEE]'}`}>
                                                        {milestone.title}
                                                    </div>
                                                    {milestone.description && (
                                                        <div className="text-xs text-[#FBFAEE]/40 mt-0.5 line-clamp-1 group-hover/milestone:line-clamp-none transition-all">
                                                            {milestone.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`text-xs whitespace-nowrap ml-2 ${isPast ? 'text-red-400' : 'text-[#FBFAEE]/40'}`}>
                                                    {new Date(milestone.target_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Subgoals/Tasks Summary */}
                    {goal.subgoals && goal.subgoals.length > 0 && (
                        <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between text-xs">
                            <span className="text-[#FBFAEE]/60 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1.5" />
                                Action Items
                            </span>
                            <div className="flex items-center space-x-3">
                                <span className="text-[#FBFAEE]">
                                    {goal.subgoals.length} Subgoals
                                </span>
                                <span className="w-[1px] h-3 bg-white/10" />
                                <span className="text-[#C488F8]">
                                    {goal.subgoals.reduce((acc: number, sg: any) => acc + (sg.tasks?.length || 0), 0)} Tasks
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    {goal.target_date && (
                        <div className="flex items-center space-x-1 text-xs text-[#FBFAEE]/60">
                            <Clock className="w-3 h-3" />
                            <span>
                                {new Date(goal.target_date).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onSelect(goal)
                        }}
                        className="text-xs text-[#C488F8] hover:text-[#933DC9] font-medium flex items-center space-x-1 transition-colors"
                    >
                        <span>Update Progress</span>
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
