from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime
from .base import UserBase

class Notification(UserBase):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    
    title = Column(String(500))
    message = Column(Text)
    notification_type = Column(String(50)) # 'system', 'achievement', 'reminder', 'agent'
    
    read = Column(Boolean, default=False)
    action_url = Column(String(500), nullable=True)
    extra_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
