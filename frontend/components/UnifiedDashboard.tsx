'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import CommitmentTracker from './CommitmentTracker'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Calendar, ArrowRight, CheckCircle, Flame, Trophy, Zap, Brain } from 'lucide-react'
import confetti from 'canvas-confetti'
import Link from 'next/link'

export default function UnifiedDashboard({ githubUsername, onNavigate }: { githubUsername: string, onNavigate: (tab: string) => void }) {
    const {
        todayCommitment,
        dailyTasks,
        activeGoals,
        refreshDashboard,
        dashboardData
    } = useDashboard()

    const [suggestions, setSuggestions] = useState<any[]>([])

    useEffect(() => {
        // Generate suggestions for Daily Commitment from Action Plans and Goals
        const newSuggestions = []

        // 1. From Action Plan (Top Priority)
        if (dailyTasks && dailyTasks.length > 0) {
            const pendingTask = dailyTasks.find((t: any) => t.status !== 'completed')
            if (pendingTask) {
                newSuggestions.push({
                    id: `task-${pendingTask.id}`,
                    title: pendingTask.title,
                    type: 'Action Plan',
                    icon: Calendar,
                    color: 'text-[#C488F8]',
                    bg: 'bg-[#933DC9]/10',
                    border: 'border-[#933DC9]/20'
                })
            }
        }

        // 2. From Goals (Next Milestone)
        if (activeGoals && activeGoals.length > 0) {
            // Find a goal with an unachieved milestone
            const goalWithMilestone = activeGoals.find((g: any) => g.milestones && g.milestones.some((m: any) => !m.achieved))
            if (goalWithMilestone) {
                const nextMilestone = goalWithMilestone.milestones.find((m: any) => !m.achieved)
                newSuggestions.push({
                    id: `goal-${nextMilestone.id}`,
                    title: `Complete milestone: ${nextMilestone.title}`,
                    type: 'Goal Target',
                    icon: Target,
                    color: 'text-orange-400',
                    bg: 'bg-orange-500/10',
                    border: 'border-orange-500/20'
                })
            }
        }

        setSuggestions(newSuggestions)
    }, [dailyTasks, activeGoals])

    const handleCommitmentComplete = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#933DC9', '#C488F8', '#FBFAEE']
        })
        refreshDashboard()
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section: The Daily Trinity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. The Commitment (Center Stage) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#933DC9] to-[#53118F] rounded-3xl blur opacity-20 animate-pulse"></div>
                        <div className="relative">
                            <CommitmentTracker
                                githubUsername={githubUsername}
                                onReviewComplete={handleCommitmentComplete}
                                onCheckIn={() => { }}
                                suggestions={suggestions} // Pass suggestions to tracker
                            />
                        </div>
                    </div>

                    {/* 2. & 3. Action Plan & Goal Progress (Side by Side) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Active Action Plan Card */}
                        <div
                            onClick={() => onNavigate('learning')}
                            className="glass-card p-5 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group border border-white/5 hover:border-[#933DC9]/30"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-[#933DC9]/20 p-2.5 rounded-xl">
                                    <Calendar className="w-5 h-5 text-[#C488F8]" />
                                </div>
                                <ArrowRight className="w-4 h-4 text-[#FBFAEE]/40 group-hover:text-[#FBFAEE] group-hover:translate-x-1 transition-all" />
                            </div>

                            <h3 className="text-sm font-semibold text-[#FBFAEE]/60 uppercase tracking-wider mb-1">Current Plan</h3>

                            {dailyTasks && dailyTasks.length > 0 ? (
                                <>
                                    <div className="text-lg font-bold text-[#FBFAEE] mb-3 line-clamp-1">
                                        Day {dashboardData?.active_plan_day || 1}: {dashboardData?.active_plan_focus || 'Learning'}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-[#FBFAEE]/60">
                                            <span>Daily Tasks</span>
                                            <span>{dailyTasks.filter((t: any) => t.status === 'completed').length}/{dailyTasks.length}</span>
                                        </div>
                                        <div className="w-full bg-black/30 rounded-full h-1.5">
                                            <div
                                                className="bg-gradient-to-r from-[#933DC9] to-[#C488F8] h-1.5 rounded-full transition-all"
                                                style={{ width: `${(dailyTasks.filter((t: any) => t.status === 'completed').length / dailyTasks.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-[#FBFAEE]/60 text-sm py-2">
                                    No active plan. Start learning?
                                </div>
                            )}
                        </div>

                        {/* Top Goal Card */}
                        <div
                            onClick={() => onNavigate('goals')}
                            className="glass-card p-5 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group border border-white/5 hover:border-orange-500/30"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-orange-500/20 p-2.5 rounded-xl">
                                    <Target className="w-5 h-5 text-orange-400" />
                                </div>
                                <ArrowRight className="w-4 h-4 text-[#FBFAEE]/40 group-hover:text-[#FBFAEE] group-hover:translate-x-1 transition-all" />
                            </div>

                            <h3 className="text-sm font-semibold text-[#FBFAEE]/60 uppercase tracking-wider mb-1">Top Goal</h3>

                            {activeGoals && activeGoals.length > 0 ? (
                                <>
                                    <div className="text-lg font-bold text-[#FBFAEE] mb-3 line-clamp-1">
                                        {activeGoals[0].title}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-[#FBFAEE]/60">
                                            <span>Progress</span>
                                            <span>{activeGoals[0].progress}%</span>
                                        </div>
                                        <div className="w-full bg-black/30 rounded-full h-1.5">
                                            <div
                                                className="bg-gradient-to-r from-orange-500 to-yellow-500 h-1.5 rounded-full transition-all"
                                                style={{ width: `${activeGoals[0].progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-[#FBFAEE]/60 text-sm py-2">
                                    No active goals. Set a target?
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Quick Stats & Gamification */}
                <div className="space-y-6">
                    {/* Streak Card */}
                    <div className="glass-card p-6 rounded-2xl relative overflow-hidden border border-white/5">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-orange-500/20 p-2 rounded-lg">
                                <Flame className="w-5 h-5 text-orange-500" />
                            </div>
                            <span className="text-xs font-medium text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
                                Keep it up!
                            </span>
                        </div>

                        <div className="text-4xl font-bold text-[#FBFAEE] mb-1">
                            {dashboardData?.user?.streak || 0}
                        </div>
                        <div className="text-sm text-[#FBFAEE]/60 mb-4">Day Streak</div>

                        <div className="text-xs text-[#FBFAEE]/40">
                            Personal Best: {dashboardData?.user?.best_streak || 0} days
                        </div>
                    </div>

                    {/* XP / Level Card (Placeholder for future gamification) */}
                    <div className="glass-card p-6 rounded-2xl relative overflow-hidden border border-white/5">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-blue-500/20 p-2 rounded-lg">
                                <Trophy className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">
                                Level {Math.floor((dashboardData?.user?.total_xp || 0) / 1000) + 1}
                            </span>
                        </div>

                        <div className="text-2xl font-bold text-[#FBFAEE] mb-1">
                            {dashboardData?.user?.total_xp || 0} <span className="text-sm font-normal text-[#FBFAEE]/60">XP</span>
                        </div>
                        <div className="text-sm text-[#FBFAEE]/60 mb-3">Total Experience</div>

                        <div className="w-full bg-black/30 rounded-full h-1.5">
                            <div
                                className="bg-blue-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${((dashboardData?.user?.total_xp || 0) % 1000) / 10}%` }}
                            />
                        </div>
                        <div className="text-xs text-[#FBFAEE]/40 mt-2 text-right">
                            {1000 - ((dashboardData?.user?.total_xp || 0) % 1000)} XP to next level
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
