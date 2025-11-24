from .github_integration import GitHubAnalyzer
from .action_plan_service import ActionPlanService
from .crew import SageMentorCrew
from .email_service import EmailService
from .gamification_service import GamificationService
import os

# Initialize services
github_analyzer = GitHubAnalyzer(os.getenv("GITHUB_TOKEN"))
action_plan_service = ActionPlanService()
sage_crew = SageMentorCrew(os.getenv("GROQ_API_KEY"))
email_service = EmailService(os.getenv("RESEND_API_KEY"))
gamification_service = GamificationService()
