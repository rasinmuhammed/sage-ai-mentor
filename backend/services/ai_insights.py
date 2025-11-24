from datetime import datetime, timedelta
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import models
from .crew import SageMentorCrew

class ProactiveInsightsEngine:
    """Generate proactive insights based on user behavior"""
    
    def __init__(self):
        self.crew = SageMentorCrew()
    
    async def analyze_weekly_patterns(self, user_id: int, db: AsyncSession) -> Dict:
        """Analyze weekly patterns and generate insights"""
        
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        # Get week's data
        result = await db.execute(select(models.CheckIn).filter(
            models.CheckIn.user_id == user_id,
            models.CheckIn.timestamp >= week_ago
        ))
        checkins = result.scalars().all()
        
        if len(checkins) < 3:
            return {"insufficient_data": True}
        
        # Calculate metrics
        insights = {
            "check_in_frequency": len(checkins),
            "avg_energy": sum(c.energy_level for c in checkins) / len(checkins),
            "success_rate": self._calculate_success_rate(checkins),
            "consistency_score": self._calculate_consistency(checkins),
            "detected_patterns": self._detect_behavioral_patterns(checkins),
            "recommendations": []
        }
        
        # Generate recommendations
        insights["recommendations"] = self._generate_recommendations(insights)
        
        return insights
    
    def _calculate_success_rate(self, checkins: List[models.CheckIn]) -> float:
        """Calculate success rate"""
        reviewed = [c for c in checkins if c.shipped is not None]
        if not reviewed:
            return 0.0
        return (sum(1 for c in reviewed if c.shipped) / len(reviewed)) * 100
    
    def _calculate_consistency(self, checkins: List[models.CheckIn]) -> float:
        """Calculate consistency score based on check-in frequency"""
        if len(checkins) < 2:
            return 0.0
        
        # Expected: daily check-ins (7 in a week)
        expected = 7
        actual = len(checkins)
        
        # Check time gaps
        sorted_checkins = sorted(checkins, key=lambda x: x.timestamp)
        gaps = []
        for i in range(1, len(sorted_checkins)):
            gap = (sorted_checkins[i].timestamp - sorted_checkins[i-1].timestamp).days
            gaps.append(gap)
        
        # Penalty for large gaps
        avg_gap = sum(gaps) / len(gaps) if gaps else 1
        consistency = min(100, (actual / expected) * 100 * (1 / max(1, avg_gap)))
        
        return round(consistency, 1)
    
    def _detect_behavioral_patterns(self, checkins: List[models.CheckIn]) -> List[Dict]:
        """Detect behavioral patterns"""
        patterns = []
        
        # Pattern 1: Declining energy
        if len(checkins) >= 5:
            recent_energy = [c.energy_level for c in checkins[-3:]]
            older_energy = [c.energy_level for c in checkins[:3]]
            
            if sum(recent_energy) / 3 < sum(older_energy) / 3 - 2:
                patterns.append({
                    "type": "declining_energy",
                    "severity": "warning",
                    "message": "Your energy levels have been declining. Burnout risk detected."
                })
        
        # Pattern 2: Consistent failures
        recent_fails = sum(1 for c in checkins[-5:] if c.shipped is False)
        if recent_fails >= 3:
            patterns.append({
                "type": "commitment_failure",
                "severity": "high",
                "message": f"You've failed to ship {recent_fails} of your last 5 commitments."
            })
        
        # Pattern 3: Vague commitments
        vague_keywords = ['work on', 'try to', 'maybe', 'think about', 'look into']
        vague_count = sum(
            1 for c in checkins[-5:]
            if any(keyword in c.commitment.lower() for keyword in vague_keywords)
        )
        if vague_count >= 2:
            patterns.append({
                "type": "vague_goals",
                "severity": "medium",
                "message": "Your commitments lack specificity. Define clear, measurable goals."
            })
        
        # Pattern 4: Weekend warrior
        weekend_checkins = [c for c in checkins if c.timestamp.weekday() in [5, 6]]
        weekday_checkins = [c for c in checkins if c.timestamp.weekday() not in [5, 6]]
        
        if len(weekend_checkins) > len(weekday_checkins) * 1.5:
            patterns.append({
                "type": "weekend_warrior",
                "severity": "info",
                "message": "You're more active on weekends. Consider building weekday habits."
            })
        
        return patterns
    
    def _generate_recommendations(self, insights: Dict) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Low success rate
        if insights["success_rate"] < 50:
            recommendations.append(
                "Your success rate is below 50%. Start with smaller, achievable commitments."
            )
        
        # Low consistency
        if insights["consistency_score"] < 60:
            recommendations.append(
                "Check in daily, even if brief. Consistency builds momentum."
            )
        
        # Low energy
        if insights["avg_energy"] < 5:
            recommendations.append(
                "Your energy is low. Prioritize rest and energy management before big goals."
            )
        
        # Pattern-based recommendations
        for pattern in insights["detected_patterns"]:
            if pattern["type"] == "vague_goals":
                recommendations.append(
                    "Make commitments specific: 'Ship feature X' not 'Work on feature X'."
                )
            elif pattern["type"] == "declining_energy":
                recommendations.append(
                    "Take a strategic break. Burnout prevents long-term progress."
                )
        
        return recommendations
    
    async def generate_weekly_report(self, user_id: int, db: AsyncSession) -> str:
        """Generate weekly summary report"""
        insights = await self.analyze_weekly_patterns(user_id, db)
        
        if insights.get("insufficient_data"):
            return "Insufficient data for weekly report. Check in more regularly."
        
        report = f"""
        # Weekly Progress Report
        
        ## Key Metrics
        - Check-ins: {insights['check_in_frequency']}/7
        - Success Rate: {insights['success_rate']:.1f}%
        - Avg Energy: {insights['avg_energy']:.1f}/10
        - Consistency: {insights['consistency_score']:.1f}/100
        
        ## Patterns Detected
        """
        
        if insights['detected_patterns']:
            for pattern in insights['detected_patterns']:
                severity_emoji = {
                    'high': '🚨',
                    'warning': '⚠️',
                    'medium': 'ℹ️',
                    'info': '💡'
                }
                report += f"\n{severity_emoji.get(pattern['severity'], '•')} {pattern['message']}"
        else:
            report += "\nNo significant patterns detected."
        
        report += "\n\n## Recommendations\n"
        for i, rec in enumerate(insights['recommendations'], 1):
            report += f"\n{i}. {rec}"
        
        return report