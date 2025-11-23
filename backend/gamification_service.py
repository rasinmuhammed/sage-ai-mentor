from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import models
from datetime import datetime

class GamificationService:
    async def award_xp(self, db: AsyncSession, user_id: int, amount: int, reason: str):
        result = await db.execute(select(models.User).filter(models.User.id == user_id))
        user = result.scalars().first()
        
        if not user:
            return None
            
        user.total_xp += amount
        
        # Level calculation: Level = floor(XP / 1000) + 1
        new_level = (user.total_xp // 1000) + 1
        if new_level > user.level:
            user.level = new_level
            # TODO: Trigger level up notification/event
            print(f"🎉 User {user.github_username} leveled up to {new_level}!")
            
        await db.commit()
        await db.refresh(user)
        return user

    async def update_streak(self, db: AsyncSession, user_id: int):
        result = await db.execute(select(models.User).filter(models.User.id == user_id))
        user = result.scalars().first()
        
        if not user:
            return None
            
        today = datetime.utcnow().date()
        last_activity = user.last_activity_date.date() if user.last_activity_date else None
        
        if last_activity == today:
            return user # Already active today
            
        if last_activity and (today - last_activity).days == 1:
            user.current_streak += 1
        else:
            user.current_streak = 1
            
        if user.current_streak > user.best_streak:
            user.best_streak = user.current_streak
            
        user.last_activity_date = datetime.utcnow()
        await db.commit()
        await db.refresh(user)
        return user
