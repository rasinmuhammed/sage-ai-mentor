import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// --- Interfaces ---

export interface Skill {
    name: string
    daily_time: number
    priority: string
}

export interface PlanSkillFocus {
    skills: Skill[]
}

export interface DailyTask {
    id: number
    day_number: number
    date: string
    title: string
    description: string
    task_type: string
    difficulty: 'easy' | 'medium' | 'hard'
    estimated_time: number // minutes
    status: 'pending' | 'in_progress' | 'completed' | 'skipped'
    actual_time_spent?: number
    difficulty_rating?: number
    notes?: string
    action_plan_id?: number
}

export interface ActionPlan {
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
    skills_to_focus: PlanSkillFocus
    milestones: any
    daily_tasks: DailyTask[]
}

export interface SkillFocusSummary {
    total_time: number
    total_sessions: number
    skills: { [key: string]: any }
}

// --- Hooks ---

export function useActionPlansQuery(githubUsername: string) {
    const queryClient = useQueryClient()

    const plansQuery = useQuery({
        queryKey: ['actionPlans', githubUsername],
        queryFn: async () => {
            const { data } = await axios.get<ActionPlan[]>(`${API_URL}/action-plans/${githubUsername}`)
            return data
        },
        enabled: !!githubUsername,
    })

    const skillFocusQuery = useQuery({
        queryKey: ['skillFocus', githubUsername],
        queryFn: async () => {
            const { data } = await axios.get<SkillFocusSummary>(`${API_URL}/skill-focus/${githubUsername}/summary?days=7`)
            return data
        },
        enabled: !!githubUsername,
    })

    return {
        plans: plansQuery.data || [],
        skillFocusSummary: skillFocusQuery.data,
        isLoading: plansQuery.isLoading || skillFocusQuery.isLoading,
        isError: plansQuery.isError || skillFocusQuery.isError,
        error: plansQuery.error || skillFocusQuery.error,
        refetch: () => {
            plansQuery.refetch()
            skillFocusQuery.refetch()
        },
        invalidate: () => {
            queryClient.invalidateQueries({ queryKey: ['actionPlans', githubUsername] })
            queryClient.invalidateQueries({ queryKey: ['skillFocus', githubUsername] })
        }
    }
}
