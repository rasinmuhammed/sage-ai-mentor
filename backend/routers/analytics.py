from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_user_db as get_db, get_system_db
from models import User, Goal, ActionPlan, DailyTask, PomodoroSession
from typing import Dict, List
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/analytics/{github_username}")
async def get_analytics(
    github_username: str, 
    db: AsyncSession = Depends(get_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    # Get user from System DB
    result = await system_db.execute(select(User).filter(User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. Goal Progress
    goals_result = await db.execute(select(Goal).filter(Goal.user_id == user.id))
    goals = goals_result.scalars().all()
    
    active_goals = [g for g in goals if g.status == 'active']
    completed_goals = [g for g in goals if g.status == 'completed']
    
    goals_data = {
        "total": len(goals),
        "active": len(active_goals),
        "completed": len(completed_goals),
        "avg_progress": sum(g.progress for g in active_goals) / len(active_goals) if active_goals else 0
    }

    # 2. Focus Distribution (from Action Plans)
    plans_result = await db.execute(select(ActionPlan).filter(ActionPlan.user_id == user.id))
    plans = plans_result.scalars().all()
    
    focus_distribution = {}
    for plan in plans:
        area = plan.focus_area or "Uncategorized"
        focus_distribution[area] = focus_distribution.get(area, 0) + 1
    
    focus_chart_data = [{"name": k, "value": v} for k, v in focus_distribution.items()]

    # 3. Activity Heatmap (Mocked for now, ideally from DailyTasks + GitHub)
    # In a real app, we'd query DailyTasks grouped by date
    today = datetime.now().date()
    activity_data = []
    for i in range(30):
        date = today - timedelta(days=i)
        activity_data.append({
            "date": date.isoformat(),
            "count": (i * 3) % 10 # Dummy pattern
        })
    activity_data.reverse()



    # 4. Proactive Insights Logic
    insights = []
    
    # Insight: Goal Stagnation
    stagnant_goals = [g for g in active_goals if (datetime.utcnow() - g.updated_at).days > 7]
    if stagnant_goals:
        insights.append(f"Goal '{stagnant_goals[0].title}' hasn't seen progress in a week. Time to break it down?")

    # Insight: Focus Imbalance
    if focus_distribution:
        top_focus = max(focus_distribution.items(), key=lambda x: x[1])
        if top_focus[1] / len(plans) > 0.7:
            insights.append(f"You're heavily focused on '{top_focus[0]}'. Consider diversifying your skills.")

    # Insight: Consistency Streak (Mocked for now, but logic would go here)
    # if current_streak > 5:
    #     insights.append("Great consistency! You're on a 5-day streak.")

    if not insights:
        insights.append("Keep logging your progress to get personalized insights!")

    return {
        "goals": goals_data,
        "focus_distribution": focus_chart_data,
        "activity_heatmap": activity_data,
        "insights": insights
    }
