from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import models
from database import get_user_db, get_system_db
from services.cache import get_cached_dashboard, cache_dashboard

router = APIRouter()

@router.get("/dashboard/{github_username}")
async def get_dashboard(
    github_username: str, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    cached_data = get_cached_dashboard(github_username)
    if cached_data:
        return cached_data
    
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.GitHubAnalysis).filter(
        models.GitHubAnalysis.user_id == user.id
    ).order_by(models.GitHubAnalysis.analyzed_at.desc()))
    github_analysis = result.scalars().first()
    
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id
    ).order_by(models.CheckIn.timestamp.desc()).limit(7))
    checkins = result.scalars().all()
    
    result = await db.execute(select(models.AgentAdvice).filter(
        models.AgentAdvice.user_id == user.id
    ).order_by(models.AgentAdvice.created_at.desc()).limit(3))
    latest_advice = result.scalars().all()
    
    total_checkins = len(checkins)
    commitments_kept = sum(1 for c in checkins if c.shipped == True)
    avg_energy = sum(c.energy_level for c in checkins) / total_checkins if total_checkins > 0 else 0
    
    dashboard_data = {
        "user": {
            "username": user.github_username,
            "full_name": user.full_name,
            "member_since": user.created_at.strftime("%Y-%m-%d") if user.created_at else "N/A"
        },
        "github": {
            "total_repos": github_analysis.total_repos if github_analysis else 0,
            "active_repos": github_analysis.active_repos if github_analysis else 0,
            "languages": github_analysis.languages if github_analysis else {},
            "patterns": github_analysis.patterns if github_analysis else []
        },
        "stats": {
            "total_checkins": total_checkins,
            "commitments_kept": commitments_kept,
            "success_rate": (commitments_kept / total_checkins * 100) if total_checkins > 0 else 0,
            "avg_energy": round(avg_energy, 1)
        },
        "recent_advice": [
            {
                "id": a.id,
                "agent": a.agent_name,
                "advice": a.advice[:200] + "..." if len(a.advice) > 200 else a.advice,
                "date": a.created_at.strftime("%Y-%m-%d"),
                "type": a.interaction_type
            }
            for a in latest_advice
        ]
    }
    
    cache_dashboard(github_username, dashboard_data)
    return dashboard_data
