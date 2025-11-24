'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// --- Types ---
interface DashboardData {
    user: any
    active_plan_task: any
    active_plan_day: number
    active_plan_focus: string
    recent_advice: any[]
}

interface ActionPlan {
    id: number
    title: string
    description: string
    plan_type: string
    focus_area: string
    status: 'active' | 'completed' | 'paused' | 'abandoned'
    start_date: string
    end_date: string | null
    current_day: number
    completion_percentage: number
    ai_analysis: string
    skills_to_focus: any
    milestones: any
    daily_tasks: any[]
}

interface LifeDecision {
    id: number
    title: string
    description: string
    decision_type: string
    impact_areas: string[]
    timestamp: string
    time_horizon?: string
    ai_analysis?: string
    lessons_learned?: string[]
}

interface CommitmentDay {
    date: string
    commitment: string | null
    shipped: boolean | null
    energy: number
}

interface DashboardContextType {
    // State
    dashboardData: DashboardData | null
    todayCommitment: any
    activeGoals: any[]
    dailyTasks: any[]
    actionPlans: ActionPlan[]
    skillFocusSummary: any
    goals: any[]
    goalsDashboard: any
    decisions: LifeDecision[]
    commitmentCalendar: any // Changed from CommitmentDay[] to any as per instruction
    analyticsData: any // Added
    loading: boolean
    error: string | null

