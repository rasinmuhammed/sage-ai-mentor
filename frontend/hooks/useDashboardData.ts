import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface DashboardData {
    user: any
    active_plan_task: any
    active_plan_day: number
    active_plan_focus: string
    recent_advice: any[]
}

export function useDashboardData(githubUsername: string) {
    const [data, setData] = useState<DashboardData | null>(null)
    const [todayCommitment, setTodayCommitment] = useState<any>(null)
    const [activeGoals, setActiveGoals] = useState<any[]>([])
    const [dailyTasks, setDailyTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        if (!githubUsername) return

        try {
            setLoading(true)
            // Apply Groq Key to global axios defaults
            const groqKey = localStorage.getItem('groq_api_key')
            if (groqKey) {
                axios.defaults.headers.common['X-Groq-Key'] = groqKey
            }

            const [dashboardRes, commitmentRes, goalsRes, dailyTasksRes] = await Promise.all([
                axios.get(`${API_URL}/dashboard/${githubUsername}`),
                axios.get(`${API_URL}/commitments/${githubUsername}/today`),
                axios.get(`${API_URL}/goals/${githubUsername}/dashboard`),
                axios.get(`${API_URL}/daily-tasks/${githubUsername}`)
            ])

            setData(dashboardRes.data)
            setTodayCommitment(commitmentRes.data)
            setActiveGoals(goalsRes.data.active_goals || [])
            setDailyTasks(dailyTasksRes.data || [])
            setError(null)
        } catch (err) {
            console.error('Failed to load dashboard:', err)
            setError('Failed to load dashboard data')
        } finally {
            setLoading(false)
        }
    }, [githubUsername])

    useEffect(() => {
        loadData()
    }, [loadData])

    const optimisticUpdateTask = (taskId: number, updates: any) => {
        setDailyTasks(prev => prev.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
        ))
    }

    return {
        data,
        todayCommitment,
        activeGoals,
        dailyTasks,
        loading,
        error,
        refresh: loadData,
        optimisticUpdateTask
    }
}
