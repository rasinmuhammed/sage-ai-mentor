from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timedelta
import models
from models import ActionPlanCreate, ActionPlanResponse, DailyTaskResponse, DailyTaskUpdate, TodaysTasksResponse
from database import get_user_db, get_system_db
from services import action_plan_service

router = APIRouter()

@router.post("/action-plans/{github_username}", response_model=ActionPlanResponse)
async def create_action_plan(
    github_username: str,
    plan_data: ActionPlanCreate,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check for existing active plan
    result = await db.execute(select(models.ActionPlan).filter(
        models.ActionPlan.user_id == user.id,
        models.ActionPlan.status == "active"
    ))
    existing_plan = result.scalars().first()
    
    if existing_plan:
        # Archive existing plan
        existing_plan.status = "archived"
        await db.commit()

    # Get user context (GitHub stats)
    result = await db.execute(select(models.GitHubAnalysis).filter(
        models.GitHubAnalysis.user_id == user.id
    ).order_by(models.GitHubAnalysis.analyzed_at.desc()))
    github_analysis = result.scalars().first()
    
    user_context = {
        "github_stats": github_analysis.languages if github_analysis else {},
        "recent_performance": "New user" # Placeholder
    }
    
    try:
        ai_plan = await action_plan_service.generate_30_day_plan(
            user_context=user_context,
            focus_area=plan_data.focus_area,
            skills_to_learn=plan_data.skills_to_learn,
            skill_level=plan_data.current_skill_level,
            hours_per_day=plan_data.available_hours_per_day
        )
        
        # Create Plan in DB
        new_plan = models.ActionPlan(
            user_id=user.id,
            title=plan_data.title,
            description=plan_data.description,
            plan_type=plan_data.plan_type,
            focus_area=plan_data.focus_area,
            status="active",
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=ai_plan['total_days']),
            ai_analysis=ai_plan['analysis'],
            skills_to_focus=ai_plan['skills_to_focus'],
            milestones=ai_plan['milestones'],
            current_day=1,
            completion_percentage=0.0
        )
        db.add(new_plan)
        await db.commit()
        await db.refresh(new_plan)
        
        # Create Daily Tasks
        for task_data in ai_plan['daily_tasks']:
            daily_task = models.DailyTask(
                action_plan_id=new_plan.id,
                day_number=task_data['day_number'],
                title=task_data['title'],
                description=task_data['description'],
                task_type=task_data['task_type'],
                difficulty=task_data['difficulty'],
                estimated_time=task_data['estimated_time'],
                status="pending"
            )
            db.add(daily_task)
        
        await db.commit()
        await db.refresh(new_plan)
        # Create Interaction Record for History
        new_interaction = models.AgentAdvice(
            user_id=user.id,
            agent_name="Sage Strategist",
            interaction_type="plan_creation",
            advice=ai_plan['analysis'],
            evidence={
                "plan_id": new_plan.id,
                "focus_area": plan_data.focus_area,
                "title": plan_data.title
            },
            created_at=datetime.utcnow()
        )
        db.add(new_interaction)
        await db.commit()

        return new_plan
        
    except Exception as e:
        print(f"Error generating plan: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate action plan: {str(e)}")

@router.get("/action-plans/{github_username}", response_model=List[ActionPlanResponse])
async def get_action_plans(
    github_username: str,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(models.ActionPlan).filter(
        models.ActionPlan.user_id == user.id
    ).options(selectinload(models.ActionPlan.daily_tasks)).order_by(models.ActionPlan.start_date.desc()))
    plans = result.scalars().all()
    
    return plans

