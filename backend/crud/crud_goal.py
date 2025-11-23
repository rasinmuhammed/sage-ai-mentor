from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from crud_base import CRUDBase
import models

class CRUDGoal(CRUDBase[models.Goal, models.GoalCreate, models.GoalUpdateRequest]):
    async def get(self, db: AsyncSession, id: int) -> Optional[models.Goal]:
        query = select(models.Goal).options(
            selectinload(models.Goal.subgoals).selectinload(models.SubGoal.tasks),
            selectinload(models.Goal.milestones)
        ).filter(models.Goal.id == id)
        result = await db.execute(query)
        return result.scalars().first()

    async def get_multi_by_user(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100, status: str = None, goal_type: str = None
    ) -> List[models.Goal]:
        query = select(models.Goal).filter(models.Goal.user_id == user_id)
        if status:
            query = query.filter(models.Goal.status == status)
        if goal_type:
            query = query.filter(models.Goal.goal_type == goal_type)
        
        query = query.options(
            selectinload(models.Goal.subgoals).selectinload(models.SubGoal.tasks),
            selectinload(models.Goal.milestones)
        ).order_by(models.Goal.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()

goal = CRUDGoal(models.Goal)
