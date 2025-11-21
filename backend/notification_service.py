from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import models
from typing import Dict, Optional

class NotificationService:
    """Service for creating and managing notifications"""
    
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: int,
        title: str,
        message: str,
        notification_type: str,
        priority: str = "normal",
        action_url: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> models.Notification:
        """Create a new notification"""
        notification = models.Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority,
            action_url=action_url,
            extra_data=metadata or {}  # Use extra_data instead of metadata
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        return notification
    
    @staticmethod
    async def check_commitment_reminder(db: AsyncSession, user_id: int) -> Optional[models.Notification]:
        """Check if user needs a commitment reminder and create notification if needed"""
        today_start = datetime.combine(datetime.now().date(), datetime.min.time())
        today_end = datetime.combine(datetime.now().date(), datetime.max.time())
        current_hour = datetime.now().hour
        
        # Check if there's a commitment today that needs review
        result = await db.execute(select(models.CheckIn).filter(
            models.CheckIn.user_id == user_id,
            models.CheckIn.timestamp >= today_start,
            models.CheckIn.timestamp <= today_end,
            models.CheckIn.shipped == None
        ))
        checkin = result.scalars().first()
        
        if not checkin:
            return None
        
        # Check if notification already exists today
        result = await db.execute(select(models.Notification).filter(
            models.Notification.user_id == user_id,
            models.Notification.notification_type == 'commitment_reminder',
            models.Notification.created_at >= today_start,
            models.Notification.read == False
        ))
        existing = result.scalars().first()
        
        if existing:
            return None
        
        # Create notification based on time
        if current_hour >= 20:  # 8 PM - Urgent
            return await NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title="⚠️ Did you ship today?",
                message=f"Your commitment: '{checkin.commitment}' - Time to review!",
                notification_type="commitment_reminder",
                priority="urgent",
                action_url="/commitments",
                metadata={"checkin_id": checkin.id, "commitment": checkin.commitment}
            )
        elif current_hour >= 18:  # 6 PM - High priority
            return await NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title="🔔 Review your commitment",
                message=f"Did you ship '{checkin.commitment}' today?",
                notification_type="commitment_reminder",
                priority="high",
                action_url="/commitments",
                metadata={"checkin_id": checkin.id}
            )
        
        return None
    
    @staticmethod
    async def check_goal_milestones(db: AsyncSession, user_id: int):
        """Check for goal milestones and create notifications"""
        # Get goals with upcoming milestones (within 7 days)
        week_ahead = datetime.now() + timedelta(days=7)
        
        result = await db.execute(select(models.Milestone).join(models.Goal).filter(
            models.Goal.user_id == user_id,
            models.Goal.status == 'active',
            models.Milestone.achieved == False,
            models.Milestone.target_date <= week_ahead,
            models.Milestone.target_date >= datetime.now()
        ))
        milestones = result.scalars().all()
        
        for milestone in milestones:
            # Check if notification already exists
            # Note: extra_data['milestone_id'].astext usage depends on DB dialect (Postgres)
            # For asyncpg/SQLAlchemy, we might need cast or just check in python if list is small
            # Or use proper JSON operators. For simplicity, let's query and filter in python if needed
            # But let's try to use the JSON operator if possible.
            # However, `astext` is specific to Postgres JSONB.
            # Let's assume we can query by JSON field if supported, or just check existence.
            
            # Safer approach for cross-DB compatibility (or just simplicity):
            # Check if we notified about this milestone recently (e.g. today)
            # Or fetch recent notifications and check in memory.
            
            # Let's try to filter by notification_type and iterate to check metadata
            # to avoid complex JSON queries for now.
            
            result = await db.execute(select(models.Notification).filter(
                models.Notification.user_id == user_id,
                models.Notification.notification_type == 'goal_milestone',
                models.Notification.read == False
            ))
            existing_notifs = result.scalars().all()
            
            already_notified = False
            for notif in existing_notifs:
                if notif.extra_data and str(notif.extra_data.get('milestone_id')) == str(milestone.id):
                    already_notified = True
                    break
            
            if not already_notified:
                # Need to fetch goal to get progress, milestone.goal might not be loaded if lazy
                # But we joined in the query, so it might be loaded if we used contains_eager or similar
                # Or we can just fetch it.
                # Let's fetch it to be safe or rely on lazy loading if async session supports it (it requires await)
                # AsyncSession requires explicit loading or awaitable attributes.
                # Let's fetch the goal.
                result = await db.execute(select(models.Goal).filter(models.Goal.id == milestone.goal_id))
                goal = result.scalars().first()
                
                days_left = (milestone.target_date - datetime.now()).days
                await NotificationService.create_notification(
                    db=db,
                    user_id=user_id,
                    title=f"🎯 Milestone approaching: {milestone.title}",
                    message=f"{days_left} days until target date. Current goal progress: {goal.progress:.0f}%",
                    notification_type="goal_milestone",
                    priority="normal" if days_left > 3 else "high",
                    action_url=f"/goals",
                    metadata={"milestone_id": milestone.id, "goal_id": milestone.goal_id, "days_left": days_left}
                )
    
    @staticmethod
    async def check_streak_achievements(db: AsyncSession, user_id: int):
        """Check for streak achievements and celebrate them"""
        # Get recent check-ins to calculate streak
        result = await db.execute(select(models.CheckIn).filter(
            models.CheckIn.user_id == user_id,
            models.CheckIn.shipped != None
        ).order_by(models.CheckIn.timestamp.desc()).limit(10))
        recent_checkins = result.scalars().all()
        
        if not recent_checkins:
            return
        
        # Calculate current streak
        current_streak = 0
        for checkin in recent_checkins:
            if checkin.shipped:
                current_streak += 1
            else:
                break
        
        # Celebrate milestone streaks
        milestone_streaks = [3, 7, 14, 30, 60, 100]
        
        if current_streak in milestone_streaks:
            # Check if we already celebrated this
            today_start = datetime.combine(datetime.now().date(), datetime.min.time())
            result = await db.execute(select(models.Notification).filter(
                models.Notification.user_id == user_id,
                models.Notification.notification_type == 'achievement',
                models.Notification.created_at >= today_start
            ))
            existing = result.scalars().first()
            
            if not existing:
                await NotificationService.create_notification(
                    db=db,
                    user_id=user_id,
                    title=f"🔥 {current_streak}-Day Streak!",
                    message=f"You've shipped {current_streak} commitments in a row! Keep the momentum going!",
                    notification_type="achievement",
                    priority="normal",
                    action_url="/commitments",
                    metadata={"streak": current_streak, "type": "shipping_streak"}
                )
    
    @staticmethod
    async def check_pattern_alerts(db: AsyncSession, user_id: int):
        """Check for negative patterns and alert user"""
        week_ago = datetime.now() - timedelta(days=7)
        
        # Get week's check-ins
        result = await db.execute(select(models.CheckIn).filter(
            models.CheckIn.user_id == user_id,
            models.CheckIn.timestamp >= week_ago,
            models.CheckIn.shipped != None
        ))
        checkins = result.scalars().all()
        
        if len(checkins) < 3:
            return
        
        # Check for declining energy pattern
        if len(checkins) >= 5:
            recent_energy = [c.energy_level for c in checkins[-3:]]
            older_energy = [c.energy_level for c in checkins[:3]]
            
            if sum(recent_energy) / 3 < sum(older_energy) / 3 - 2:
                # Check if we already alerted recently
                three_days_ago = datetime.now() - timedelta(days=3)
                result = await db.execute(select(models.Notification).filter(
                    models.Notification.user_id == user_id,
                    models.Notification.notification_type == 'pattern_alert',
                    models.Notification.created_at >= three_days_ago
                ))
                existing = result.scalars().first()
                
                if not existing:
                    await NotificationService.create_notification(
                        db=db,
                        user_id=user_id,
                        title="⚠️ Energy Levels Declining",
                        message="Your energy has been dropping. Consider taking a break or adjusting your workload.",
                        notification_type="pattern_alert",
                        priority="high",
                        action_url="/overview",
                        metadata={"pattern_type": "declining_energy"}
                    )
        
        # Check for consistent failures
        recent_fails = sum(1 for c in checkins[-5:] if c.shipped is False)
        if recent_fails >= 3:
            result = await db.execute(select(models.Notification).filter(
                models.Notification.user_id == user_id,
                models.Notification.notification_type == 'pattern_alert',
                models.Notification.created_at >= week_ago
            ))
            existing = result.scalars().first()
            
            if not existing:
                await NotificationService.create_notification(
                    db=db,
                    user_id=user_id,
                    title="📉 Multiple Missed Commitments",
                    message=f"You've missed {recent_fails} of your last 5 commitments. Time to reassess your goals?",
                    notification_type="pattern_alert",
                    priority="high",
                    action_url="/commitments",
                    metadata={"pattern_type": "commitment_failure", "count": recent_fails}
                )
    
    @staticmethod
    async def check_decision_reflection(db: AsyncSession, user_id: int):
        """Remind user to reflect on past decisions"""
        # Get decisions from 30, 60, 90 days ago
        reflection_periods = [30, 60, 90]
        
        for days in reflection_periods:
            target_date = datetime.now() - timedelta(days=days)
            date_range_start = target_date - timedelta(days=2)
            date_range_end = target_date + timedelta(days=2)
            
            result = await db.execute(select(models.LifeEvent).filter(
                models.LifeEvent.user_id == user_id,
                models.LifeEvent.timestamp >= date_range_start,
                models.LifeEvent.timestamp <= date_range_end
            ))
            decisions = result.scalars().all()
            
            for decision in decisions:
                # Check if we already reminded about this decision at this interval
                # Using python filtering for JSON metadata
                result = await db.execute(select(models.Notification).filter(
                    models.Notification.user_id == user_id,
                    models.Notification.notification_type == 'decision_reflection'
                ))
                existing_notifs = result.scalars().all()
                
                already_notified = False
                for notif in existing_notifs:
                    if (notif.extra_data and 
                        str(notif.extra_data.get('decision_id')) == str(decision.id) and 
                        str(notif.extra_data.get('days')) == str(days)):
                        already_notified = True
                        break
                
                if not already_notified:
                    await NotificationService.create_notification(
                        db=db,
                        user_id=user_id,
                        title=f"💭 {days}-Day Check-in",
                        message=f"It's been {days} days since '{decision.description[:50]}...'. How's it going?",
                        notification_type="decision_reflection",
                        priority="low",
                        action_url="/decisions",
                        metadata={"decision_id": decision.id, "days": days}
                    )
    
    @staticmethod
    async def run_all_checks(db: AsyncSession, user_id: int):
        """Run all notification checks for a user"""
        await NotificationService.check_commitment_reminder(db, user_id)
        await NotificationService.check_goal_milestones(db, user_id)
        await NotificationService.check_streak_achievements(db, user_id)
        await NotificationService.check_pattern_alerts(db, user_id)
        await NotificationService.check_decision_reflection(db, user_id)