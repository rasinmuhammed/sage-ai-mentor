'use client'

import { useState, useEffect } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import CommitmentTracker from './CommitmentTracker'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Calendar, ArrowRight, CheckCircle, Flame, Trophy, Zap, Brain } from 'lucide-react'
import confetti from 'canvas-confetti'
import Link from 'next/link'

interface UnifiedDashboardProps {
    githubUsername: string
    onNavigate: (tab: string) => void
    onReviewComplete: () => void
    onCheckIn: () => void
    suggestions: any[]
}

export default function UnifiedDashboard({ githubUsername, onNavigate, onReviewComplete, onCheckIn, suggestions }: UnifiedDashboardProps) {
    const {
        todayCommitment,
        dailyTasks,
        activeGoals,
        refreshDashboard,
        dashboardData
    } = useDashboard()

    // Suggestions are now passed as props
    // const [suggestions, setSuggestions] = useState<any[]>([])

    // useEffect(() => {
    //     // Logic moved to parent (Dashboard.tsx)
    // }, [dailyTasks, activeGoals])

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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pt-8">
            {/* 1. The ONE Thing (Law 1: Make it Obvious) */}
            <div className="relative z-10">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#933DC9] to-[#53118F] rounded-3xl blur-xl opacity-30 animate-pulse"></div>
                <div className="relative">
                    <CommitmentTracker
                        githubUsername={githubUsername}
                        onReviewComplete={handleCommitmentComplete}
                        onCheckIn={() => { }}
                        suggestions={suggestions}
                    />
                </div>
            </div>

            {/* 2. Context & Identity (Secondary) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80 hover:opacity-100 transition-opacity duration-500">

                {/* Identity / Stats */}
                <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col justify-between group hover:border-blue-500/30 transition-all">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-blue-500/10 p-2 rounded-lg">
                                <Trophy className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-xs font-medium text-blue-400 bg-blue-500/5 px-2 py-1 rounded-full border border-blue-500/10">
                                Level {Math.floor((dashboardData?.user?.total_xp || 0) / 1000) + 1}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-[#FBFAEE]">Identity</h3>
                        <p className="text-sm text-[#FBFAEE]/60">Full Stack Developer</p>
                    </div>

                    <div className="mt-6">
                        <div className="flex justify-between text-xs text-[#FBFAEE]/40 mb-2">
                            <span>XP Progress</span>
                            <span>{dashboardData?.user?.total_xp || 0} XP</span>
                        </div>
                        <div className="w-full bg-black/30 rounded-full h-1">
                            <div
                                className="bg-blue-500 h-1 rounded-full transition-all"
                                style={{ width: `${((dashboardData?.user?.total_xp || 0) % 1000) / 10}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Current Plan */}
                <div
                    onClick={() => onNavigate('learning')}
                    className="glass-card p-6 rounded-2xl border border-white/5 cursor-pointer group hover:border-[#933DC9]/30 transition-all"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-[#933DC9]/10 p-2 rounded-lg">
                            <Brain className="w-5 h-5 text-[#C488F8]" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#FBFAEE]/20 group-hover:text-[#FBFAEE] group-hover:translate-x-1 transition-all" />
                    </div>

                    <h3 className="text-lg font-bold text-[#FBFAEE] mb-1">
                        {dailyTasks && dailyTasks.length > 0 ? dashboardData?.active_plan_focus : 'No Active Plan'}
                    </h3>
                    <p className="text-sm text-[#FBFAEE]/60 mb-6">
                        {dailyTasks && dailyTasks.length > 0 ? `Day ${dashboardData?.active_plan_day || 1} Curriculum` : 'Select a path to mastery'}
                    </p>

                    {dailyTasks && dailyTasks.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-[#FBFAEE]/40">
                            <CheckCircle className="w-3 h-3" />
                            <span>{dailyTasks.filter((t: any) => t.status === 'completed').length}/{dailyTasks.length} tasks done</span>
                        </div>
                    )}
                </div>

                {/* Streak / Consistency */}
                <div className="glass-card p-6 rounded-2xl border border-white/5 group hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-orange-500/10 p-2 rounded-lg">
                            <Flame className="w-5 h-5 text-orange-500" />
                        </div>
                        <span className="text-xs font-medium text-orange-400 bg-orange-500/5 px-2 py-1 rounded-full border border-orange-500/10">
                            On Fire!
                        </span>
                    </div>

                    <div className="text-4xl font-bold text-[#FBFAEE] mb-1">
                        {dashboardData?.user?.streak || 0}
                    </div>
                    <p className="text-sm text-[#FBFAEE]/60">Day Streak</p>

                    <div className="mt-6 text-xs text-[#FBFAEE]/40">
                        Best: {dashboardData?.user?.best_streak || 0} days
                    </div>
                </div>

            </div>
        </div>
    )
}
