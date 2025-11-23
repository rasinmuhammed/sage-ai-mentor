import os
import httpx
from typing import List, Optional
from datetime import datetime

class EmailService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("RESEND_API_KEY")
        self.api_url = "https://api.resend.com/emails"
        self.sender = "Sage <onboarding@resend.dev>" # Default Resend sender, user should configure this

    async def send_email(self, to: str, subject: str, html_content: str):
        if not self.api_key:
            print(f"⚠️ Email Service: No API Key. Would have sent email to {to} with subject '{subject}'")
            return False

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "from": self.sender,
            "to": [to],
            "subject": subject,
            "html": html_content
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.api_url, json=payload, headers=headers)
                response.raise_for_status()
                print(f"✅ Email sent to {to}")
                return True
            except Exception as e:
                print(f"❌ Failed to send email: {e}")
                return False

    async def send_welcome_email(self, user_email: str, username: str):
        subject = "Welcome to Reflog 2.0! 🚀"
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #933DC9;">Welcome, {username}!</h1>
            <p>We're excited to have you on board. Reflog is your companion for growth, accountability, and mastery.</p>
            <p>Here's what you can do next:</p>
            <ul>
                <li>Set your first <strong>Goal</strong></li>
                <li>Create a <strong>30-Day Action Plan</strong></li>
                <li>Log a <strong>Life Decision</strong></li>
            </ul>
            <p>Let's grow together!</p>
            <p>- The Sage Team</p>
        </div>
        """
        return await self.send_email(user_email, subject, html)

    async def send_daily_digest(self, user_email: str, username: str, stats: dict):
        subject = f"Your Daily Briefing - {datetime.now().strftime('%b %d')}"
        
        tasks_html = ""
        for task in stats.get('pending_tasks', []):
            tasks_html += f"<li>{task}</li>"
            
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #933DC9;">Good Morning, {username}! ☀️</h2>
            <p>Here is your focus for today:</p>
            
            <h3>🎯 Today's Tasks</h3>
            <ul>
                {tasks_html if tasks_html else "<li>No specific tasks scheduled. Time to plan?</li>"}
            </ul>
            
            <p><strong>Current Streak:</strong> {stats.get('streak', 0)} days 🔥</p>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
                <strong>💡 Daily Wisdom:</strong><br>
                <em>"{stats.get('quote', 'Consistency is key.')}"</em>
            </div>
        </div>
        """
        return await self.send_email(user_email, subject, html)

    async def send_weekly_review(self, user_email: str, username: str, report: dict):
        subject = f"Weekly Review - {datetime.now().strftime('%b %d')}"
        
        goals_html = ""
        for goal in report.get('completed_goals', []):
            goals_html += f"<li>✅ {goal}</li>"
            
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #933DC9;">Weekly Review 📊</h1>
            <p>Great job this week, {username}!</p>
            
            <div style="display: flex; justify-content: space-between; background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #933DC9;">{report.get('week_score', 0)}</div>
                    <div style="font-size: 12px; color: #666;">Week Score</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #933DC9;">{report.get('focus_hours', 0)}h</div>
                    <div style="font-size: 12px; color: #666;">Focus Time</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #933DC9;">{len(report.get('completed_goals', []))}</div>
                    <div style="font-size: 12px; color: #666;">Goals Hit</div>
                </div>
            </div>
            
            <h3>🏆 Achievements</h3>
            <ul>
                {goals_html if goals_html else "<li>Keep pushing! Set some goals for next week.</li>"}
            </ul>
            
            <h3>💡 Sage's Insights</h3>
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #933DC9; font-style: italic;">
                {report.get('review_text', 'Keep up the consistency!')}
            </div>
            
            <p>Ready for next week? <a href="http://localhost:3000/dashboard" style="color: #933DC9;">Plan your week now</a>.</p>
        </div>
        """
        return await self.send_email(user_email, subject, html)

    async def send_nudge_email(self, user_email: str, username: str, days_inactive: int):
        subject = f"We miss you, {username}! 👋"
        
        html = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #933DC9;">Hey {username},</h2>
            <p>We noticed you haven't checked in for <strong>{days_inactive} days</strong>.</p>
            
            <p>Consistency is the key to mastery. It's not about being perfect, it's about showing up.</p>
            
            <div style="margin: 30px 0; text-align: center;">
                <a href="http://localhost:3000/dashboard" style="background-color: #933DC9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Resume Your Streak</a>
            </div>
            
            <p><em>"The only bad workout is the one that didn't happen."</em></p>
            <p>- The Sage Team</p>
        </div>
        """
        return await self.send_email(user_email, subject, html)
