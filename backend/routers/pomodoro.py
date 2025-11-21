from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, time
import models
from models import PomodoroSessionCreate, PomodoroSessionResponse, PomodoroSessionUpdate, PomodoroStatsResponse
from database import get_user_db, get_system_db

router = APIRouter()

@router.post("/pomodoro/{github_username}/start", response_model=PomodoroSessionResponse)
async def start_pomodoro_session(
    github_username: str,
    session_data: PomodoroSessionCreate,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    new_session = models.PomodoroSession(
        user_id=user.id,
        session_type=session_data.session_type,
        duration_minutes=session_data.duration_minutes,
        checkin_id=session_data.checkin_id,
        commitment_description=session_data.commitment_description,
        started_at=datetime.utcnow()
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session

@router.post("/pomodoro/{github_username}/{session_id}/complete", response_model=PomodoroSessionResponse)
async def complete_pomodoro_session(
    github_username: str,
    session_id: int,
    update_data: PomodoroSessionUpdate,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    result = await db.execute(select(models.PomodoroSession).filter(models.PomodoroSession.id == session_id, models.PomodoroSession.user_id == user.id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.completed = True
    session.completed_at = datetime.utcnow()
    if update_data.notes: session.notes = update_data.notes
    if update_data.focus_rating: session.focus_rating = update_data.focus_rating
    if update_data.interruptions: session.interruptions = update_data.interruptions
    
    await db.commit()
    await db.refresh(session)
    return session

@router.patch("/pomodoro/{github_username}/{session_id}/pause")
async def pause_pomodoro_session(
    github_username: str,
    session_id: int,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    result = await db.execute(select(models.PomodoroSession).filter(models.PomodoroSession.id == session_id, models.PomodoroSession.user_id == user.id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.paused_at = datetime.utcnow()
    await db.commit()
    return {"message": "Session paused"}

@router.patch("/pomodoro/{github_username}/{session_id}/resume")
async def resume_pomodoro_session(
    github_username: str,
    session_id: int,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    result = await db.execute(select(models.PomodoroSession).filter(models.PomodoroSession.id == session_id, models.PomodoroSession.user_id == user.id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.paused_at = None
    await db.commit()
    return {"message": "Session resumed"}

@router.get("/pomodoro/{github_username}/active")
async def get_active_session(
    github_username: str,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Find session that is not completed
    result = await db.execute(select(models.PomodoroSession).filter(
        models.PomodoroSession.user_id == user.id,
        models.PomodoroSession.completed == False
    ).order_by(models.PomodoroSession.started_at.desc()))
    session = result.scalars().first()
    
    if session:
        return {"has_active_session": True, "session": session}
    else:
        return {"has_active_session": False}

@router.get("/pomodoro/{github_username}/stats", response_model=PomodoroStatsResponse)
async def get_pomodoro_stats(
    github_username: str,
    days: int = 7,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    since = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(select(models.PomodoroSession).filter(
        models.PomodoroSession.user_id == user.id,
        models.PomodoroSession.started_at >= since
    ))
    sessions = result.scalars().all()
    
    total_sessions = len(sessions)
    completed_sessions = sum(1 for s in sessions if s.completed)
    total_work_minutes = sum(s.duration_minutes for s in sessions if s.completed)
    
    rated_sessions = [s.focus_rating for s in sessions if s.focus_rating]
    avg_focus_rating = sum(rated_sessions) / len(rated_sessions) if rated_sessions else 0.0
    
    completion_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0.0
    
    today_start = datetime.combine(datetime.utcnow().date(), time.min)
    sessions_today = sum(1 for s in sessions if s.started_at >= today_start and s.completed)
    
    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "total_work_minutes": total_work_minutes,
        "avg_focus_rating": round(avg_focus_rating, 1),
        "completion_rate": round(completion_rate, 1),
        "sessions_today": sessions_today,
        "current_streak": 0, # Placeholder
        "best_streak": 0 # Placeholder
    }
