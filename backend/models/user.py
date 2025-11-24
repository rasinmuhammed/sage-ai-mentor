from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import SystemBase, UserBase

class User(SystemBase):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    github_username = Column(String(255), unique=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Onboarding Status
    is_onboarded = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=0)
    
    # Database Configuration (Neon)
    neon_db_url = Column(String(500), nullable=True)
    
    # Gamification
    total_xp = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    last_activity_date = Column(DateTime, nullable=True)
    level = Column(Integer, default=1)

class CheckIn(UserBase):
    __tablename__ = "checkins"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Morning Check-in
    energy_level = Column(Integer) # 1-10
    avoiding_what = Column(Text)
    commitment = Column(Text)
    
    # Evening Review
    shipped = Column(Boolean, nullable=True)
    excuse = Column(Text, nullable=True)
    mood = Column(String(100), nullable=True)
    
    # AI Feedback
    ai_analysis = Column(Text, nullable=True)
    agent_debate = Column(JSON, nullable=True)
