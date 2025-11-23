from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Dict
from datetime import datetime
import models
from database import get_user_db, get_system_db, get_user_db_engine
from sqlalchemy.orm import sessionmaker
from services import sage_crew
from cache import cached
from crud.crud_goal import goal as crud_goal

router = APIRouter()

async def process_goal_analysis(
    goal_id: int,
    goal_data: dict,
    user_context: dict,
    user_db_url: str
):
    """Background task to analyze goal and update DB"""
    print(f"🧠 [Background] Starting AI analysis for goal {goal_id}...")
    
    # Create a new session for the background task
    engine = get_user_db_engine(user_db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            # Fetch goal again
            result = await db.execute(select(models.Goal).filter(models.Goal.id == goal_id))
            goal = result.scalars().first()
            
            if not goal:
                print(f"❌ [Background] Goal {goal_id} not found")
                return

            analysis = await sage_crew.analyze_goal(goal_data, user_context, db)
            
            goal.ai_analysis = analysis["analysis"]
            goal.ai_insights = {
                "insights": analysis["insights"], 
                "obstacles": analysis["obstacles"], 
                "recommendations": analysis["recommendations"], 
                "feasibility_score": analysis["feasibility_score"], 
                "estimated_duration": analysis["estimated_duration"]
            }
            goal.obstacles_identified = {"obstacles": analysis["obstacles"]}
            
            for sg in analysis["suggested_subgoals"]:
                db.add(models.SubGoal(goal_id=goal.id, title=sg["title"], order=sg["order"]))
            
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(goal, "ai_insights")
            flag_modified(goal, "obstacles_identified")
            
            await db.commit()
            print(f"✅ [Background] AI analysis completed for goal {goal_id}")
            
        except Exception as e:
            print(f"❌ [Background] Goal analysis failed: {str(e)}")
        finally:
            await engine.dispose()

@router.post("/goals/{github_username}", response_model=models.GoalResponse)
async def create_goal(
    github_username: str,
    goal: models.GoalCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.GitHubAnalysis).filter(models.GitHubAnalysis.user_id == user.id).order_by(models.GitHubAnalysis.analyzed_at.desc()))
    github_analysis = result.scalars().first()
    
    result = await db.execute(select(models.CheckIn).filter(models.CheckIn.user_id == user.id, models.CheckIn.shipped != None).order_by(models.CheckIn.timestamp.desc()).limit(30))
    recent_checkins = result.scalars().all()
    
    result = await db.execute(select(models.Goal).filter(models.Goal.user_id == user.id, models.Goal.status == 'completed'))
    past_goals = result.scalars().all()
    
    user_context = {
        "github_stats": {
            "total_repos": github_analysis.total_repos if github_analysis else 0,
            "active_repos": github_analysis.active_repos if github_analysis else 0,
            "languages": github_analysis.languages if github_analysis else {}
        },
        "recent_performance": {
            "success_rate": (sum(1 for c in recent_checkins if c.shipped) / len(recent_checkins) * 100) if recent_checkins else 0,
            "avg_energy": sum(c.energy_level for c in recent_checkins) / len(recent_checkins) if recent_checkins else 0
        },
        "past_goals": [{"title": g.title, "completed": g.completed_at.strftime("%Y-%m-%d") if g.completed_at else None} for g in past_goals]
    }
    
    new_goal = models.Goal(
        user_id=user.id, title=goal.title, description=goal.description, goal_type=goal.goal_type, priority=goal.priority, target_date=goal.target_date,
        success_criteria={"criteria": goal.success_criteria} if goal.success_criteria else None
    )
    db.add(new_goal)
    await db.commit()
    await db.refresh(new_goal)
    
    # Schedule background analysis
    goal_data = {
        "title": goal.title, 
        "description": goal.description, 
        "goal_type": goal.goal_type, 
        "priority": goal.priority, 
        "target_date": goal.target_date.isoformat() if goal.target_date else None, 
        "success_criteria": goal.success_criteria
    }
    
    background_tasks.add_task(
        process_goal_analysis, 
        new_goal.id, 
        goal_data, 
        user_context, 
        user.neon_db_url
    )
    
    # Manually create milestones if provided (sync part)
    if goal.milestones:
        for ms in goal.milestones:
            db.add(models.Milestone(goal_id=new_goal.id, title=ms.title, description=ms.description, target_date=ms.target_date))
        await db.commit()

    # Re-fetch with eager loading to avoid MissingGreenlet error during serialization
    # This handles both the initial creation and any updates from the AI analysis
    result = await db.execute(
        select(models.Goal)
        .options(selectinload(models.Goal.subgoals), selectinload(models.Goal.milestones))
        .filter(models.Goal.id == new_goal.id)
    )
    new_goal = result.scalars().first()
    
    return new_goal

from crud.crud_goal import goal as crud_goal

# ... imports

