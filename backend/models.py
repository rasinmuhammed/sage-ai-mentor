from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import SystemBase, UserBase
from pydantic import BaseModel
from typing import Optional, List, Dict

# --- System Database Models (Admin/App Data) ---
class User(SystemBase):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    github_username = Column(String(255), unique=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    onboarding_complete = Column(Boolean, default=False)
    
    # User's own database configuration
    neon_db_url = Column(String(500), nullable=True)
    neon_api_key = Column(String(500), nullable=True) # Optional, if we need to manage it
    
    # NOTE: Relationships to User DB models are removed because they live in a different database.
    # We will query them using the user's dynamic DB connection.

# --- User Database Models (Personal Data) ---

class CheckIn(UserBase):
    __tablename__ = "checkins"
    
    id = Column(Integer, primary_key=True, index=True)
    # user_id is still useful for indexing/reference even if FK constraint isn't enforced across DBs
    # But strictly speaking, in a single-user DB, user_id might be redundant. 
    # However, keeping it allows for potential multi-tenant user DBs or easier migration.
    # We will remove the ForeignKey("users.id") constraint.
    user_id = Column(Integer, index=True) 
    timestamp = Column(DateTime, default=datetime.utcnow)
    energy_level = Column(Integer)
    avoiding_what = Column(Text)
    commitment = Column(Text)
    shipped = Column(Boolean, nullable=True)
    excuse = Column(Text, nullable=True)
    mood = Column(String(100), nullable=True)
    ai_analysis = Column(Text, nullable=True)
    agent_debate = Column(JSON, nullable=True)

class GitHubAnalysis(UserBase):
    __tablename__ = "github_analysis"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    username = Column(String(255))
    total_repos = Column(Integer)
    active_repos = Column(Integer)
    total_commits = Column(Integer)
    languages = Column(JSON)
    patterns = Column(JSON)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

class AgentAdvice(UserBase):
    __tablename__ = "agent_advice"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    agent_name = Column(String(100))
    advice = Column(Text)
    evidence = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    followed = Column(Boolean, nullable=True)
    outcome = Column(Text, nullable=True)
    interaction_type = Column(String(50), default="analysis")

class LifeEvent(UserBase):
    __tablename__ = "life_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    event_type = Column(String(100))
    description = Column(Text)
    context = Column(JSON, nullable=True, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)
    time_horizon = Column(String(50), nullable=True)
    outcome = Column(Text, nullable=True)

class Notification(UserBase):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String(500))
    message = Column(Text)
    notification_type = Column(String(50))
    priority = Column(String(20), default="normal")
    read = Column(Boolean, default=False)
    action_url = Column(String(500), nullable=True)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

class Goal(UserBase):
    __tablename__ = "goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # Removed ForeignKey
    title = Column(String(500))
    description = Column(Text)
    goal_type = Column(String(50))
    priority = Column(String(20))
    status = Column(String(50), default="active")
    progress = Column(Float, default=0.0)
    target_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    success_criteria = Column(JSON, nullable=True)
    current_metrics = Column(JSON, nullable=True)
    
    ai_analysis = Column(Text, nullable=True)
    ai_insights = Column(JSON, nullable=True)
    obstacles_identified = Column(JSON, nullable=True)
    
    # Relationships (Internal to User DB)
    subgoals = relationship("SubGoal", back_populates="parent_goal", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="goal", cascade="all, delete-orphan")
    progress_logs = relationship("GoalProgress", back_populates="goal", cascade="all, delete-orphan")

class SubGoal(UserBase):
    __tablename__ = "subgoals"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), index=True)
    title = Column(String(500))
    description = Column(Text, nullable=True)
    order = Column(Integer)
    status = Column(String(50), default="pending")
    progress = Column(Float, default=0.0)
    target_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    depends_on = Column(JSON, nullable=True)
    
    parent_goal = relationship("Goal", back_populates="subgoals")
    tasks = relationship("Task", back_populates="subgoal", cascade="all, delete-orphan")

