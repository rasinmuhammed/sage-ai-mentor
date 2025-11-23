import {
    Target, ChevronDown, ChevronRight, Brain, RefreshCw, Trash2
} from 'lucide-react'
import MarkdownRenderer from '../../shared/MarkdownRenderer'
import { ActionPlan } from '@/hooks/useActionPlansQuery'

export interface PlanCardProps {
    plan: ActionPlan
    expanded: boolean
    onToggle: () => void
    onRefresh: () => void
    onDelete: (id: number) => void
}

export default function PlanCard({ plan, expanded, onToggle, onRefresh, onDelete }: PlanCardProps) {
    return (
        <div className="glass-card rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:border-[#933DC9]/50 group">
            <div className="p-5 cursor-pointer hover:bg-white/5 transition" onClick={onToggle}>
                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                        <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] p-3 rounded-xl shadow-lg shadow-purple-500/10">
                            <Target className="w-5 h-5 text-[#FBFAEE]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-[#FBFAEE] mb-1 group-hover:text-[#C488F8] transition-colors">{plan.title}</h3>
                            <p className="text-sm text-[#FBFAEE]/70 mb-2">{plan.focus_area}</p>
                            <div className="flex items-center space-x-3 text-xs text-[#FBFAEE]/60">
                                <span>Day {plan.current_day}/30</span>
                                <span>•</span>
                                <span>{plan.completion_percentage.toFixed(0)}% complete</span>
                                {plan.status === 'active' && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-300 border border-green-500/20">Active</span>}
                            </div>
                            <div className="mt-2 w-full bg-black/30 rounded-full h-2 overflow-hidden border border-white/5">
                                <div
                                    className="bg-gradient-to-r from-[#933DC9] to-[#53118F] h-2 rounded-full transition-all"
                                    style={{ width: `${plan.completion_percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    {expanded ? <ChevronDown className="w-5 h-5 text-[#FBFAEE]/60" /> : <ChevronRight className="w-5 h-5 text-[#FBFAEE]/60" />}
                </div>
            </div>

            {expanded && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4 bg-black/10">
                    {plan.ai_analysis && (
                        <div className="bg-black/20 rounded-xl p-4 mb-4 border border-white/5">
                            <h4 className="text-sm font-semibold text-[#C488F8] mb-2 flex items-center">
                                <Brain className="w-4 h-4 mr-2" />
                                AI Analysis
                            </h4>
                            <div className="text-sm text-[#FBFAEE]/70 prose prose-invert max-w-none">
                                <MarkdownRenderer content={plan.ai_analysis} />
                            </div>
                        </div>
                    )}

                    {plan.skills_to_focus && plan.skills_to_focus.skills && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold text-[#FBFAEE] mb-2">Focus Skills</h4>
                            <div className="flex flex-wrap gap-2">
                                {plan.skills_to_focus.skills.map((skill, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-[#933DC9]/20 text-[#C488F8] border border-[#933DC9]/40 rounded-full text-xs font-medium">
                                        {skill.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                        <button
                            onClick={onRefresh}
                            className="flex items-center space-x-2 text-xs text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" />
                            <span>Check for updates</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete(plan.id)
                            }}
                            className="flex items-center space-x-2 text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                        >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete Plan</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
