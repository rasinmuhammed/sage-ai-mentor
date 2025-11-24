from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime
from .base import UserBase

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
    
    event_type = Column(String(100)) # 'decision', 'milestone', 'failure', 'learning'
    description = Column(Text)
    context = Column(JSON, nullable=True, default=dict)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # For Decisions
    time_horizon = Column(String(50), nullable=True) # 'short', 'medium', 'long'
    outcome = Column(Text, nullable=True)