class Task(UserBase):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    subgoal_id = Column(Integer, ForeignKey("subgoals.id"), index=True)
    title = Column(String(500))
    description = Column(Text, nullable=True)
    status = Column(String(50), default="todo")
    priority = Column(String(20), default="medium")
    estimated_hours = Column(Float, nullable=True)
    actual_hours = Column(Float, nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    subgoal = relationship("SubGoal", back_populates="tasks")

class Milestone(UserBase):
    __tablename__ = "milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), index=True)
    title = Column(String(500))
    description = Column(Text, nullable=True)
    target_date = Column(DateTime)
    achieved = Column(Boolean, default=False)
    achieved_at = Column(DateTime, nullable=True)
    celebration_note = Column(Text, nullable=True)
    
    goal = relationship("Goal", back_populates="milestones")

class GoalProgress(UserBase):
    __tablename__ = "goal_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    progress = Column(Float)
    notes = Column(Text, nullable=True)
    mood = Column(String(50), nullable=True)
    obstacles = Column(Text, nullable=True)
    wins = Column(Text, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    
    goal = relationship("Goal", back_populates="progress_logs")

class ActionPlan(UserBase):
    __tablename__ = "action_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # Removed ForeignKey
    title = Column(String(500))
    description = Column(Text)
    plan_type = Column(String(50), default="30_day")
    focus_area = Column(String(100))
    status = Column(String(50), default="active")
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)
    
    ai_analysis = Column(Text, nullable=True)
    skills_to_focus = Column(JSON, nullable=True)
    milestones = Column(JSON, nullable=True)
    
    current_day = Column(Integer, default=1)
    completion_percentage = Column(Float, default=0.0)
    
    daily_tasks = relationship("DailyTask", back_populates="action_plan", cascade="all, delete-orphan")
    skill_focus_logs = relationship("SkillFocusLog", back_populates="action_plan", cascade="all, delete-orphan")

class DailyTask(UserBase):
    __tablename__ = "daily_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    action_plan_id = Column(Integer, ForeignKey("action_plans.id"), index=True)
    day_number = Column(Integer)
    date = Column(DateTime, default=datetime.utcnow)
    
    title = Column(String(500))
    description = Column(Text, nullable=True)
    task_type = Column(String(50))
    difficulty = Column(String(20))
    estimated_time = Column(Integer)
    
    resources = Column(JSON, nullable=True)
    acceptance_criteria = Column(JSON, nullable=True)
    
    status = Column(String(50), default="pending")
    completed_at = Column(DateTime, nullable=True)
    actual_time_spent = Column(Integer, nullable=True)
    
    difficulty_rating = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    
    action_plan = relationship("ActionPlan", back_populates="daily_tasks")

class SkillFocusLog(UserBase):
    __tablename__ = "skill_focus_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action_plan_id = Column(Integer, ForeignKey("action_plans.id"), index=True)
    user_id = Column(Integer, index=True) # Removed ForeignKey
    
    skill_name = Column(String(200))
    focus_date = Column(DateTime, default=datetime.utcnow)
    time_spent = Column(Integer)
    activities = Column(JSON)
    progress_note = Column(Text, nullable=True)
    confidence_level = Column(Integer)
    
    action_plan = relationship("ActionPlan", back_populates="skill_focus_logs")

class SkillReminder(UserBase):
    __tablename__ = "skill_reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # Removed ForeignKey
    skill_name = Column(String(200))
    reminder_message = Column(Text)
    priority = Column(String(20), default="medium")
    frequency = Column(String(50), default="daily")
    next_reminder_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PomodoroSession(UserBase):
    __tablename__ = "pomodoro_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # Removed ForeignKey
    checkin_id = Column(Integer, index=True, nullable=True) # Removed ForeignKey to CheckIn as well to avoid complexity if they are in same DB but let's keep it simple. Actually CheckIn is in UserBase too, so we CAN keep FK between Pomodoro and CheckIn!
    # Re-adding FK for CheckIn since both are in UserBase
    checkin_id = Column(Integer, ForeignKey("checkins.id"), nullable=True, index=True)
    
    session_type = Column(String(20), default="work")
    duration_minutes = Column(Integer, default=25)
    completed = Column(Boolean, default=False)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)
    
    commitment_description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    focus_rating = Column(Integer, nullable=True)
    interruptions = Column(Integer, default=0)

# --- Pydantic Schemas (Unchanged mostly, but good to verify) ---

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    priority: str
    read: bool
    action_url: Optional[str]
    extra_data: Optional[Dict]
    created_at: datetime
    read_at: Optional[datetime]
    
    @classmethod
    def from_orm(cls, obj):
        return cls(
            id=obj.id,
            title=obj.title,
            message=obj.message,
            notification_type=obj.notification_type,
            priority=obj.priority,
            read=obj.read,
            action_url=obj.action_url,
            extra_data=obj.extra_data,  
            created_at=obj.created_at,
            read_at=obj.read_at
        )
    
    class Config:
        from_attributes = True

