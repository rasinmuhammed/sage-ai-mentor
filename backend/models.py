from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from pydantic import BaseModel
from typing import Optional, List, Dict

# SQLAlchemy Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    github_username = Column(String(255), unique=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    onboarding_complete = Column(Boolean, default=False)
    
    # Relationships
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    action_plans = relationship("ActionPlan", back_populates="user", cascade="all, delete-orphan")
    # FIX: Changed 'backpopulates' to 'back_populates'
    pomodoro_sessions = relationship("PomodoroSession", back_populates="user", cascade="all, delete-orphan")

class CheckIn(Base):
    __tablename__ = "checkins"
    
    id = Column(Integer, primary_key=True, index=True)
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

class GitHubAnalysis(Base):
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

class AgentAdvice(Base):
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

class LifeEvent(Base):
    __tablename__ = "life_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    event_type = Column(String(100))
    description = Column(Text)
    context = Column(JSON, nullable=True, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)
    time_horizon = Column(String(50), nullable=True)
    outcome = Column(Text, nullable=True)


# Pydantic Schemas - Add after existing schemas
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String(500))
    message = Column(Text)
    notification_type = Column(String(50))  # commitment_reminder, goal_milestone, decision_reflection, pattern_alert, achievement
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    read = Column(Boolean, default=False)
    action_url = Column(String(500), nullable=True)  # Optional link to relevant page
    extra_data = Column(JSON, nullable=True)  # Changed from 'metadata' - Extra data like checkin_id, goal_id, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

# Pydantic Schemas - Add after existing schemas
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    priority: str
    read: bool
    action_url: Optional[str]
    extra_data: Optional[Dict] = None 
    created_at: datetime
    read_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str
    priority: str = "normal"
    action_url: Optional[str] = None
    extra_data: Optional[Dict] = None

class NotificationStats(BaseModel):
    total: int
    unread: int
    by_type: Dict[str, int]
    recent_count: int  # Last 24 hours

# NEW: Goals System
class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String(500))
    description = Column(Text)
    goal_type = Column(String(50))  # career, personal, financial, health, learning, project
    priority = Column(String(20))  # critical, high, medium, low
    status = Column(String(50), default="active")  # active, completed, paused, abandoned
    progress = Column(Float, default=0.0)  # 0-100
    target_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Success criteria and metrics
    success_criteria = Column(JSON, nullable=True)  # List of measurable criteria
    current_metrics = Column(JSON, nullable=True)  # Current measurements
    
    # AI Analysis
    ai_analysis = Column(Text, nullable=True)
    ai_insights = Column(JSON, nullable=True)
    obstacles_identified = Column(JSON, nullable=True)
    
    # Relationships
    # FIX: Changed 'backpopulates' to 'back_populates'
    user = relationship("User", back_populates="goals")
    subgoals = relationship("SubGoal", back_populates="parent_goal", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="goal", cascade="all, delete-orphan")
    progress_logs = relationship("GoalProgress", back_populates="goal", cascade="all, delete-orphan")

