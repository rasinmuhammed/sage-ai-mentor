from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc
from typing import List, Optional
from datetime import datetime, timedelta, time
import models
from models import CheckInCreate, CheckInUpdate, CheckInResponse
from database import get_user_db, get_system_db
from services import sage_crew, gamification_service
from services.cache import cached, invalidate_user_cache

router = APIRouter()

# --- Helper Functions ---

def calculate_streak(checkins: list) -> dict:
    if not checkins:
        return {"current": 0, "best": 0}
    current_streak = 0
    for checkin in checkins:
        if checkin.shipped:
            current_streak += 1
        else:
            break
    return {"current": current_streak, "type": "shipping" if current_streak > 0 else "none"}

def calculate_streaks_detailed(checkins: list) -> tuple:
    if not checkins:
        return 0, 0
    current_streak = 0
    best_streak = 0
    temp_streak = 0
    for checkin in reversed(checkins):
        if checkin.shipped:
            temp_streak += 1
            best_streak = max(best_streak, temp_streak)
        else:
            temp_streak = 0
    for checkin in checkins:
        if checkin.shipped:
            current_streak += 1
        else:
            break
    return current_streak, best_streak

def get_weekly_breakdown(checkins: list) -> list:
    weeks = {}
    for checkin in checkins:
        week_start = checkin.timestamp.date() - timedelta(days=checkin.timestamp.weekday())
        week_key = week_start.strftime("%Y-%m-%d")
        if week_key not in weeks:
            weeks[week_key] = {"shipped": 0, "failed": 0}
        if checkin.shipped:
            weeks[week_key]["shipped"] += 1
        else:
            weeks[week_key]["failed"] += 1
    return [
        {"week_start": week, "shipped": data["shipped"], "failed": data["failed"], "rate": round((data["shipped"] / (data["shipped"] + data["failed"]) * 100), 1)}
        for week, data in sorted(weeks.items(), reverse=True)[:4]
    ]

# --- Endpoints ---

@router.post("/checkins/{github_username}")
async def create_checkin(
    github_username: str,
    checkin: CheckInCreate,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id
    ).order_by(models.CheckIn.timestamp.desc()).limit(7))
    recent_checkins = result.scalars().all()
    
    history = {
        "recent_checkins": len(recent_checkins),
        "avg_energy": sum(c.energy_level for c in recent_checkins) / len(recent_checkins) if recent_checkins else 0,
        "commitments_kept": sum(1 for c in recent_checkins if c.shipped) if recent_checkins else 0
    }
    
    analysis = await sage_crew.quick_checkin_analysis(
        {
            "energy_level": checkin.energy_level,
            "avoiding_what": checkin.avoiding_what,
            "commitment": checkin.commitment,
            "mood": checkin.mood
        },
        history,
        api_key=x_groq_key
    )
    
    new_checkin = models.CheckIn(
        user_id=user.id,
        energy_level=checkin.energy_level,
        avoiding_what=checkin.avoiding_what,
        commitment=checkin.commitment,
        mood=checkin.mood,
        ai_analysis=analysis["analysis"]
    )
    db.add(new_checkin)
    
    advice = models.AgentAdvice(
        user_id=user.id,
        agent_name="Psychologist",
        advice=analysis["analysis"],
        evidence={"checkin": checkin.dict()},
        interaction_type="checkin"
    )
    db.add(advice)
    
    await db.commit()
    await db.refresh(new_checkin)
    invalidate_user_cache(github_username)
    
    return {
        "checkin_id": new_checkin.id,
        "ai_response": analysis["analysis"],
        "message": "Check-in recorded"
    }

@router.patch("/checkins/{github_username}/{checkin_id}/evening")
async def evening_checkin(
    github_username: str,
    checkin_id: int,
    update: CheckInUpdate,
    db: AsyncSession = Depends(get_user_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    result = await db.execute(select(models.CheckIn).filter(models.CheckIn.id == checkin_id))
    checkin = result.scalars().first()
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    
    checkin.shipped = update.shipped
    checkin.excuse = update.excuse
    await db.commit()
    
    feedback = await sage_crew.evening_checkin_review(
        checkin.commitment,
        update.shipped,
        update.excuse,
        api_key=x_groq_key
    )
    
    return {"message": "Evening check-in recorded", "ai_feedback": feedback["feedback"]}

@cached(ttl=60)
@router.get("/checkins/{github_username}", response_model=List[CheckInResponse])
async def get_checkins(
    github_username: str,
    limit: int = 30,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id
    ).order_by(models.CheckIn.timestamp.desc()).limit(limit))
    checkins = result.scalars().all()
    
    return checkins

@router.get("/commitments/{github_username}/today")
async def get_today_commitment(
    github_username: str, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    today_start = datetime.combine(datetime.now().date(), time.min)
    today_end = datetime.combine(datetime.now().date(), time.max)
    
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= today_start,
        models.CheckIn.timestamp <= today_end
    ).order_by(models.CheckIn.timestamp.desc()))
    checkin = result.scalars().first()
    
    if not checkin:
        return {"has_commitment": False, "message": "No check-in today"}
    
    hours_since = (datetime.now() - checkin.timestamp).total_seconds() / 3600
    current_hour = datetime.now().hour
    should_review = current_hour >= 18 and checkin.shipped is None
    
    return {
        "has_commitment": True,
        "checkin_id": checkin.id,
        "commitment": checkin.commitment,
        "energy_level": checkin.energy_level,
        "avoiding_what": checkin.avoiding_what,
        "created_at": checkin.timestamp.isoformat(),
        "hours_since": round(hours_since, 1),
        "shipped": checkin.shipped,
        "excuse": checkin.excuse,
        "needs_review": should_review,
        "can_review": current_hour >= 17
    }