class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str
    priority: str = "normal"
    action_url: Optional[str] = None
    metadata: Optional[Dict] = None

class NotificationStats(BaseModel):
    total: int
    unread: int
    by_type: Dict[str, int]
    recent_count: int

class UserCreate(BaseModel):
    github_username: str
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    github_username: str
    email: Optional[str]
    onboarding_complete: bool
    neon_db_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class CheckInCreate(BaseModel):
    energy_level: int
    avoiding_what: str
    commitment: str
    mood: Optional[str] = None

class CheckInUpdate(BaseModel):
    shipped: bool
    excuse: Optional[str] = None

class CheckInResponse(BaseModel):
    id: int
    timestamp: datetime
    energy_level: int
    avoiding_what: str
    commitment: str
    shipped: Optional[bool]
    excuse: Optional[str]
    mood: Optional[str]
    ai_analysis: Optional[str]
    agent_debate: Optional[Dict]
    
    class Config:
        from_attributes = True

class AgentAdviceResponse(BaseModel):
    id: int
    agent_name: str
    advice: str
    evidence: Dict
    created_at: datetime
    interaction_type: str
    
    class Config:
        from_attributes = True

class GitHubAnalysisResponse(BaseModel):
    username: str
    total_repos: int
    active_repos: int
    total_commits: int
    languages: Dict
    patterns: Dict
    analyzed_at: datetime
    
    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    message: str
    context: Optional[Dict] = None

class LifeDecisionCreate(BaseModel):
    title: str
    description: str
    decision_type: str
    impact_areas: List[str]
    time_horizon: Optional[str] = "medium_term"
    context: Optional[Dict] = None

class LifeDecisionResponse(BaseModel):
    id: int
    title: str
    description: str
    decision_type: str
    impact_areas: List[str]
    timestamp: datetime
    time_horizon: Optional[str]
    ai_analysis: Optional[str] = None
    lessons_learned: Optional[List[str]] = None
    
    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    estimated_hours: Optional[float] = None
    due_date: Optional[datetime] = None

class TaskResponse(BaseModel):
    id: int
    title: Optional[str] = "Untitled Task"
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    due_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class SubGoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order: int
    target_date: Optional[datetime] = None
    tasks: Optional[List[TaskCreate]] = []

class SubGoalResponse(BaseModel):
    id: int
    title: Optional[str] = "Untitled Subgoal"
    description: Optional[str] = None
    order: Optional[int] = 0
    status: Optional[str] = "pending"
    progress: Optional[float] = 0.0
    target_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    tasks: List[TaskResponse] = []
    
    class Config:
        from_attributes = True

class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: datetime

class MilestoneResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    target_date: datetime
    achieved: bool
    achieved_at: Optional[datetime]
    celebration_note: Optional[str]
    
    class Config:
        from_attributes = True

class GoalCreate(BaseModel):
    title: str
    description: str
    goal_type: str
    priority: str
    target_date: Optional[datetime] = None
    success_criteria: Optional[List[str]] = []
    subgoals: Optional[List[SubGoalCreate]] = []
    milestones: Optional[List[MilestoneCreate]] = []

class GoalResponse(BaseModel):
    id: int
    title: Optional[str] = "Untitled Goal"
    description: Optional[str] = ""
    goal_type: Optional[str] = "personal"
    priority: Optional[str] = "medium"
    status: Optional[str] = "active"
    progress: Optional[float] = 0.0
    target_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    success_criteria: Optional[Dict] = None
    current_metrics: Optional[Dict] = None
    ai_analysis: Optional[str] = None
    ai_insights: Optional[Dict] = None
    obstacles_identified: Optional[Dict] = None
    subgoals: List[SubGoalResponse] = []
    milestones: List[MilestoneResponse] = []
    
    class Config:
        from_attributes = True

class GoalProgressCreate(BaseModel):
    progress: float
    notes: Optional[str] = None
    mood: Optional[str] = None
    obstacles: Optional[str] = None
    wins: Optional[str] = None

