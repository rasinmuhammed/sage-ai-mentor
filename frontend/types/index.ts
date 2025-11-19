export interface User {
  id: number
  github_username: string
  email?: string
  onboarding_complete: boolean
}

export interface CheckIn {
  id: number
  timestamp: string
  energy_level: number
  avoiding_what: string
  commitment: string
  shipped: boolean | null
  excuse: string | null
  mood: string | null
  ai_analysis: string | null
}

export interface Task {
  id: number
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimated_hours?: number
  due_date?: string
}

export interface SubGoal {
  id: number
  title: string
  order: number
  status: string
  progress: number
  tasks: Task[]
}

export interface Goal {
  id: number
  title: string
  description?: string
  goal_type: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: string
  progress: number
  target_date?: string
  subgoals: SubGoal[]
  milestones?: any[]
}

export interface ActionPlan {
  id: number
  title: string
  focus_area: string
  status: string
  current_day: number
  completion_percentage: number
  ai_analysis?: string
  daily_tasks: any[]
}

export interface DashboardData {
  active_goals_count: number
  completed_goals_count: number
  average_progress: number
  goals_by_type: Record<string, number>
  active_goals: Goal[]
  recent_milestones: any[]
}