    // Actions
    refreshDashboard: () => Promise<void>
    fetchActionPlans: (force?: boolean) => Promise<void>
    fetchGoals: (status?: string, force?: boolean) => Promise<void>
    fetchDecisions: (force?: boolean) => Promise<void>
    fetchCommitmentCalendar: (force?: boolean) => Promise<void>
    fetchAnalytics: () => Promise<void> // Added
    optimisticUpdateTask: (taskId: number, updates: any) => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children, githubUsername }: { children: ReactNode, githubUsername: string }) {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [todayCommitment, setTodayCommitment] = useState<any>(null)
    const [activeGoals, setActiveGoals] = useState<any[]>([])
    const [dailyTasks, setDailyTasks] = useState<any[]>([])

    const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
    const [skillFocusSummary, setSkillFocusSummary] = useState<any>(null)

    const [goals, setGoals] = useState<any[]>([])
    const [goalsDashboard, setGoalsDashboard] = useState<any>(null)

    const [decisions, setDecisions] = useState<LifeDecision[]>([])
    const [commitmentCalendar, setCommitmentCalendar] = useState<any>(null) // Changed from CommitmentDay[] to any
    const [analyticsData, setAnalyticsData] = useState<any>(null) // Added

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Cache timestamps to prevent spamming
    const [lastPlansFetch, setLastPlansFetch] = useState<number>(0)
    const [lastGoalsFetch, setLastGoalsFetch] = useState<number>(0)
    const [lastGoalsFilter, setLastGoalsFilter] = useState<string>('active')
    const [lastDecisionsFetch, setLastDecisionsFetch] = useState<number>(0)
    const [lastCommitmentFetch, setLastCommitmentFetch] = useState<number>(0)
    const [lastAnalyticsFetch, setLastAnalyticsFetch] = useState<number>(0) // Added

    const refreshDashboard = useCallback(async () => {
        if (!githubUsername) return

        try {
            setLoading(true)
            const groqKey = localStorage.getItem('groq_api_key')
            if (groqKey) {
                axios.defaults.headers.common['X-Groq-Key'] = groqKey
            }

            const [dashboardRes, commitmentRes, goalsRes, dailyTasksRes, analyticsRes] = await Promise.all([ // Added analyticsRes
                axios.get(`${API_URL}/dashboard/${githubUsername}`),
                axios.get(`${API_URL}/commitments/${githubUsername}/today`),
                axios.get(`${API_URL}/goals/${githubUsername}/dashboard`),
                axios.get(`${API_URL}/daily-tasks/${githubUsername}`),
                axios.get(`${API_URL}/analytics/${githubUsername}`) // Added analytics fetch
            ])

            setDashboardData(dashboardRes.data)
            setTodayCommitment(commitmentRes.data)
            setActiveGoals(goalsRes.data.active_goals || [])
            setDailyTasks(dailyTasksRes.data || [])
            setAnalyticsData(analyticsRes.data) // Set analytics data
            setError(null)
        } catch (err) {
            console.error('Failed to load dashboard:', err)
            setError('Failed to load dashboard data')
        } finally {
            setLoading(false)
        }
    }, [githubUsername])

    const fetchActionPlans = useCallback(async (force = false) => {
        const now = Date.now()
        if (!force && actionPlans.length > 0 && (now - lastPlansFetch < 60000)) {
            return
        }

        try {
            const [plansRes, focusRes] = await Promise.all([
                axios.get<ActionPlan[]>(`${API_URL}/action-plans/${githubUsername}`),
                axios.get<any>(`${API_URL}/skill-focus/${githubUsername}/summary?days=7`)
            ])

            setActionPlans(plansRes.data)
            setSkillFocusSummary(focusRes.data)
            setLastPlansFetch(now)
        } catch (err) {
            console.error('Failed to fetch action plans:', err)
        }
    }, [githubUsername, actionPlans.length, lastPlansFetch])

    const fetchGoals = useCallback(async (status = 'active', force = false) => {
        const now = Date.now()
        if (!force && goals.length > 0 && status === lastGoalsFilter && (now - lastGoalsFetch < 60000)) {
            return
        }

        try {
            const [goalsRes, dashboardRes] = await Promise.all([
                axios.get(`${API_URL}/goals/${githubUsername}?status=${status}`),
                axios.get(`${API_URL}/goals/${githubUsername}/dashboard`)
            ])
            setGoals(goalsRes.data)
            setGoalsDashboard(dashboardRes.data)
            setLastGoalsFetch(now)
            setLastGoalsFilter(status)
        } catch (err) {
            console.error('Failed to load goals:', err)
        }
    }, [githubUsername, goals.length, lastGoalsFilter, lastGoalsFetch])

    const fetchDecisions = useCallback(async (force = false) => {
        const now = Date.now()
        if (!force && decisions.length > 0 && (now - lastDecisionsFetch < 60000)) {
            return
        }

        let retries = 3
        while (retries > 0) {
            try {
                const response = await axios.get(`${API_URL}/life-decisions/${githubUsername}`)
                const sortedDecisions = response.data.sort((a: LifeDecision, b: LifeDecision) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                setDecisions(sortedDecisions)
                setLastDecisionsFetch(now)
                return // Success
            } catch (err) {
                console.error(`Failed to load decisions (attempt ${4 - retries}):`, err)
                retries--
                if (retries === 0) {
                    // console.error('Failed to load decisions after 3 attempts')
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries))) // Exponential backoff
                }
            }
        }
    }, [githubUsername, decisions.length, lastDecisionsFetch])

    const fetchCommitmentCalendar = useCallback(async (force = false) => {
        const now = Date.now()
        if (!force && commitmentCalendar && commitmentCalendar.length > 0 && (now - lastCommitmentFetch < 60000)) { // Added check for commitmentCalendar existence
            return
        }

        try {
            const response = await axios.get(`${API_URL}/checkins/${githubUsername}?limit=35`)
            const sortedData = response.data.sort((a: any, b: any) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            )

            const formatted = sortedData.map((checkin: any) => ({
                date: new Date(checkin.timestamp).toISOString().split('T')[0],
                commitment: checkin.commitment,
                shipped: checkin.shipped,
                energy: checkin.energy_level
            }))

            // Generate full grid (logic moved from component)
            const grid: (CommitmentDay | { date: string, commitment: null, shipped: null, energy: 0 })[] = []
            const endDate = new Date()
            const daysSinceSunday = endDate.getDay()
            const startDate = new Date(endDate)
            startDate.setDate(endDate.getDate() - daysSinceSunday - (3 * 7))
            startDate.setHours(0, 0, 0, 0)

            const fetchedDaysMap = new Map(formatted.map((d: any) => [d.date, d]))

            for (let i = 0; i < 28; i++) {
                const currentDate = new Date(startDate)
                currentDate.setDate(startDate.getDate() + i)
                const dateString = currentDate.toISOString().split('T')[0]

                if (fetchedDaysMap.has(dateString)) {
                    grid.push(fetchedDaysMap.get(dateString) as CommitmentDay)
                } else {
                    grid.push({ date: dateString, commitment: null, shipped: null, energy: 0 } as CommitmentDay)
                }
            }

            setCommitmentCalendar(grid as CommitmentDay[])
            setLastCommitmentFetch(now)
        } catch (err) {
            console.error('Failed to load commitment calendar:', err)
        }
    }, [githubUsername, commitmentCalendar, lastCommitmentFetch]) // Added commitmentCalendar to dependency array

    const fetchAnalytics = useCallback(async (force = false) => { // Added fetchAnalytics
        const now = Date.now()
        if (!force && analyticsData && (now - lastAnalyticsFetch < 60000)) { // Added check for analyticsData existence
            return
        }

        try {
            const response = await axios.get(`${API_URL}/analytics/${githubUsername}`)
            setAnalyticsData(response.data)
            setLastAnalyticsFetch(now)
        } catch (err) {
            console.error('Failed to fetch analytics:', err)
        }
    }, [githubUsername, analyticsData, lastAnalyticsFetch]) // Added analyticsData to dependency array

    const optimisticUpdateTask = useCallback((taskId: number, updates: any) => {
        setDailyTasks(prev => prev.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
        ))
    }, [])

    // Initial load
    React.useEffect(() => {
        refreshDashboard()
    }, [refreshDashboard])

    return (
        <DashboardContext.Provider value={{
            dashboardData,
            todayCommitment,
            activeGoals,
            dailyTasks,
            actionPlans,
            skillFocusSummary,
            goals,
            goalsDashboard,
            decisions,
            commitmentCalendar,
            analyticsData, // Added
            loading,
            error,
            refreshDashboard,
            fetchActionPlans,
            fetchGoals,
            fetchDecisions,
            fetchCommitmentCalendar,
            fetchAnalytics, // Added
            optimisticUpdateTask
        }}>
            {children}
        </DashboardContext.Provider>
    )
}

export function useDashboard() {
    const context = useContext(DashboardContext)
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider')
    }
    return context
}
