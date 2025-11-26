from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- System / Config ---
class DatabaseConfig(BaseModel):
    database_url: str

# --- User ---
class UserBase(BaseModel):
    github_username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    is_onboarded: bool
    onboarding_step: int
    total_xp: int
    current_streak: int
    level: int
    
    class Config:
        from_attributes = True

# --- CheckIn ---
class CheckInCreate(BaseModel):
    energy_level: int
    avoiding_what: str
    commitment: str

class CheckInUpdate(BaseModel):
    shipped: Optional[bool] = None
    excuse: Optional[str] = None
    mood: Optional[str] = None

class CheckInResponse(CheckInCreate):
    id: int
    user_id: int
    timestamp: datetime
    shipped: Optional[bool] = None
    excuse: Optional[str] = None
    mood: Optional[str] = None
    ai_analysis: Optional[str] = None
    agent_debate: Optional[Dict] = None
    
    class Config:
        from_attributes = True

# --- Goals ---
class GoalCreate(BaseModel):
    title: str
    description: str
    goal_type: str # outcome, process, identity
    target_date: datetime

class GoalUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    goal_type: Optional[str] = None
    target_date: Optional[datetime] = None
    status: Optional[str] = None
    progress: Optional[float] = None

class GoalProgressCreate(BaseModel):
    update_text: str
    new_progress_value: float

class GoalProgressResponse(GoalProgressCreate):
    id: int
    goal_id: int
    date: datetime
    
    class Config:
        from_attributes = True

# --- SubGoals ---
class SubGoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    depends_on: Optional[List[int]] = None

class SubGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    depends_on: Optional[List[int]] = None

class SubGoalResponse(SubGoalCreate):
    id: int
    goal_id: int
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- Tasks ---
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    estimated_minutes: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    estimated_minutes: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskResponse(TaskCreate):
    id: int
    subgoal_id: int
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# --- Milestones ---
class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: datetime

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    achieved: Optional[bool] = None
    celebration_note: Optional[str] = None

class MilestoneResponse(MilestoneCreate):
    id: int
    goal_id: int
    achieved: bool
    achieved_at: Optional[datetime] = None
    celebration_note: Optional[str] = None
    
    class Config:
        from_attributes = True

class GoalResponse(GoalCreate):
    id: int
    user_id: int
    status: str
    progress: float
    created_at: datetime
    completed_at: Optional[datetime] = None
    why_this_matters: Optional[str] = None
    potential_obstacles: Optional[List] = None
    success_criteria: Optional[str] = None
    
    class Config:
        from_attributes = True

class GoalDashboardItem(BaseModel):
    id: int
    title: str
    goal_type: str
    priority: Optional[str] = "medium"
    progress: float
    target_date: Optional[str] = None
    subgoals_completed: int
    subgoals_total: int

class MilestoneDashboardItem(BaseModel):
    title: str
    goal: str
    achieved_at: Optional[str] = None
    celebration: str

class GoalsDashboardResponse(BaseModel):
    active_goals_count: int
    completed_goals_count: int
    average_progress: float
    goals_by_type: Dict[str, int]
    active_goals: List[GoalDashboardItem]
    recent_milestones: List[MilestoneDashboardItem]

# --- Notifications ---
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    read: bool
    created_at: datetime
    action_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class NotificationStats(BaseModel):
    total: int
    unread: int
    by_type: Dict[str, int]
    recent_count: int

# --- Insights ---
class LifeDecisionCreate(BaseModel):
    description: str
    context: Optional[Dict] = None
    time_horizon: Optional[str] = "medium"

class LifeDecisionResponse(BaseModel):
    id: int
    event_type: str
    description: str
    context: Optional[Dict]
    timestamp: datetime
    time_horizon: Optional[str]
    outcome: Optional[str]
    
    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    role: str
    content: str

class AgentAdviceResponse(BaseModel):
    agent_name: str
    advice: str
    evidence: Optional[Dict] = None

# --- Action Plans ---
class DailyTaskResponse(BaseModel):
    id: int
    day_number: int
    date: datetime
    task_description: str
    task_type: str
    completed: bool
    
    class Config:
        from_attributes = True

class DailyTaskUpdate(BaseModel):
    completed: bool
    notes: Optional[str] = None

class ActionPlanCreate(BaseModel):
    goal_id: Optional[int] = None
    title: str
    description: str
    start_date: datetime
    end_date: datetime

class ActionPlanResponse(ActionPlanCreate):
    id: int
    active: bool
    strategy: str
    daily_routine: List[Dict]
    weekly_milestones: List[Dict]
    daily_tasks: List[DailyTaskResponse] = []
    
    class Config:
        from_attributes = True

class TodaysTasksResponse(BaseModel):
    date: datetime
    tasks: List[DailyTaskResponse]
    pending_count: int
    completed_count: int

# --- Pomodoro ---
class PomodoroSessionCreate(BaseModel):
    session_type: str
    duration_minutes: int
    checkin_id: Optional[int] = None
    commitment_description: Optional[str] = None

class PomodoroSessionUpdate(BaseModel):
    notes: Optional[str] = None
    focus_rating: Optional[int] = None
    interruptions: Optional[int] = None

class PomodoroSessionResponse(PomodoroSessionCreate):
    id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    completed: bool
    focus_rating: Optional[int] = None
    
    class Config:
        from_attributes = True

class PomodoroStatsResponse(BaseModel):
    total_sessions: int
    completed_sessions: int
    total_work_minutes: int
    avg_focus_rating: float
    completion_rate: float
    sessions_today: int
    current_streak: int
    best_streak: int
