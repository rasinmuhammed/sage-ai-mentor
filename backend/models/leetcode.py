from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import UserBase

class LeetCodeProblem(UserBase):
    __tablename__ = "leetcode_problems"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String)
    difficulty = Column(String)
    pattern = Column(String)
    url = Column(String)
    
    # SRS Fields
    repetition_level = Column(Integer, default=0) # 0=New, 1=1d, 2=3d, 3=7d, 4=14d, 5=30d
    last_reviewed = Column(DateTime, default=datetime.utcnow)
    next_review = Column(DateTime, default=datetime.utcnow)
    
    notes = Column(String, nullable=True)
    
    logs = relationship("RepetitionLog", back_populates="problem", cascade="all, delete-orphan")

class RepetitionLog(UserBase):
    __tablename__ = "repetition_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("leetcode_problems.id"))
    reviewed_at = Column(DateTime, default=datetime.utcnow)
    difficulty_rating = Column(String) # Easy, Medium, Hard (User perception)
    
    problem = relationship("LeetCodeProblem", back_populates="logs")