@router.get("/action-plans/{github_username}/{plan_id}/today", response_model=TodaysTasksResponse)
async def get_todays_tasks(
    github_username: str,
    plan_id: int,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(models.ActionPlan).filter(models.ActionPlan.id == plan_id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    # Get tasks for current day
    result = await db.execute(select(models.DailyTask).filter(
        models.DailyTask.action_plan_id == plan.id,
        models.DailyTask.day_number == plan.current_day
    ))
    tasks = result.scalars().all()
    
    return {
        "day_number": plan.current_day,
        "tasks": tasks,
        "plan_progress": plan.completion_percentage
    }

@router.get("/daily-tasks/{github_username}", response_model=List[DailyTaskResponse])
async def get_dashboard_daily_tasks(
    github_username: str,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Find active plan
    result = await db.execute(select(models.ActionPlan).filter(
        models.ActionPlan.user_id == user.id,
        models.ActionPlan.status == "active"
    ))
    active_plan = result.scalars().first()
    
    if not active_plan:
        return []
        
    # Get tasks for current day
    result = await db.execute(select(models.DailyTask).filter(
        models.DailyTask.action_plan_id == active_plan.id,
        models.DailyTask.day_number == active_plan.current_day
    ))
    tasks = result.scalars().all()
    
    return tasks

@router.post("/action-plans/{github_username}/{plan_id}/tasks/{task_id}/complete")
async def complete_daily_task(
    github_username: str,
    plan_id: int,
    task_id: int,
    update_data: DailyTaskUpdate,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(models.DailyTask).filter(models.DailyTask.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = "completed"
    task.completed_at = datetime.utcnow()
    task.actual_time_spent = update_data.actual_time_spent
    task.difficulty_rating = update_data.difficulty_rating
    task.notes = update_data.notes
    
    # Update plan progress
    result = await db.execute(select(models.ActionPlan).filter(models.ActionPlan.id == plan_id))
    plan = result.scalars().first()
    
    # Count total and completed tasks
    # Note: count() is not directly available in async scalars(), need to use func.count or len(all())
    # For efficiency, let's use func.count
    from sqlalchemy import func
    
    result = await db.execute(select(func.count(models.DailyTask.id)).filter(models.DailyTask.action_plan_id == plan_id))
    total_tasks = result.scalar()
    
    result = await db.execute(select(func.count(models.DailyTask.id)).filter(
        models.DailyTask.action_plan_id == plan_id,
        models.DailyTask.status == "completed"
    ))
    completed_tasks = result.scalar()
    
    if total_tasks > 0:
        plan.completion_percentage = (completed_tasks / total_tasks) * 100
        
    await db.commit()
    
    # AI Feedback on task
    feedback = await action_plan_service.evaluate_task_completion(
        task={"title": task.title, "estimated_time": task.estimated_time},
        user_feedback={"notes": task.notes, "actual_time": task.actual_time_spent, "difficulty_rating": task.difficulty_rating}
    )
    
    task.ai_feedback = feedback['feedback']
    await db.commit()
    
    return {"message": "Task completed", "ai_feedback": feedback}

@router.post("/action-plans/{github_username}/{plan_id}/advance-day")
async def advance_plan_day(
    github_username: str,
    plan_id: int,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(models.ActionPlan).filter(models.ActionPlan.id == plan_id))
    plan = result.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    if plan.current_day < 30:
        plan.current_day += 1
        await db.commit()
        return {"message": f"Advanced to day {plan.current_day}", "current_day": plan.current_day}
    else:
        return {"message": "Plan already at day 30", "current_day": plan.current_day}

@router.get("/skill-focus/{github_username}/summary")
async def get_skill_focus_summary(
    github_username: str,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Get logs from last 30 days
    since = datetime.now() - timedelta(days=30)
    result = await db.execute(select(models.SkillFocusLog).filter(
        models.SkillFocusLog.user_id == user.id,
        models.SkillFocusLog.focus_date >= since
    ))
    logs = result.scalars().all()
    
    # Aggregate data
    skill_stats = {}
    total_time = 0
    total_sessions = 0
    
    for log in logs:
        if log.skill_name not in skill_stats:
            skill_stats[log.skill_name] = {"total_time": 0, "sessions": 0}
        skill_stats[log.skill_name]["total_time"] += log.time_spent
        skill_stats[log.skill_name]["sessions"] += 1
        total_time += log.time_spent
        total_sessions += 1
        
    return {
        "total_time": total_time,
        "total_sessions": total_sessions,
        "skills": skill_stats
    }
