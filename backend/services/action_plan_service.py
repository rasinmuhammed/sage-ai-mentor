# backend/action_plan_service.py

from crewai import Task, Crew, Process
from .agents import strategist, analyst, psychologist
from typing import Dict, List
import json
from datetime import datetime, timedelta
import asyncio

class ActionPlanService:
    """AI-powered action plan generation and management"""
    
    def __init__(self):
        self.strategist = strategist
        self.analyst = analyst
        self.psychologist = psychologist
    
    async def generate_30_day_plan(
        self, 
        user_context: Dict, 
        focus_area: str,
        skills_to_learn: List[str],
        skill_level: str,
        hours_per_day: float
    ) -> Dict:
        """Generate a comprehensive 30-day action plan"""
        
        context_str = f"""
        User Context:
        - GitHub Activity: {user_context.get('github_stats', {})}
        - Recent Performance: {user_context.get('recent_performance', {})}
        - Current Skill Level: {skill_level}
        - Available Time: {hours_per_day} hours/day
        
        Goal:
        - Focus Area: {focus_area}
        - Skills to Learn: {', '.join(skills_to_learn)}
        """
        
        # Analysis Task
        analysis_task = Task(
            description=f"""Analyze the user's context and create a realistic 30-day learning plan:
            
            {context_str}
            
            Your job:
            1. Assess their current skill level based on GitHub data
            2. Identify knowledge gaps in {focus_area}
            3. Prioritize skills from most foundational to advanced
            4. Consider their available time ({hours_per_day}h/day)
            5. Be realistic - no tutorial hell, focus on BUILDING
            6. Include project-based learning
            
            Output a structured assessment with:
            - Current strengths
            - Knowledge gaps
            - Recommended learning path
            - Realistic timeline expectations
            """,
            agent=self.analyst,
            expected_output="Detailed analysis with learning path recommendations"
        )
        
        # Plan Creation Task
        plan_task = Task(
            description=f"""Create a brutally specific 30-day action plan:
            
            Based on the analyst's assessment, create:
            
            1. **Weekly Milestones** (4 weeks):
               - Week 1: Foundation building
               - Week 2: Core concepts
               - Week 3: Advanced topics
               - Week 4: Project completion
            
            2. **Daily Task Structure**:
               For each day (1-30), create:
               - Main learning objective
               - Specific task (be VERY specific)
               - Resources needed
               - Success criteria (how to know you're done)
               - Estimated time
               - Difficulty rating
            
            3. **Skills Priority List**:
               Rank skills {skills_to_learn} by:
               - Urgency (1-10)
               - Impact on {focus_area} (1-10)
               - Learning curve (easy/medium/hard)
               - Recommended daily focus time
            
            4. **Project Milestones**:
               Define 3-4 concrete projects to build
            
            Rules:
            - Be SPECIFIC: "Build REST API with auth" not "Learn backend"
            - No generic advice
            - Include time for breaks and review
            - Build something real by day 30
            - Adjust for {hours_per_day}h/day availability
            
            Output as structured JSON.
            """,
            agent=self.strategist,
            expected_output="Structured 30-day plan with daily tasks and milestones",
            context=[analysis_task]
        )
        
        # Psychological Task
        motivation_task = Task(
            description=f"""Add psychological insights to the action plan:
            
            Analyze potential challenges for learning {focus_area}:
            
            1. **Common Pitfalls**:
               - Tutorial hell triggers
               - Procrastination points
               - Overwhelm moments
               - Motivation dips
            
            2. **Motivation Strategy**:
               - Daily motivational prompts
               - Progress celebration points
               - Accountability checkpoints
               - What to do when stuck
            
            3. **Mental Health Checks**:
               - Warning signs of burnout
               - When to take breaks
               - Dealing with imposter syndrome
            
            Be empathetic but honest about the difficulty.
            """,
            agent=self.psychologist,
            expected_output="Psychological support strategy and motivation plan",
            context=[analysis_task, plan_task]
        )
        
        crew = Crew(
            agents=[self.analyst, self.strategist, self.psychologist],
            tasks=[analysis_task, plan_task, motivation_task],
            process=Process.sequential,
            verbose=True
        )
        
        result = await asyncio.to_thread(crew.kickoff)
        
        return self._parse_plan_result(str(result), focus_area, hours_per_day)
    
    def _parse_plan_result(self, result: str, focus_area: str, hours_per_day: float) -> Dict:
        """Parse AI result into structured format"""
        
        # Extract sections from the result
        lines = result.split('\n')
        
        skills_to_focus = []
        daily_tasks = []
        milestones = {}
        
        # Parse skills section
        in_skills_section = False
        for line in lines:
            if 'skill' in line.lower() and 'priority' in line.lower():
                in_skills_section = True
            elif in_skills_section and line.strip():
                if any(x in line.lower() for x in ['day', 'week', 'milestone']):
                    in_skills_section = False
                else:
                    # Extract skill info
                    parts = line.split(':')
                    if len(parts) >= 2:
                        skill_name = parts[0].strip('- •123456789. ')
                        skills_to_focus.append({
                            'name': skill_name,
                            'priority': 'high' if 'urgent' in line.lower() else 'medium',
                            'daily_time': int(hours_per_day * 30) if hours_per_day < 2 else 60
                        })
        
        # Generate daily tasks structure
        for day in range(1, 31):
            week = (day - 1) // 7 + 1
            
            if week == 1:
                focus = "Foundation & Setup"
                difficulty = "easy"
            elif week == 2:
                focus = "Core Concepts"
                difficulty = "medium"
            elif week == 3:
                focus = "Advanced Topics"
                difficulty = "hard"
            else:
                focus = "Project Building"
                difficulty = "medium"
            
            daily_tasks.append({
                'day_number': day,
                'title': f"Day {day}: {focus}",
                'description': f"Focus on {focus_area} - Week {week}",
                'task_type': 'learning' if week < 4 else 'project',
                'difficulty': difficulty,
                'estimated_time': int(hours_per_day * 60)
            })
        
        # Extract milestones
        milestones = {
            'week_1': 'Foundation complete, basic concepts understood',
            'week_2': 'Core skills practiced, first small project done',
            'week_3': 'Advanced topics covered, portfolio piece in progress',
            'week_4': 'Final project completed and deployed'
        }
        
        return {
            'analysis': result,
            'skills_to_focus': skills_to_focus[:5],  # Top 5 skills
            'daily_tasks': daily_tasks,
            'milestones': milestones,
            'focus_area': focus_area,
            'total_days': 30
        }
    
    async def generate_daily_task_details(self, plan: Dict, day: int, user_progress: Dict) -> Dict:
        """Generate specific tasks for a given day"""
        
        task = Task(
            description=f"""Create specific tasks for Day {day} of the {plan['focus_area']} learning plan:
            
            Plan Context:
            - Focus Area: {plan['focus_area']}
            - Skills: {plan.get('skills_to_focus', [])}
            - User Progress: {user_progress}
            
            Create 2-3 specific tasks for today:
            1. Main learning task (e.g., "Build JWT authentication in Express")
            2. Practice task (e.g., "Solve 3 auth-related coding challenges")
            3. Review/reflection task
            
            For each task provide:
            - Exact title and description
            - Step-by-step breakdown
            - Resources (links, docs)
            - Acceptance criteria
            - Time estimate
            
            Be BRUTALLY specific. No vague advice.
            """,
            agent=self.strategist,
            expected_output="Detailed daily task breakdown"
        )
        
        crew = Crew(
            agents=[self.strategist],
            tasks=[task],
            process=Process.sequential,
            verbose=False
        )
        
        result = await asyncio.to_thread(crew.kickoff)
        
        return {
            'tasks': self._extract_tasks(str(result)),
            'focus_skills': plan.get('skills_to_focus', [])[:2],
            'daily_tip': self._extract_tip(str(result))
        }
    
    def _extract_tasks(self, text: str) -> List[Dict]:
        """Extract individual tasks from AI response"""
        tasks = []
        lines = text.split('\n')
        
        current_task = {}
        for line in lines:
            line = line.strip()
            if line.startswith(('1.', '2.', '3.', '-', '•')):
                if current_task:
                    tasks.append(current_task)
                current_task = {'title': line.lstrip('123.-• ').strip()}
            elif line and current_task:
                if 'time' in line.lower():
                    current_task['estimated_time'] = 60  # default
                elif 'resource' in line.lower():
                    current_task['resources'] = [line]
        
        if current_task:
            tasks.append(current_task)
        
        return tasks[:3]
    
    def _extract_tip(self, text: str) -> str:
        """Extract daily motivation tip"""
        for line in text.split('\n'):
            if any(word in line.lower() for word in ['tip:', 'remember:', 'note:', 'important:']):
                return line.split(':', 1)[1].strip() if ':' in line else line
        return "Stay focused. Ship something today."
    
    async def evaluate_task_completion(self, task: Dict, user_feedback: Dict) -> Dict:
        """Evaluate completed task and provide feedback"""
        
        feedback_task = Task(
            description=f"""Evaluate this completed task:
            
            Task: {task['title']}
            User Notes: {user_feedback.get('notes', 'None')}
            Time Spent: {user_feedback.get('actual_time', 0)} minutes
            Estimated Time: {task['estimated_time']} minutes
            Difficulty Rating: {user_feedback.get('difficulty_rating', 'N/A')}/5
            
            Provide:
            1. Honest feedback on their approach
            2. What they did well
            3. What to improve tomorrow
            4. Adjust difficulty for future tasks if needed
            
            Be direct but encouraging.
            """,
            agent=self.psychologist,
            expected_output="Task completion feedback"
        )
        
        crew = Crew(
            agents=[self.psychologist],
            tasks=[feedback_task],
            process=Process.sequential,
            verbose=False
        )
        
        result = await asyncio.to_thread(crew.kickoff)
        
        return {
            'feedback': str(result),
            'difficulty_adjustment': self._calculate_difficulty_adjustment(user_feedback, task)
        }
    
    def _calculate_difficulty_adjustment(self, feedback: Dict, task: Dict) -> str:
        """Calculate if tasks should be easier or harder"""
        actual = feedback.get('actual_time', 0)
        estimated = task['estimated_time']
        rating = feedback.get('difficulty_rating', 3)
        
        if actual > estimated * 1.5 and rating >= 4:
            return 'decrease'  # Tasks too hard
        elif actual < estimated * 0.7 and rating <= 2:
            return 'increase'  # Tasks too easy
        return 'maintain'