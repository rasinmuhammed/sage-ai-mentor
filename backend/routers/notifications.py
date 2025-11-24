from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime, timedelta
import models
from models import NotificationResponse, NotificationStats
from database import get_user_db, get_system_db
from services.notification_service import NotificationService

router = APIRouter()

@router.get("/notifications/{github_username}", response_model=List[NotificationResponse])
async def get_notifications(
    github_username: str, 
    unread_only: bool = False, 
    limit: int = 50, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    query = select(models.Notification).filter(models.Notification.user_id == user.id)
    if unread_only:
        query = query.filter(models.Notification.read == False)
    
    result = await db.execute(query.order_by(models.Notification.created_at.desc()).limit(limit))
    notifications = result.scalars().all()
    return [models.NotificationResponse.from_orm(n) for n in notifications]

@router.get("/notifications/{github_username}/stats", response_model=NotificationStats)
async def get_notification_stats(
    github_username: str, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(func.count(models.Notification.id)).filter(models.Notification.user_id == user.id))
    total = result.scalar()
    
    result = await db.execute(select(func.count(models.Notification.id)).filter(models.Notification.user_id == user.id, models.Notification.read == False))
    unread = result.scalar()
    
    result = await db.execute(select(models.Notification).filter(models.Notification.user_id == user.id))
    all_notifications = result.scalars().all()
    by_type = {}
    for notif in all_notifications:
        by_type[notif.notification_type] = by_type.get(notif.notification_type, 0) + 1
    
    day_ago = datetime.utcnow() - timedelta(days=1)
    result = await db.execute(select(func.count(models.Notification.id)).filter(models.Notification.user_id == user.id, models.Notification.created_at >= day_ago))
    recent_count = result.scalar()
    
    return {"total": total, "unread": unread, "by_type": by_type, "recent_count": recent_count}

@router.patch("/notifications/{github_username}/{notification_id}/read")
async def mark_notification_read(
    github_username: str, 
    notification_id: int, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    result = await db.execute(select(models.Notification).filter(models.Notification.id == notification_id, models.Notification.user_id == user.id))
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.read = True
    notification.read_at = datetime.utcnow()
    await db.commit()
    return {"message": "Notification marked as read"}

@router.post("/notifications/{github_username}/mark-all-read")
async def mark_all_notifications_read(
    github_username: str, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update statement in async is a bit different, usually we fetch and update or use update() construct
    # For simplicity and ORM consistency, let's fetch and update
    result = await db.execute(select(models.Notification).filter(models.Notification.user_id == user.id, models.Notification.read == False))
    notifications = result.scalars().all()
    
    for notif in notifications:
        notif.read = True
        notif.read_at = datetime.utcnow()
        
    await db.commit()
    return {"message": "All notifications marked as read"}

@router.delete("/notifications/{github_username}/{notification_id}")
async def delete_notification(
    github_username: str, 
    notification_id: int, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    result = await db.execute(select(models.Notification).filter(models.Notification.id == notification_id, models.Notification.user_id == user.id))
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    await db.delete(notification)
    await db.commit()
    return {"message": "Notification deleted"}

@router.post("/notifications/{github_username}/check")
async def check_and_create_notifications(
    github_username: str, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await NotificationService.run_all_checks(db, user.id)
    return {"message": "Notification checks completed"}