@router.get("/commitments/{github_username}/pending")
async def get_pending_commitments(
    github_username: str, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    week_ago = datetime.now() - timedelta(days=7)
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= week_ago,
        models.CheckIn.shipped == None
    ).order_by(models.CheckIn.timestamp.desc()))
    pending = result.scalars().all()
    
    return {
        "pending_count": len(pending),
        "commitments": [
            {"id": c.id, "commitment": c.commitment, "date": c.timestamp.strftime("%Y-%m-%d"), "days_ago": (datetime.now().date() - c.timestamp.date()).days}
            for c in pending
        ]
    }



# ... (existing code)

@router.post("/commitments/{github_username}/{checkin_id}/review")
async def review_commitment(
    github_username: str,
    checkin_id: int,
    review: CheckInUpdate,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await db.execute(select(models.CheckIn).filter(models.CheckIn.id == checkin_id))
    checkin = result.scalars().first()
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    
    checkin.shipped = review.shipped
    checkin.excuse = review.excuse
    await db.commit()
    await db.refresh(checkin)
    
    # Gamification: Award XP and update streak if shipped
    if review.shipped:
        await gamification_service.award_xp(system_db, checkin.user_id, 50, "Daily Commitment Shipped")
        await gamification_service.update_streak(system_db, checkin.user_id)
    
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == checkin.user_id,
        models.CheckIn.shipped != None
    ).order_by(models.CheckIn.timestamp.desc()).limit(10))
    recent_checkins = result.scalars().all()
    
    shipped_count = sum(1 for c in recent_checkins if c.shipped)
    total_count = len(recent_checkins)
    
    feedback = await sage_crew.evening_checkin_review(checkin.commitment, review.shipped, review.excuse)
    
    advice = models.AgentAdvice(
        user_id=checkin.user_id,
        agent_name="Contrarian",
        advice=feedback["feedback"],
        evidence={
            "commitment": checkin.commitment,
            "shipped": review.shipped,
            "excuse": review.excuse,
            "recent_success_rate": f"{shipped_count}/{total_count}" if total_count > 0 else "0/0"
        },
        interaction_type="evening_review"
    )
    db.add(advice)
    await db.commit()
    
    return {
        "message": "Commitment reviewed",
        "shipped": review.shipped,
        "feedback": feedback["feedback"],
        "success_rate": f"{shipped_count}/{total_count}" if total_count > 0 else "N/A",
        "streak_info": calculate_streak(recent_checkins)
    }

@router.get("/commitments/{github_username}/stats")
async def get_commitment_stats(
    github_username: str,
    days: int = 30,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    since = datetime.now() - timedelta(days=days)
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= since,
        models.CheckIn.shipped != None
    ).order_by(models.CheckIn.timestamp.desc()))
    checkins = result.scalars().all()
    
    if not checkins:
        return {"total_commitments": 0, "shipped": 0, "failed": 0, "success_rate": 0, "current_streak": 0, "best_streak": 0, "common_excuses": []}
    
    shipped_count = sum(1 for c in checkins if c.shipped)
    failed_count = len(checkins) - shipped_count
    current_streak, best_streak = calculate_streaks_detailed(checkins)
    
    excuses = [c.excuse for c in checkins if c.excuse and not c.shipped]
    excuse_counter = {}
    for excuse in excuses:
        words = excuse.lower().split()
        for word in ['time', 'tired', 'hard', 'busy', 'complex', 'stuck']:
            if word in words:
                excuse_counter[word] = excuse_counter.get(word, 0) + 1
    common_excuses = sorted(excuse_counter.items(), key=lambda x: x[1], reverse=True)[:3]
    
    return {
        "period_days": days,
        "total_commitments": len(checkins),
        "shipped": shipped_count,
        "failed": failed_count,
        "success_rate": round((shipped_count / len(checkins) * 100), 1),
        "current_streak": current_streak,
        "best_streak": best_streak,
        "common_excuses": [{"excuse": e[0], "count": e[1]} for e in common_excuses],
        "weekly_breakdown": get_weekly_breakdown(checkins)
    }