@router.get("/goals/{github_username}", response_model=List[models.GoalResponse])
async def get_goals(
    github_username: str,
    status: str = None,
    goal_type: str = None,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    goals = await crud_goal.get_multi_by_user(db, user_id=user.id, status=status, goal_type=goal_type)
    return goals

@cached(ttl=60)
@router.get("/goals/{github_username}/dashboard", response_model=models.GoalsDashboardResponse)
async def get_goals_dashboard(
    github_username: str,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.Goal).options(selectinload(models.Goal.subgoals).selectinload(models.SubGoal.tasks)).filter(models.Goal.user_id == user.id, models.Goal.status == 'active'))
    active_goals = result.scalars().all()
    
    result = await db.execute(select(models.Goal).filter(models.Goal.user_id == user.id, models.Goal.status == 'completed'))
    completed_goals = len(result.scalars().all()) # .count() is not available in async scalars
    
    total_progress = sum(float(g.progress or 0.0) for g in active_goals)
    avg_progress = (total_progress / len(active_goals)) if active_goals else 0.0
    
    result = await db.execute(select(models.Milestone).join(models.Goal, models.Milestone.goal_id == models.Goal.id).filter(models.Goal.user_id == user.id, models.Milestone.achieved == True).options(selectinload(models.Milestone.goal)).order_by(models.Milestone.achieved_at.desc()).limit(5))
    recent_milestones = result.scalars().all()
    
    goals_by_type = {}
    for goal in active_goals:
        goal_type_key = goal.goal_type or "unknown"
        goals_by_type[goal_type_key] = goals_by_type.get(goal_type_key, 0) + 1
        
    return {
        "active_goals_count": len(active_goals),
        "completed_goals_count": completed_goals,
        "average_progress": round(avg_progress, 1),
        "goals_by_type": goals_by_type,
        "active_goals": [
            {
                "id": g.id, "title": g.title or "Untitled Goal", "goal_type": g.goal_type or "personal", "priority": g.priority or "medium", "progress": g.progress or 0.0,
                "target_date": g.target_date.strftime("%Y-%m-%d") if g.target_date else None,
                "subgoals_completed": len([sg for sg in g.subgoals if sg.status == 'completed']),
                "subgoals_total": len(g.subgoals or []),
            } for g in active_goals
        ],
        "recent_milestones": [
            {"title": m.title or "Untitled Milestone", "goal": m.goal.title if m.goal and m.goal.title else "Unknown Goal", "achieved_at": m.achieved_at.strftime("%Y-%m-%d") if m.achieved_at else None, "celebration": m.celebration_note or ""}
            for m in recent_milestones
        ],
    }

@router.get("/goals/{github_username}/{goal_id}", response_model=models.GoalResponse)
async def get_goal_detail(github_username: str, goal_id: int, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    goal = await crud_goal.get(db, id=goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.patch("/goals/{github_username}/{goal_id}")
async def update_goal(github_username: str, goal_id: int, update: models.GoalUpdateRequest, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == user.id))
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if update.title: goal.title = update.title
    if update.description: goal.description = update.description
    if update.priority: goal.priority = update.priority
    if update.status:
        goal.status = update.status
        if update.status == 'completed' and not goal.completed_at: goal.completed_at = datetime.utcnow()
    if update.target_date: goal.target_date = update.target_date
    if update.success_criteria:
        goal.success_criteria = {"criteria": update.success_criteria}
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(goal, "success_criteria")
    goal.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(goal)
    return {"message": "Goal updated", "goal": goal}

@router.post("/goals/{github_username}/{goal_id}/progress")
async def log_progress(github_username: str, goal_id: int, progress: models.GoalProgressCreate, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == user.id))
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    progress_log = models.GoalProgress(goal_id=goal.id, progress=progress.progress, notes=progress.notes, mood=progress.mood, obstacles=progress.obstacles, wins=progress.wins)
    db.add(progress_log)
    goal.progress = progress.progress
    goal.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(progress_log)
    
    try:
        # Assuming sage_crew.analyze_goal_progress will be updated to async
        analysis = await sage_crew.analyze_goal_progress(
            goal,
            {"progress": progress.progress, "notes": progress.notes, "obstacles": progress.obstacles, "wins": progress.wins, "mood": progress.mood},
            user.id, db
        )
        progress_log.ai_feedback = analysis["feedback"]
        await db.commit()
        return {"message": "Progress logged", "progress_id": progress_log.id, "ai_feedback": analysis["feedback"], "progress_rate": analysis["progress_rate"], "needs_attention": analysis["needs_attention"]}
    except Exception as e:
        print(f"❌ Progress analysis failed: {str(e)}")
        return {"message": "Progress logged (AI analysis unavailable)", "progress_id": progress_log.id}

@router.get("/goals/{github_username}/{goal_id}/progress", response_model=List[models.GoalProgressResponse])
async def get_progress_history(github_username: str, goal_id: int, limit: int = 20, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == user.id))
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    result = await db.execute(select(models.GoalProgress).filter(models.GoalProgress.goal_id == goal.id).order_by(models.GoalProgress.timestamp.desc()).limit(limit))
    return result.scalars().all()

