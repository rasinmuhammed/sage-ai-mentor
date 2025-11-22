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
                    # Placeholder stats (in real app, fetch from DB)
                    report = {
                        "week_score": 85,
                        "completed_goals": ["Finish Phase 9", "Deploy to Prod"],
                        "focus_hours": 12.5,
                        "top_skills": ["Python", "React"]
                    }
                    
                    await email_service.send_weekly_review(user.email, user.github_username, report)
                    
                except Exception as e:
                    print(f"❌ Error sending weekly email to {user.github_username}: {e}")
        except Exception as e:
             print(f"❌ Error fetching users for weekly email: {e}")

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
    print("Press Ctrl+C to stop\n")
    
    # Schedule jobs
    schedule.every(30).minutes.do(lambda: run_async_job(check_notifications))
    schedule.every().day.at("08:00").do(lambda: run_async_job(process_daily_emails))
    schedule.every().sunday.at("20:00").do(lambda: run_async_job(process_weekly_emails))
    
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