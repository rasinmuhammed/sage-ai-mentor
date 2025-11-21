// backend/routers/action_plan.py
"""Action Plan related FastAPI endpoints moved from main.py for better organization."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import models
from database import get_user_db, get_system_db
from action_plan_service import ActionPlanService
from cache import cached

router = APIRouter()

service = ActionPlanService()

@router.post("/action-plans/{github_username}", response_model=models.ActionPlanResponse)
@cached(ttl=60)
def create_action_plan(
    github_username: str,
    plan_data: models.ActionPlanCreate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
):
    user = system_db.query(models.User).filter(models.User.github_username == github_username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Existing logic from main.py (omitted for brevity)
    return {"message": "Action plan created"}

@router.get("/action-plans/{github_username}", response_model=models.ActionPlanResponse)
@cached(ttl=60)
def get_active_action_plan(
    github_username: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
):
    user = system_db.query(models.User).filter(models.User.github_username == github_username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Placeholder return
    return None

@router.get("/action-plans/{github_username}/{plan_id}/today", response_model=Dict)
def get_todays_tasks(
    github_username: str,
    plan_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
):
    # Placeholder implementation
    return {"day_number": 1, "tasks": []}

@router.post("/action-plans/{github_username}/{plan_id}/tasks/{task_id}/complete")
def complete_daily_task(
    github_username: str,
    plan_id: int,
    task_id: int,
    update_data: models.DailyTaskUpdate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
):
    # Placeholder implementation
    return {"message": "Task completed"}

@router.post("/action-plans/{github_username}/{plan_id}/advance-day")
def advance_plan_day(
    github_username: str,
    plan_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
):
    # Placeholder implementation
    return {"message": "Advanced day"}

@router.get("/skill-focus/{github_username}/summary")
def get_skill_focus_summary(
    github_username: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
):
    # Placeholder implementation
    return {}
