```
import time
import schedule
import asyncio
from database import SystemSessionLocal, get_user_db_engine
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
import models
from services import email_service
from datetime import datetime

async def check_notifications():
    """Check notifications for all active users (Async)"""
    async with SystemSessionLocal() as db:
        try:
            result = await db.execute(select(models.User))
            users = result.scalars().all()
            
            print(f"🔔 Checking notifications for {len(users)} users...")
            # Logic for notifications would go here, potentially using NotificationService
            # For now, we just print
            
        except Exception as e:
            print(f"❌ Error in notification check: {str(e)}")

async def process_daily_emails():
    """Send daily digest emails"""
    print("📧 Processing daily emails...")
    async with SystemSessionLocal() as system_db:
        try:
            result = await system_db.execute(select(models.User))
            users = result.scalars().all()
            
            for user in users:
                if not user.email or not user.neon_db_url:
                    continue
                    
                try:
                    # In a real implementation, we would fetch user stats here
                    # For now, we send a generic digest
                    stats = {
                        "streak": 0, # Placeholder
                        "pending_tasks": ["Check your Action Plan", "Review your Goals"],
                        "quote": "Consistency is the key to mastery."
                    }
                    await email_service.send_daily_digest(user.email, user.github_username, stats)
                except Exception as e:
                    print(f"❌ Error sending daily email to {user.github_username}: {e}")
        except Exception as e:
             print(f"❌ Error fetching users for daily email: {e}")

async def process_weekly_emails():
    """Send weekly review emails"""
    print("📧 Processing weekly emails...")
    async with SystemSessionLocal() as system_db:
        try:
            result = await system_db.execute(select(models.User))
            users = result.scalars().all()
            
            for user in users:
                if not user.email or not user.neon_db_url:
                    continue
                    
                try:
                    # Create user DB session
                    engine = get_user_db_engine(user.neon_db_url)
                    UserSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
                    
                    async with UserSessionLocal() as user_db:
                        # Generate report using Sage Crew
                        from services import sage_crew
                        report = await sage_crew.weekly_goals_review(user.id, user_db)
                        
                        # Send email
                        await email_service.send_weekly_review(user.email, user.github_username, report)
                        print(f"✅ Sent weekly review to {user.github_username}")
                    
                except Exception as e:
                    print(f"❌ Error sending weekly email to {user.github_username}: {e}")
        except Exception as e:
             print(f"❌ Error fetching users for weekly email: {e}")

async def process_nudge_emails():
    """Send nudge emails to inactive users"""
    print("📧 Processing nudge emails...")
    async with SystemSessionLocal() as system_db:
        try:
            result = await system_db.execute(select(models.User))
            users = result.scalars().all()
            
            for user in users:
                if not user.email:
                    continue
                
                # Check inactivity
                if user.last_activity_date:
                    days_inactive = (datetime.utcnow() - user.last_activity_date).days
                    if days_inactive >= 2:
                        try:
                            await email_service.send_nudge_email(user.email, user.github_username, days_inactive)
                            print(f"✅ Sent nudge email to {user.github_username} ({days_inactive} days inactive)")
                        except Exception as e:
                            print(f"❌ Error sending nudge to {user.github_username}: {e}")
        except Exception as e:
            print(f"❌ Error checking inactivity: {e}")

def run_async_job(job_func):
    """Helper to run async jobs synchronously"""
    asyncio.run(job_func())

def run_scheduler():
    """Run the notification scheduler"""
    print("🚀 Starting Sage Scheduler...")
    print("⏰ Schedule:")
    print("   - Notifications: Every 30 mins")
    print("   - Daily Digest: 08:00 AM")
    print("   - Weekly Review: Sunday 08:00 PM")
    print("   - Nudge Emails: Daily 10:00 AM")
    print("Press Ctrl+C to stop\n")
    
    # Schedule jobs
    schedule.every(30).minutes.do(lambda: run_async_job(check_notifications))
    schedule.every().day.at("08:00").do(lambda: run_async_job(process_daily_emails))
    schedule.every().sunday.at("20:00").do(lambda: run_async_job(process_weekly_emails))
    schedule.every().day.at("10:00").do(lambda: run_async_job(process_nudge_emails))
    
    # Run once on startup for testing (optional, maybe comment out in prod)
    # run_async_job(check_notifications)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    try:
        run_scheduler()
    except KeyboardInterrupt:
        print("\n\n👋 Scheduler stopped")
```