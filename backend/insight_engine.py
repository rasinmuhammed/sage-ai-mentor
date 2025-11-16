from sqlalchemy.orm import Session
from typing import Dict

class ProactiveInsightsEngine:
    """
    Placeholder service for Proactive Insights Engine.
    This class is required to prevent the ModuleNotFoundError in main.py.
    The methods provide mock data until the full implementation is added.
    """

    def analyze_weekly_patterns(self, user_id: int, db: Session) -> Dict:
        """Analyzes weekly check-in data and returns mock metrics."""
        return {
            "weekly_commits_avg": 45,
            "success_rate_change": 15.2,
            "energy_trend": "stable"
        }

    def generate_weekly_report(self, user_id: int, db: Session) -> str:
        """Generates a mock summarized report based on patterns."""
        return (
            "**Weekly Performance Review: Focus & Consistency**\n\n"
            "This past week showed a significant **15.2% increase** in your commitment success rate, driven primarily by a dedicated focus on technical tasks. This positive trend suggests that setting clear, manageable daily shipping goals is highly effective for your current workflow. Your average energy level remained stable, indicating effective project pacing.\n\n"
            "However, the data continues to highlight a recurring **dip in energy and focus on Monday afternoons**, suggesting that heavier planning or skill-intensive tasks should be strategically shifted to later in the week. To maintain this success trajectory, your recommended focus this coming week is **delegation and deep work planning**—specifically blocking out 3-hour uninterrupted sessions for complex tasks only. Reviewing past life decisions on Friday evenings also seems to correlate strongly with a successful start to the following Monday."
        )