class GoalProgressResponse(BaseModel):
    id: int
    timestamp: datetime
    progress: float
    notes: Optional[str]
    mood: Optional[str]
    obstacles: Optional[str]
    wins: Optional[str]
    ai_feedback: Optional[str]
    
    class Config:
        from_attributes = True

class GoalUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    target_date: Optional[datetime] = None
    success_criteria: Optional[List[str]] = None

class DashboardGoal(BaseModel):
    id: int
    title: Optional[str] = "Untitled Goal"
    goal_type: Optional[str] = "personal"
    priority: Optional[str] = "medium"
    progress: Optional[float] = 0.0
    target_date: Optional[str] = None
    subgoals_completed: int = 0
    subgoals_total: int = 0

    class Config:
        from_attributes = True

class DashboardMilestone(BaseModel):
    title: Optional[str] = "Untitled Milestone"
    goal: Optional[str] = "Unknown Goal"
    achieved_at: Optional[str] = None
    celebration: Optional[str] = ""

    class Config:
        from_attributes = True

class GoalsDashboardResponse(BaseModel):
    active_goals_count: int
    completed_goals_count: int
    average_progress: float
    goals_by_type: Dict[str, int]
    active_goals: List[DashboardGoal]
    recent_milestones: List[DashboardMilestone]

    class Config:
        from_attributes = True

class ActionPlanCreate(BaseModel):
    title: str
    description: str
    plan_type: str = "30_day"
    focus_area: str
    skills_to_learn: List[str] = []
    current_skill_level: str = "beginner"
    available_hours_per_day: float = 2.0
    end_date: Optional[datetime] = None

class DailyTaskResponse(BaseModel):
    id: int
    day_number: int
    date: datetime
    title: str
    description: Optional[str]
    task_type: str
    difficulty: str
    estimated_time: int
    status: str
    completed_at: Optional[datetime]
    actual_time_spent: Optional[int]
    resources: Optional[Dict]
    acceptance_criteria: Optional[Dict]
    difficulty_rating: Optional[int]
    notes: Optional[str]
    ai_feedback: Optional[str]
    
    class Config:
        from_attributes = True

class ActionPlanResponse(BaseModel):
    id: int
    title: str
    description: str
    plan_type: str
    focus_area: str
    status: str
    start_date: datetime
    end_date: Optional[datetime]
    current_day: int
    completion_percentage: float
    ai_analysis: Optional[str]
    skills_to_focus: Optional[Dict]
    milestones: Optional[Dict]
    daily_tasks: List[DailyTaskResponse] = []
    
    class Config:
        from_attributes = True

class DailyTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: str
    difficulty: str = "medium"
    estimated_time: int
    resources: Optional[List[str]] = []
    acceptance_criteria: Optional[List[str]] = []

class DailyTaskUpdate(BaseModel):
    status: Optional[str] = None
    actual_time_spent: Optional[int] = None
    difficulty_rating: Optional[int] = None
    notes: Optional[str] = None

class SkillFocusCreate(BaseModel):
    skill_name: str
    time_spent: int
    activities: List[str]
    progress_note: Optional[str] = None
    confidence_level: int

class SkillFocusResponse(BaseModel):
    id: int
    skill_name: str
    focus_date: datetime
    time_spent: int
    activities: Dict
    progress_note: Optional[str]
    confidence_level: int
    
    class Config:
        from_attributes = True

class SkillReminderCreate(BaseModel):
    skill_name: str
    reminder_message: str
    priority: str = "medium"
    frequency: str = "daily"

class SkillReminderResponse(BaseModel):
    id: int
    skill_name: str
    reminder_message: str
    priority: str
    frequency: str
    next_reminder_date: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

class PomodoroSessionCreate(BaseModel):
    session_type: str = "work"
    duration_minutes: int = 25
    checkin_id: Optional[int] = None
    commitment_description: Optional[str] = None

class PomodoroSessionUpdate(BaseModel):
    completed: Optional[bool] = None
    notes: Optional[str] = None
    focus_rating: Optional[int] = None
    interruptions: Optional[int] = None
    paused_at: Optional[datetime] = None

class PomodoroSessionResponse(BaseModel):
    id: int
    session_type: str
    duration_minutes: int
    completed: bool
    started_at: datetime
    completed_at: Optional[datetime]
    paused_at: Optional[datetime]
    commitment_description: Optional[str]
    notes: Optional[str]
    focus_rating: Optional[int]
    interruptions: int
    
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