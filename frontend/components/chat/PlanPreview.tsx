'use client'

import { useState } from 'react'
import { Target, Calendar, Brain, CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import axios from 'axios'

interface PlanProposal {
    title: string
    description: string
    focus_area: string
    skills: string[]
    duration_days: number
    daily_time_minutes: number
}

interface PlanPreviewProps {
    proposal: PlanProposal
    githubUsername: string
    onPlanCreated: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function PlanPreview({ proposal, githubUsername, onPlanCreated }: PlanPreviewProps) {
    const [creating, setCreating] = useState(false)
    const [created, setCreated] = useState(false)

    const handleCreatePlan = async () => {
        setCreating(true)
        try {
            await axios.post(`${API_URL}/action-plans/${githubUsername}`, {
                title: proposal.title,
                description: proposal.description,
                plan_type: '30_day', // Defaulting to 30 day for now, could be dynamic
                focus_area: proposal.focus_area,
                skills_to_learn: proposal.skills,
                current_skill_level: 'intermediate', // Default, AI could suggest this too
                available_hours_per_day: proposal.daily_time_minutes / 60
            })
            setCreated(true)
            onPlanCreated()
        } catch (error) {
            console.error('Failed to create plan:', error)
            alert('Failed to create plan. Please try again.')
        } finally {
            setCreating(false)
        }
    }

    if (created) {
        return (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-green-500/20 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-[#FBFAEE] mb-1">Plan Created!</h3>
                <p className="text-[#FBFAEE]/60 text-sm">Your new learning path is ready in the Learning tab.</p>
            </div>
        )
    }

    return (
        <div className="glass-card border-[#933DC9]/30 rounded-xl overflow-hidden my-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-r from-[#933DC9]/20 to-[#53118F]/20 p-4 border-b border-white/5">
                <div className="flex items-center space-x-3">
                    <div className="bg-[#933DC9] p-2 rounded-lg">
                        <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[#FBFAEE]">{proposal.title}</h3>
                        <p className="text-xs text-[#FBFAEE]/60 uppercase tracking-wider font-medium">{proposal.focus_area}</p>
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-4">
                <p className="text-sm text-[#FBFAEE]/80 leading-relaxed">{proposal.description}</p>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center text-xs text-[#FBFAEE]/50 mb-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            Duration
                        </div>
                        <div className="font-semibold text-[#FBFAEE]">{proposal.duration_days} Days</div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center text-xs text-[#FBFAEE]/50 mb-1">
                            <Brain className="w-3 h-3 mr-1" />
                            Daily Focus
                        </div>
                        <div className="font-semibold text-[#FBFAEE]">{proposal.daily_time_minutes} mins</div>
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-medium text-[#FBFAEE]/60 mb-2 uppercase tracking-wider">Skills to Master</h4>
                    <div className="flex flex-wrap gap-2">
                        {proposal.skills.map((skill, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-[#933DC9]/10 text-[#C488F8] border border-[#933DC9]/20 rounded-md text-xs font-medium">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleCreatePlan}
                    disabled={creating}
                    className="w-full bg-gradient-to-r from-[#933DC9] to-[#53118F] hover:from-[#A35AD4] hover:to-[#6E2EA4] text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center group"
                >
                    {creating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Create This Plan
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