class SubGoal(Base):
    __tablename__ = "subgoals"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), index=True)
    title = Column(String(500))
    description = Column(Text, nullable=True)
    order = Column(Integer)  # Sequential order
    status = Column(String(50), default="pending")  # pending, in_progress, completed, blocked
    progress = Column(Float, default=0.0)
    target_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Dependencies
    depends_on = Column(JSON, nullable=True)  # List of subgoal IDs that must complete first
    
    # Relationships
    parent_goal = relationship("Goal", back_populates="subgoals")
    tasks = relationship("Task", back_populates="subgoal", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    subgoal_id = Column(Integer, ForeignKey("subgoals.id"), index=True)
    title = Column(String(500))
    description = Column(Text, nullable=True)
    status = Column(String(50), default="todo")  # todo, in_progress, done, cancelled
    priority = Column(String(20), default="medium")
    estimated_hours = Column(Float, nullable=True)
    actual_hours = Column(Float, nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    subgoal = relationship("SubGoal", back_populates="tasks")

class Milestone(Base):
    __tablename__ = "milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), index=True)
    title = Column(String(500))
    description = Column(Text, nullable=True)
    target_date = Column(DateTime)
    achieved = Column(Boolean, default=False)
    achieved_at = Column(DateTime, nullable=True)
    celebration_note = Column(Text, nullable=True)
    
    # Relationships
    goal = relationship("Goal", back_populates="milestones")

class GoalProgress(Base):
    __tablename__ = "goal_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    progress = Column(Float)  # Progress percentage at this point
    notes = Column(Text, nullable=True)
    mood = Column(String(50), nullable=True)
    obstacles = Column(Text, nullable=True)
    wins = Column(Text, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    
    # Relationships
    goal = relationship("Goal", back_populates="progress_logs")

# Pydantic Schemas
class UserCreate(BaseModel):
    github_username: str
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    github_username: str
    email: Optional[str]
    onboarding_complete: bool
    
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

# NEW: Goal Schemas
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
    created_at: Optional[datetime] = None # Make created_at optional just in case
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
    created_at: Optional[datetime] = None # Make created_at optional
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
    goal_type: str  # career, personal, financial, health, learning, project
    priority: str  # critical, high, medium, low
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
    created_at: Optional[datetime] = None # Make created_at optional
    updated_at: Optional[datetime] = None # Make updated_at optional
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
    goal_type: Optional[str] = "personal" # Renamed from 'type'
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
    achieved_at: Optional[str] = None # String, since we format it
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

class ActionPlan(Base):
    __tablename__ = "action_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String(500))
    description = Column(Text)
    plan_type = Column(String(50), default="30_day")  # 30_day, 60_day, 90_day, custom
    focus_area = Column(String(100))  # e.g., "Backend Development", "System Design"
    status = Column(String(50), default="active")  # active, completed, paused, abandoned
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)
    
    # AI-generated content
    ai_analysis = Column(Text, nullable=True)
    skills_to_focus = Column(JSON, nullable=True)  # List of skills with priorities
    milestones = Column(JSON, nullable=True)  # Weekly milestones
    
    # Progress tracking
    current_day = Column(Integer, default=1)
    completion_percentage = Column(Float, default=0.0)
    
    # Relationships
    user = relationship("User", back_populates="action_plans")
    daily_tasks = relationship("DailyTask", back_populates="action_plan", cascade="all, delete-orphan")
    skill_focus_logs = relationship("SkillFocusLog", back_populates="action_plan", cascade="all, delete-orphan")


class DailyTask(Base):
    __tablename__ = "daily_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    action_plan_id = Column(Integer, ForeignKey("action_plans.id"), index=True)
    day_number = Column(Integer)  # Day 1, Day 2, etc.
    date = Column(DateTime, default=datetime.utcnow)
    
    title = Column(String(500))
    description = Column(Text, nullable=True)
    task_type = Column(String(50))  # learning, practice, project, review
    difficulty = Column(String(20))  # easy, medium, hard
    estimated_time = Column(Integer)  # minutes
    
    # Task details
    resources = Column(JSON, nullable=True)  # Links, docs, tutorials
    acceptance_criteria = Column(JSON, nullable=True)  # List of criteria
    
    # Status
    status = Column(String(50), default="pending")  # pending, in_progress, completed, skipped
    completed_at = Column(DateTime, nullable=True)
    actual_time_spent = Column(Integer, nullable=True)  # minutes
    
    # Feedback
    difficulty_rating = Column(Integer, nullable=True)  # 1-5, how hard was it actually
    notes = Column(Text, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    
    # Relationships
    action_plan = relationship("ActionPlan", back_populates="daily_tasks")


class SkillFocusLog(Base):
    __tablename__ = "skill_focus_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action_plan_id = Column(Integer, ForeignKey("action_plans.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    skill_name = Column(String(200))
    focus_date = Column(DateTime, default=datetime.utcnow)
    time_spent = Column(Integer)  # minutes
    activities = Column(JSON)  # List of what they did
    progress_note = Column(Text, nullable=True)
    confidence_level = Column(Integer)  # 1-10
    
    # Relationships
    action_plan = relationship("ActionPlan", back_populates="skill_focus_logs")


class SkillReminder(Base):
    __tablename__ = "skill_reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    skill_name = Column(String(200))
    reminder_message = Column(Text)
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    frequency = Column(String(50), default="daily")  # daily, weekly, custom
    next_reminder_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# Pydantic Schemas

class ActionPlanCreate(BaseModel):
    title: str
    description: str
    plan_type: str = "30_day"
    focus_area: str
    skills_to_learn: List[str] = []
    current_skill_level: str = "beginner"  # beginner, intermediate, advanced
    available_hours_per_day: float = 2.0
    end_date: Optional[datetime] = None


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
    daily_tasks: List['DailyTaskResponse'] = []
    
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

class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    checkin_id = Column(Integer, ForeignKey("checkins.id"), nullable=True, index=True)
    
    # Session details
    session_type = Column(String(20), default="work")  # work, short_break, long_break
    duration_minutes = Column(Integer, default=25)
    completed = Column(Boolean, default=False)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)
    
    # Progress tracking
    commitment_description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    focus_rating = Column(Integer, nullable=True)  # 1-5 rating
    interruptions = Column(Integer, default=0)
    
    # Relationships
    # FIX: Changed 'backpopulates' to 'back_populates'
    user = relationship("User", back_populates="pomodoro_sessions")

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