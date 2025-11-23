'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import { Activity, Target, Brain, TrendingUp, Lightbulb } from 'lucide-react'

const COLORS = ['#933DC9', '#C488F8', '#FF79C6', '#BD93F9', '#6272A4']

export default function Analytics() {
    const { analyticsData, loading } = useDashboard()

    if (loading || !analyticsData) {
        return <div className="p-8 text-center text-[#FBFAEE]/50">Loading analytics...</div>
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5 rounded-xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[#FBFAEE]/60 text-sm font-medium">Active Goals</h3>
                        <Target className="w-4 h-4 text-[#933DC9]" />
                    </div>
                    <div className="text-3xl font-bold text-[#FBFAEE]">{analyticsData.goals.active}</div>
                    <div className="text-xs text-[#FBFAEE]/40 mt-1">
                        {analyticsData.goals.completed} completed total
                    </div>
                </div>

                <div className="glass-card p-5 rounded-xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[#FBFAEE]/60 text-sm font-medium">Avg. Progress</h3>
                        <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-[#FBFAEE]">
                        {Math.round(analyticsData.goals.avg_progress)}%
                    </div>
                    <div className="text-xs text-[#FBFAEE]/40 mt-1">
                        Across all active goals
                    </div>
                </div>

                <div className="glass-card p-5 rounded-xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[#FBFAEE]/60 text-sm font-medium">Focus Score</h3>
                        <Brain className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-[#FBFAEE]">85</div>
                    <div className="text-xs text-[#FBFAEE]/40 mt-1">
                        Based on daily consistency
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Focus Distribution */}
                <div className="glass-card p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-[#FBFAEE] mb-6 flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-[#933DC9]" />
                        Focus Distribution
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analyticsData.focus_distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {analyticsData.focus_distribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1b26', borderColor: '#2f334d', color: '#FBFAEE' }}
                                    itemStyle={{ color: '#FBFAEE' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-4 flex-wrap">
                        {analyticsData.focus_distribution.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center text-xs text-[#FBFAEE]/70">
                                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                {entry.name}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Heatmap */}
                <div className="glass-card p-6 rounded-xl border border-white/5">
                    <h3 className="text-lg font-bold text-[#FBFAEE] mb-6 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-green-400" />
                        Activity Trend
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.activity_heatmap}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#ffffff40"
                                    tick={{ fill: '#ffffff40', fontSize: 10 }}
                                    tickFormatter={(value) => new Date(value).getDate().toString()}
                                />
                                <YAxis stroke="#ffffff40" tick={{ fill: '#ffffff40', fontSize: 10 }} />
                                <Tooltip
                                    cursor={{ fill: '#ffffff05' }}
                                    contentStyle={{ backgroundColor: '#1a1b26', borderColor: '#2f334d', color: '#FBFAEE' }}
                                />
                                <Bar dataKey="count" fill="#933DC9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Proactive Insights */}
            <div className="glass-card p-6 rounded-xl border border-white/5 bg-gradient-to-r from-[#933DC9]/10 to-transparent">
                <h3 className="text-lg font-bold text-[#FBFAEE] mb-4 flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-yellow-400" />
                    AI Insights
                </h3>
                <div className="space-y-3">
                    {analyticsData.insights.map((insight: string, idx: number) => (
                        <div key={idx} className="flex items-start p-3 bg-black/20 rounded-lg border border-white/5">
                            <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-[#933DC9]/20 text-[#C488F8] text-xs font-bold mr-3 mt-0.5">
                                {idx + 1}
                            </div>
                            <p className="text-sm text-[#FBFAEE]/80 leading-relaxed">{insight}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