@router.get("/commitments/{github_username}/streak-detailed")
async def get_streak_detailed(
    github_username: str,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.shipped != None
    ).order_by(models.CheckIn.timestamp.desc()))
    checkins = result.scalars().all()
    
    current_streak, best_streak = calculate_streaks_detailed(checkins)
    
    today_start = datetime.combine(datetime.now().date(), time.min)
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= today_start
    ))
    today_checkin = result.scalars().first()
    
    has_checked_in_today = today_checkin is not None
    at_risk = current_streak > 0 and not has_checked_in_today
    
    # Count distinct days active
    # Note: func.count(func.distinct(func.date(...))) might be dialect specific.
    # For SQLite it's func.date, for Postgres it might be different or cast(Date).
    # Let's try generic func.date or cast.
    # Since we use Postgres for user DB, we can use func.date(timestamp) or cast(timestamp as Date).
    # However, func.date is not standard SQL.
    # Let's fetch all dates and count in python if needed, or try a simple query.
    # Or just use count() of checkins for now as approximation if distinct date query is complex.
    # But let's try to keep it correct.
    # In Postgres: count(distinct cast(timestamp as date))
    from sqlalchemy import cast, Date
    result = await db.execute(select(func.count(func.distinct(cast(models.CheckIn.timestamp, Date)))).filter(models.CheckIn.user_id == user.id))
    total_days_active = result.scalar()
    
    last_checkin = checkins[0].timestamp if checkins else None
    
    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "has_checked_in_today": has_checked_in_today,
        "at_risk": at_risk,
        "total_days_active": total_days_active or 0,
        "last_checkin_date": last_checkin.isoformat() if last_checkin else None
    }

@router.get("/commitments/{github_username}/reminder-needed")
async def check_reminder_needed(
    github_username: str, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        return {"needs_reminder": False}
    
    today_start = datetime.combine(datetime.now().date(), time.min)
    today_end = datetime.combine(datetime.now().date(), time.max)
    current_hour = datetime.now().hour
    
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= today_start,
        models.CheckIn.timestamp <= today_end,
        models.CheckIn.shipped == None
    ))
    checkin = result.scalars().first()
    
    if not checkin:
        return {"needs_reminder": False, "reason": "no_commitment_today"}
    
    if current_hour >= 20:
        return {"needs_reminder": True, "type": "urgent", "message": "⚠️ Did you ship what you promised today?", "commitment": checkin.commitment, "checkin_id": checkin.id}
    elif current_hour >= 18:
        return {"needs_reminder": True, "type": "gentle", "message": "🔔 Time to review: Did you ship today's commitment?", "commitment": checkin.commitment, "checkin_id": checkin.id}
    
    return {"needs_reminder": False, "reason": "too_early", "check_back_at": "18:00"}

@router.get("/commitments/{github_username}/weekly-summary")
async def get_weekly_summary(
    github_username: str,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    four_weeks_ago = datetime.now() - timedelta(days=28)
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= four_weeks_ago,
        models.CheckIn.shipped != None
    ).order_by(models.CheckIn.timestamp.asc()))
    checkins = result.scalars().all()
    
    weeks = {}
    for checkin in checkins:
        week_start = checkin.timestamp.date() - timedelta(days=checkin.timestamp.weekday())
        week_key = week_start.strftime("%Y-%m-%d")
        if week_key not in weeks:
            weeks[week_key] = {"shipped": 0, "failed": 0, "total_energy": 0, "count": 0, "commitments": []}
        weeks[week_key]["count"] += 1
        weeks[week_key]["total_energy"] += checkin.energy_level
        weeks[week_key]["commitments"].append({"text": checkin.commitment, "shipped": checkin.shipped, "date": checkin.timestamp.strftime("%Y-%m-%d")})
        if checkin.shipped:
            weeks[week_key]["shipped"] += 1
        else:
            weeks[week_key]["failed"] += 1
            
    summary = []
    for week_start, data in sorted(weeks.items(), reverse=True):
        summary.append({
            "week_start": week_start,
            "shipped": data["shipped"],
            "failed": data["failed"],
            "success_rate": round((data["shipped"] / data["count"] * 100), 1) if data["count"] > 0 else 0,
            "avg_energy": round(data["total_energy"] / data["count"], 1) if data["count"] > 0 else 0,
            "commitments": data["commitments"]
        })
    return {"weeks": summary, "total_weeks": len(summary)}

@router.get("/commitments/{github_username}/stats/comparison")
async def get_stats_comparison(
    github_username: str, 
    days: int = 7, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_start = datetime.now() - timedelta(days=days)
    result = await db.execute(select(models.CheckIn).filter(models.CheckIn.user_id == user.id, models.CheckIn.timestamp >= current_start, models.CheckIn.shipped != None))
    current_checkins = result.scalars().all()
    
    previous_start = datetime.now() - timedelta(days=days * 2)
    result = await db.execute(select(models.CheckIn).filter(models.CheckIn.user_id == user.id, models.CheckIn.timestamp >= previous_start, models.CheckIn.timestamp < current_start, models.CheckIn.shipped != None))
    previous_checkins = result.scalars().all()
    
    def calculate_stats(checkins):
        if not checkins: return {"success_rate": 0, "avg_energy": 0, "total": 0}
        shipped = sum(1 for c in checkins if c.shipped)
        return {"success_rate": (shipped / len(checkins) * 100), "avg_energy": sum(c.energy_level for c in checkins) / len(checkins), "total": len(checkins)}
    
    return {"current": calculate_stats(current_checkins), "previous": calculate_stats(previous_checkins), "period_days": days}
