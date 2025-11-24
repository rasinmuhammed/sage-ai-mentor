from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import UserBase

class Goal(UserBase):
    __tablename__ = "goals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String(500))
    description = Column(Text)
    goal_type = Column(String(50)) # 'outcome', 'process', 'identity'
    
    # Status
    status = Column(String(50), default="active") # active, completed, abandoned
    progress = Column(Float, default=0.0)
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    target_date = Column(DateTime)
    completed_at = Column(DateTime, nullable=True)
    
    # AI Analysis
    why_this_matters = Column(Text, nullable=True)
    potential_obstacles = Column(JSON, nullable=True)
    success_criteria = Column(Text, nullable=True)
    
    # Relationships
    subgoals = relationship("SubGoal", back_populates="parent_goal", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="goal", cascade="all, delete-orphan")
    progress_logs = relationship("GoalProgress", back_populates="goal", cascade="all, delete-orphan")

class SubGoal(UserBase):
    __tablename__ = "subgoals"
    
    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), index=True)
    title = Column(String(500))
    description = Column(Text, nullable=True)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Dependency Graph
    depends_on = Column(JSON, nullable=True) # List of subgoal IDs
    
    parent_goal = relationship("Goal", back_populates="subgoals")
    tasks = relationship("Task", back_populates="subgoal", cascade="all, delete-orphan")

class Task(UserBase):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    subgoal_id = Column(Integer, ForeignKey("subgoals.id"), index=True)
    title = Column(String(500))
    description = Column(Text, nullable=True)
    status = Column(String(50), default="pending")
    estimated_minutes = Column(Integer, nullable=True)
    
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
    date = Column(DateTime, default=datetime.utcnow)
    update_text = Column(Text)
    new_progress_value = Column(Float) # Snapshot of progress
    
    goal = relationship("Goal", back_populates="progress_logs")

class ActionPlan(UserBase):
    __tablename__ = "action_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    
    title = Column(String(500))
    description = Column(Text)
    
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    
    # AI Generated Content
    strategy = Column(Text)
    daily_routine = Column(JSON) # Structured daily schedule
    weekly_milestones = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    active = Column(Boolean, default=True)
    
    daily_tasks = relationship("DailyTask", back_populates="action_plan", cascade="all, delete-orphan")

class DailyTask(UserBase):
    __tablename__ = "daily_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    action_plan_id = Column(Integer, ForeignKey("action_plans.id"), index=True)
    
    day_number = Column(Integer) # Day 1, Day 2, etc.
    date = Column(DateTime) # Specific date
    
    task_description = Column(Text)
    task_type = Column(String(50)) # learning, coding, building
    
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    
    action_plan = relationship("ActionPlan", back_populates="daily_tasks")

class PomodoroSession(UserBase):
    __tablename__ = "pomodoro_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    
    session_type = Column(String(50)) # focus, short_break, long_break
    duration_minutes = Column(Integer)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)
    
    completed = Column(Boolean, default=False)
    
    # Context
    checkin_id = Column(Integer, ForeignKey("checkins.id"), nullable=True)
    commitment_description = Column(String(500), nullable=True)
    
    # Review
    focus_rating = Column(Integer, nullable=True) # 1-5
    interruptions = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