@router.post("/goals/{github_username}/{goal_id}/subgoals")
async def create_subgoal(github_username: str, goal_id: int, subgoal: models.SubGoalCreate, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == user.id))
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    new_subgoal = models.SubGoal(goal_id=goal.id, title=subgoal.title, description=subgoal.description, order=subgoal.order, target_date=subgoal.target_date)
    db.add(new_subgoal)
    await db.commit()
    await db.refresh(new_subgoal)
    
    if subgoal.tasks:
        for task_data in subgoal.tasks:
            db.add(models.Task(subgoal_id=new_subgoal.id, title=task_data.title, description=task_data.description, priority=task_data.priority, estimated_hours=task_data.estimated_hours, due_date=task_data.due_date))
        await db.commit()
    return {"message": "Subgoal created", "subgoal": new_subgoal}

@router.patch("/goals/{github_username}/{goal_id}/subgoals/{subgoal_id}")
async def update_subgoal_status(github_username: str, goal_id: int, subgoal_id: int, status: str, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.SubGoal).join(models.Goal).filter(models.SubGoal.id == subgoal_id, models.SubGoal.goal_id == goal_id, models.Goal.user_id == user.id).options(selectinload(models.SubGoal.parent_goal).selectinload(models.Goal.subgoals)))
    subgoal = result.scalars().first()
    if not subgoal:
        raise HTTPException(status_code=404, detail="Subgoal not found")
    
    subgoal.status = status
    if status == 'completed':
        subgoal.completed_at = datetime.utcnow()
        subgoal.progress = 100.0
    await db.commit()
    
    goal = subgoal.parent_goal
    total_subgoals = len(goal.subgoals)
    completed_subgoals = len([sg for sg in goal.subgoals if sg.status == 'completed'])
    goal.progress = (completed_subgoals / total_subgoals * 100) if total_subgoals > 0 else 0
    await db.commit()
    return {"message": "Subgoal updated", "goal_progress": goal.progress}

@router.post("/goals/{github_username}/{goal_id}/milestones/{milestone_id}/achieve")
async def achieve_milestone(github_username: str, goal_id: int, milestone_id: int, celebration_note: str = None, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.Milestone).join(models.Goal).filter(models.Milestone.id == milestone_id, models.Milestone.goal_id == goal_id, models.Goal.user_id == user.id))
    milestone = result.scalars().first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    milestone.achieved = True
    milestone.achieved_at = datetime.utcnow()
    milestone.celebration_note = celebration_note
    await db.commit()
    return {"message": "🎉 Milestone achieved!", "milestone": milestone.title}

@router.get("/goals/{github_username}/weekly-review")
async def get_weekly_review(github_username: str, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        # Assuming sage_crew.weekly_goals_review will be updated to async
        return await sage_crew.weekly_goals_review(user.id, db)
    except Exception as e:
        print(f"❌ Weekly review failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate review")

    task.status = status
    if status == 'completed' and not task.completed_at:
        task.completed_at = datetime.utcnow()
    elif status != 'completed':
        task.completed_at = None
    await db.commit()
    await db.refresh(task)
    return {"message": "Task updated successfully", "task": task}

    await db.delete(goal)
    await db.commit()
    return {"message": "Goal deleted successfully"}

@router.post("/goals/{github_username}/{goal_id}/milestones", response_model=models.MilestoneResponse)
async def create_milestone(github_username: str, goal_id: int, milestone: models.MilestoneCreate, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.Goal).filter(models.Goal.id == goal_id, models.Goal.user_id == user.id))
    goal = result.scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    new_milestone = models.Milestone(goal_id=goal.id, title=milestone.title, description=milestone.description, target_date=milestone.target_date)
    db.add(new_milestone)
    await db.commit()
    await db.refresh(new_milestone)
    return new_milestone

@router.put("/goals/{github_username}/{goal_id}/milestones/{milestone_id}")
async def update_milestone(github_username: str, goal_id: int, milestone_id: int, update: models.MilestoneCreate, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.Milestone).join(models.Goal).filter(models.Milestone.id == milestone_id, models.Milestone.goal_id == goal_id, models.Goal.user_id == user.id))
    milestone = result.scalars().first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    milestone.title = update.title
    milestone.description = update.description
    milestone.target_date = update.target_date
    await db.commit()
    await db.refresh(milestone)
    return {"message": "Milestone updated", "milestone": milestone}

@router.delete("/goals/{github_username}/{goal_id}/milestones/{milestone_id}")
async def delete_milestone(github_username: str, goal_id: int, milestone_id: int, db: AsyncSession = Depends(get_user_db), system_db: AsyncSession = Depends(get_system_db)):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.Milestone).join(models.Goal).filter(models.Milestone.id == milestone_id, models.Milestone.goal_id == goal_id, models.Goal.user_id == user.id))
    milestone = result.scalars().first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    await db.delete(milestone)
    await db.commit()
    return {"message": "Milestone deleted successfully"}
