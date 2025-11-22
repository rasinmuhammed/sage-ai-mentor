from github_integration import GitHubAnalyzer
from action_plan_service import ActionPlanService
from crew import SageMentorCrew
from email_service import EmailService
import os

# Initialize services
# We use a lazy initialization pattern or just instantiate them if they are lightweight enough.
# For now, we'll instantiate them as they were in main.py

github_analyzer = GitHubAnalyzer(os.getenv("GITHUB_TOKEN"))
action_plan_service = ActionPlanService()
sage_crew = SageMentorCrew(os.getenv("GROQ_API_KEY"))
email_service = EmailService(os.getenv("RESEND_API_KEY"))
