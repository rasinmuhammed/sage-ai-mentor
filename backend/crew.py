from crewai import Task, Crew, Process
from agents import create_agents, get_agents
from typing import Dict, List
import json
import models
from datetime import datetime
import io
import sys

from agents import create_agents, get_agents

class SageMentorCrew:
    def __init__(self, api_key: str = None):
        # If api_key is provided, create new agents. 
        # Otherwise try to get default agents (which might be None if no env var)
        if api_key:
            agents = create_agents(api_key)
        else:
            # Fallback to default agents (from env vars)
            # If even those aren't set, we'll handle it when methods are called
            try:
                agents = get_agents()
            except:
                agents = None

        if agents:
            self.analyst = agents["analyst"]
            self.psychologist = agents["psychologist"]
            self.strategist = agents["strategist"]
            self.contrarian = agents["contrarian"]
        else:
            # Initialize as None, will need to be set later or raise error
            self.analyst = None
            self.psychologist = None
            self.strategist = None
            self.contrarian = None
            
    def _ensure_agents(self, api_key: str = None):
        """Ensure agents are initialized, creating them if key provided"""
        if api_key:
            agents = create_agents(api_key)
            self.analyst = agents["analyst"]
            self.psychologist = agents["psychologist"]
            self.strategist = agents["strategist"]
            self.contrarian = agents["contrarian"]
        elif not self.analyst:
             raise ValueError("Agents not initialized. Please provide GROQ_API_KEY.")
    
    def analyze_developer(self, github_data: Dict, checkin_history: List[Dict] = None, api_key: str = None) -> Dict:
        """Main analysis flow: All agents deliberate on the developer's situation"""
        self._ensure_agents(api_key)
        
        context = self._prepare_context(github_data, checkin_history)
        
        analysis_task = Task(
            description=f"""Analyze this developer's GitHub data and extract key insights:
            
            GitHub Data:
            {json.dumps(github_data, indent=2)}
            
            Your job:
            1. Identify what they CLAIM to be (based on repo names, languages used)
            2. Identify what they ACTUALLY do (based on commit patterns, active repos)
            3. Spot the gap between started projects and finished projects
            4. Calculate their consistency score
            5. Identify any tutorial hell patterns
            
            Be specific with numbers. Point out contradictions.""",
            agent=self.analyst,
            expected_output="A detailed analysis report with specific metrics and patterns"
        )
        
        psychology_task = Task(
            description=f"""Based on the analyst's findings and this context:
            
            Context: {context}
            
            Identify psychological patterns:
            1. What are they avoiding? (Look for project abandonment patterns)
            2. What does their commit timing tell us about their energy/motivation?
            3. Are they in tutorial hell? Why?
            4. Any signs of perfectionism? (lots of refactoring, few features)
            5. Any signs of burnout or overwhelm?
            
            Be empathetic but honest. Connect behavior to underlying psychology.""",
            agent=self.psychologist,
            expected_output="Psychological pattern analysis with behavioral insights",
            context=[analysis_task]
        )
        
        strategy_task = Task(
            description=f"""Based on the Analyst's data and Psychologist's insights:
            
            Create a brutally specific action plan:
            1. ONE main focus for the next 2 weeks (not 5 goals, just 1)
            2. Specific daily actions (with time commitments)
            3. What to STOP doing (as important as what to start)
            4. Success metrics (how will we know if they followed through?)
            5. Accountability checkpoints
            
            Rules:
            - No vague advice like "improve skills" - be specific
            - Include deadlines (dates, not "soon")
            - Must be achievable in 2 weeks
            - Call out any BS (if they keep asking about X but never do X)""",
            agent=self.strategist,
            expected_output="A specific, time-bound action plan with clear accountability metrics",
            context=[analysis_task, psychology_task]
        )
        
        crew = Crew(
            agents=[self.analyst, self.psychologist, self.strategist],
            tasks=[analysis_task, psychology_task, strategy_task],
            process=Process.sequential,
            verbose=True
        )
        
        result = crew.kickoff()
        
        return self._structure_output(result, github_data)
    
    def _capture_output(self, crew):
        """Capture verbose output from crew execution"""
        # CrewAI's verbose mode prints to stdout, we'll capture it
        old_stdout = sys.stdout
        sys.stdout = captured_output = io.StringIO()
        
        try:
            result = crew.kickoff()
            output = captured_output.getvalue()
            self.raw_output = output.split('\n')
            return result
        finally:
            sys.stdout = old_stdout
    
    def chat_deliberation(self, user_message: str, user_context: Dict, additional_context: Dict = None, api_key: str = None) -> Dict:
        """Multi-agent deliberation for chat messages with raw output"""
        self._ensure_agents(api_key)
        
        self.raw_output = []  # Reset raw output
        
        context_str = f"""
        User Context:
        - GitHub: {user_context['github']}
        - Recent Performance: {user_context['recent_performance']}
        - Life Decisions: {user_context['life_decisions']}

        Additional Context: {additional_context if additional_context else 'None'}
        """
        
        analyst_task = Task(
            description=f"""Analyze this user's question from a data perspective:
            
            User Question: "{user_message}"
            
            {context_str}
            
            Your job:
            1. What does their data say about this question?
            2. Any patterns that relate to what they're asking?
            3. What are they NOT seeing in their own behavior?
            4. Provide specific numbers and facts
            
            Be direct. Point out contradictions between what they ask and what their data shows.""",
            agent=self.analyst,
            expected_output="Data-driven analysis with specific metrics and patterns"
        )
        
        psychologist_task = Task(
            description=f"""Based on the Analyst's findings and the user's question:
            
            User Question: "{user_message}"
            
            Your job:
            1. What are they REALLY asking? (look beyond the surface)
            2. What psychological patterns are at play?
            3. What are they avoiding by asking this question?
            4. What fear or insecurity is driving this?
            
            Be empathetic but unflinchingly honest. Call out self-deception.""",
            agent=self.psychologist,
            expected_output="Psychological interpretation with underlying motivations",
            context=[analyst_task]
        )
        
        contrarian_task = Task(
            description=f"""Challenge everything said so far:
            
            User Question: "{user_message}"
            
            Your job:
            1. What assumptions are the user making that might be wrong?
            2. What if the OPPOSITE of what they're asking is true?
            3. What uncomfortable truth are they not ready to hear?
            4. Play devil's advocate ruthlessly
            
            Ask the hard questions. No sugar coating.""",
            agent=self.contrarian,
            expected_output="Contrarian perspective challenging core assumptions",
            context=[analyst_task, psychologist_task]
        )
        
        strategist_task = Task(
            description=f"""Synthesize all agent perspectives and create actionable response:
            
            User Question: "{user_message}"
            
            Your job:
            1. Synthesize Analyst, Psychologist, and Contrarian perspectives
            2. Give ONE clear, direct answer to their question
            3. Provide 2-3 specific, immediate actions (with timeframes)
            4. Call out any BS in their question or underlying assumptions
            5. What should they do RIGHT NOW (today)?
            
            Be brutally specific. No vague advice. Include deadlines and metrics.""",
            agent=self.strategist,
            expected_output="Actionable response with specific steps and timeframes",
            context=[analyst_task, psychologist_task, contrarian_task]
        )
        
        crew = Crew(
            agents=[self.analyst, self.psychologist, self.contrarian, self.strategist],
            tasks=[analyst_task, psychologist_task, contrarian_task, strategist_task],
            process=Process.sequential,
            verbose=True
        )
        
        # Capture output
        result = self._capture_output(crew)
        
        # Parse raw output for agent contributions
        agent_contributions = self._parse_agent_output(self.raw_output)
        
        return {
            "final_response": str(result),
            "debate": [
                {"agent": "Analyst", "perspective": "Data-driven reality check", "color": "blue"},
                {"agent": "Psychologist", "perspective": "Underlying psychology", "color": "purple"},
                {"agent": "Contrarian", "perspective": "Challenging assumptions", "color": "red"},
                {"agent": "Strategist", "perspective": "Actionable synthesis", "color": "green"}
            ],
            "key_insights": self._extract_key_points(str(result)),
            "actions": self._extract_actions(str(result)),
            "raw_deliberation": agent_contributions  # NEW: Raw deliberation data
        }
    
    def _parse_agent_output(self, raw_lines: List[str]) -> List[Dict]:
        """Parse raw output to extract agent contributions"""
        contributions = []
        current_agent = None
        current_output = []
        
        for line in raw_lines:
            # Detect agent starting to work
            if "Agent:" in line or "Working Agent:" in line:
                # Save previous agent's output
                if current_agent and current_output:
                    contributions.append({
                        "agent": current_agent,
                        "output": "\n".join(current_output),
                        "timestamp": datetime.now().isoformat()
                    })
                
                # Extract agent name
                if "Data Analyst" in line:
                    current_agent = "Analyst"
                elif "Developer Psychologist" in line:
                    current_agent = "Psychologist"
                elif "Devil's Advocate" in line:
                    current_agent = "Contrarian"
                elif "Strategic Advisor" in line:
                    current_agent = "Strategist"
                
                current_output = []
            
            # Collect output lines
            elif current_agent and line.strip() and not line.startswith("###"):
                # Filter out system messages
                if not any(skip in line for skip in ["Task output:", "Final Answer:", "Thought:"]):
                    current_output.append(line.strip())
        
        # Add last agent's output
        if current_agent and current_output:
            contributions.append({
                "agent": current_agent,
                "output": "\n".join(current_output),
                "timestamp": datetime.now().isoformat()
            })
        
        return contributions
    
    def analyze_life_decision(self, decision: Dict, user_id: int, db, api_key: str = None) -> Dict:
        """Analyze a major life decision"""
        self._ensure_agents(api_key)
        
        past_decisions = db.query(models.LifeEvent).filter(
            models.LifeEvent.user_id == user_id
        ).order_by(models.LifeEvent.timestamp.desc()).limit(5).all()
        
        past_context = "\n".join([
            f"- {e.description} ({e.event_type})" # Removed the incorrect e.outcome reference
            for e in past_decisions
        ])
        
        analysis_task = Task(
            description=f"""Analyze this life decision comprehensively:
            
            Decision: {decision['title']}
            Description: {decision['description']}
            Type: {decision['type']}
            Impact Areas: {decision['impact_areas']}
            
            Past Decisions:
            {past_context}
            
            Your job:
            1. Analyze this decision critically (what's good, what's risky)
            2. How does it fit their past decision patterns?
            3. What are they not considering?
            4. Rate this decision on a scale of 1-10 (with reasoning)
            5. Extract 3-5 key lessons from this decision
            6. How can they use this experience going forward?
            7. What could go wrong? What could go right?
            
            Be honest. If it's a bad decision, say so. If it's good, explain why.
            Focus on extracting transferable lessons.""",
            agent=self.strategist,
            expected_output="Comprehensive analysis with lessons and future guidance"
        )
        
        crew = Crew(
            agents=[self.strategist],
            tasks=[analysis_task],
            process=Process.sequential,
            verbose=False
        )
        
        result = crew.kickoff()
        result_str = str(result)
        
        lessons = []
        for line in result_str.split('\n'):
            line = line.strip()
            if any(keyword in line.lower() for keyword in ['lesson:', 'learn:', 'takeaway:', 'insight:']):
                lessons.append(line.split(':', 1)[-1].strip())
        
        return {
            "analysis": result_str,
            "lessons": lessons[:5] if lessons else ["Reflect on the decision-making process"],
            "long_term_impact": "Use this decision as a reference point for future choices"
        }
    
    def reevaluate_decision(self, original_event, current_situation: str, what_changed: str, user_id: int, db, api_key: str = None) -> Dict:
        """Re-evaluate a past decision with hindsight"""
        self._ensure_agents(api_key)
        
        reevaluation_task = Task(
            description=f"""Re-evaluate this past decision with hindsight:
            
            Original Decision: {original_event.description}
            Original Analysis: {original_event.context.get('ai_analysis', 'No original analysis')}
            Time Since Decision: {(datetime.now() - original_event.timestamp).days} days
            
            Current Situation: {current_situation}
            What Changed: {what_changed}
            
            Your job:
            1. How did this decision age? (Good? Bad? Neutral?)
            2. What would you tell your past self now?
            3. What NEW lessons emerged that weren't visible before?
            4. How should this update their decision-making framework?
            5. Rate: Did this decision help or hurt them? (1-10 scale)
            
            Be brutally honest about what they got right and wrong.
            Focus on extracting wisdom from hindsight.""",
            agent=self.psychologist,
            expected_output="Honest retrospective with updated lessons"
        )
        
        crew = Crew(
            agents=[self.psychologist],
            tasks=[reevaluation_task],
            process=Process.sequential,
            verbose=False
        )
        
        result = crew.kickoff()
        result_str = str(result)
        
        new_lessons = []
        for line in result_str.split('\n'):
            line = line.strip()
            if 'lesson' in line.lower() or 'learned' in line.lower():
                new_lessons.append(line)
        
        if 'good decision' in result_str.lower() or 'right choice' in result_str.lower():
            aging = "Aged well - good decision"
        elif 'bad decision' in result_str.lower() or 'mistake' in result_str.lower():
            aging = "Aged poorly - learning opportunity"
        else:
            aging = "Mixed results - nuanced outcome"
        
        return {
            "analysis": result_str,
            "new_lessons": new_lessons[:3] if new_lessons else ["Continue observing outcomes"],
            "how_it_aged": aging
        }
    
    def quick_checkin_analysis(self, checkin_data: Dict, user_history: Dict, api_key: str = None) -> Dict:
        """Quick analysis for daily check-ins"""
        self._ensure_agents(api_key)
        
        checkin_task = Task(
            description=f"""Analyze this daily check-in:
            
            Check-in Data:
            - Energy Level: {checkin_data.get('energy_level')}/10
            - Avoiding: {checkin_data.get('avoiding_what')}
            - Commitment: {checkin_data.get('commitment')}
            - Mood: {checkin_data.get('mood', 'Not specified')}
            
            Recent History:
            {json.dumps(user_history, indent=2)}
            
            Your job:
            1. Is this check-in honest or are they fooling themselves?
            2. Compare today's commitment to past performance
            3. Red flags in what they're avoiding?
            4. One specific question to ask them that they don't want to answer
            
            Be direct. Reference their patterns.""",
            agent=self.psychologist,
            expected_output="Brief analysis with one uncomfortable question"
        )
        
        crew = Crew(
            agents=[self.psychologist],
            tasks=[checkin_task],
            process=Process.sequential,
            verbose=False
        )
        
        result = crew.kickoff()
        return {"analysis": str(result)}
    
    def evening_checkin_review(self, morning_commitment: str, shipped: bool, excuse: str = None, api_key: str = None) -> Dict:
        """Review whether user followed through on morning commitment"""
        self._ensure_agents(api_key)
        
        review_task = Task(
            description=f"""Review this day's outcome:
            
            Morning Commitment: "{morning_commitment}"
            Did they ship it? {shipped}
            {"Excuse given: " + excuse if excuse else "No excuse provided"}
            
            Your job:
            1. If shipped: Acknowledge but don't over-celebrate (it's expected)
            2. If not shipped: Call out the excuse if it's BS
            3. If no excuse: Point out they didn't even own the failure
            4. Pattern recognition: Is this a recurring behavior?
            
            Keep it short but impactful. One or two sentences.""",
            agent=self.contrarian,
            expected_output="Brief, direct feedback on the day's outcome"
        )
        
        crew = Crew(
            agents=[self.contrarian],
            tasks=[review_task],
            process=Process.sequential,
            verbose=False
        )
        
        result = crew.kickoff()
        return {"feedback": str(result)}
    
    def _prepare_context(self, github_data: Dict, checkin_history: List[Dict] = None) -> str:
        """Prepare context from available data"""
        context = f"GitHub Analysis: {json.dumps(github_data, indent=2)}"
        
        if checkin_history:
            context += f"\n\nRecent Check-ins: {json.dumps(checkin_history[-7:], indent=2)}"
        
        return context
    
    def _structure_output(self, crew_result, github_data: Dict) -> Dict:
        """Structure the crew output into a usable format"""
        
        result_str = str(crew_result)
        
        return {
            "timestamp": str(datetime.now()),
            "github_summary": {
                "total_repos": github_data.get("total_repos", 0),
                "active_repos": github_data.get("active_repos", 0),
                "languages": github_data.get("languages", {}),
                "patterns": github_data.get("patterns", [])
            },
            "agent_insights": {
                "full_analysis": result_str,
                "key_findings": self._extract_key_points(result_str)
            },
            "recommended_actions": self._extract_actions(result_str)
        }
    
    def _extract_key_points(self, text: str) -> List[str]:
        """Extract key points from the analysis"""
        lines = text.split('\n')
        key_points = []
        
        for line in lines:
            line = line.strip()
            if line and (
                line.startswith('-') or 
                line.startswith('•') or 
                any(keyword in line.lower() for keyword in ['pattern:', 'key:', 'important:', 'critical:'])
            ):
                key_points.append(line.lstrip('-•').strip())
        
        return key_points[:5]
    
    def _extract_actions(self, text: str) -> List[Dict]:
        """Extract actionable items from the strategist's output"""
        actions = []
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            line = line.strip()
            if any(word in line.lower() for word in ['action:', 'todo:', 'task:', 'do:', 'must:']):
                actions.append({
                    "action": line,
                    "priority": "high" if "critical" in line.lower() or "must" in line.lower() else "medium"
                })
        
        return actions[:3]
    
    def analyze_goal(self, goal_data: Dict, user_context: Dict, db, api_key: str = None) -> Dict:
        """Comprehensive AI analysis of a life goal"""
        self._ensure_agents(api_key)
        
        context_str = f"""
        Goal Details:
        - Title: {goal_data['title']}
        - Type: {goal_data['goal_type']}
        - Priority: {goal_data['priority']}
        - Target Date: {goal_data.get('target_date', 'Not set')}
        - Success Criteria: {goal_data.get('success_criteria', [])}
        
        User Context:
        - GitHub Activity: {user_context.get('github_stats', {})}
        - Recent Performance: {user_context.get('recent_performance', {})}
        - Past Goals: {user_context.get('past_goals', [])}
        """
        
        analyst_task = Task(
            description=f"""Analyze this goal from a data perspective:
            
            {context_str}
            
            Your job:
            1. Is this goal specific and measurable enough?
            2. Based on their GitHub data and past performance, is this realistic?
            3. What's the estimated time/effort required?
            4. Are the success criteria clear and achievable?
            5. What resources or skills are missing?
            6. Rate the goal's clarity and feasibility (1-10)
            
            Be brutally honest about whether this goal is well-defined or wishful thinking.""",
            agent=self.analyst,
            expected_output="Data-driven analysis with feasibility assessment"
        )
        
        psychologist_task = Task(
            description=f"""Analyze the psychological aspects of this goal:
            
            {context_str}
            
            Your job:
            1. What's the REAL motivation behind this goal? (surface vs deep)
            2. Any signs this is driven by external pressure or comparison?
            3. Does this align with their demonstrated interests and energy?
            4. What psychological obstacles might derail this?
            5. Is this goal too ambitious (setting up for failure) or too safe?
            6. What mindset shifts are needed?
            
            Look for misalignment between stated goals and actual behavior patterns.""",
            agent=self.psychologist,
            expected_output="Psychological analysis with motivation assessment",
            context=[analyst_task]
        )
        
        contrarian_task = Task(
            description=f"""Challenge this goal ruthlessly:
            
            {context_str}
            
            Your job:
            1. What if this goal is actually a distraction from something else?
            2. Is this goal based on who they want to be or who they think they should be?
            3. What are they avoiding by pursuing this goal?
            4. Could achieving this goal make them unhappy?
            5. What's the opportunity cost?
            6. Is this goal worth it?
            
            Play devil's advocate. Ask the uncomfortable questions.""",
            agent=self.contrarian,
            expected_output="Contrarian perspective challenging goal validity",
            context=[analyst_task, psychologist_task]
        )
        
        strategist_task = Task(
            description=f"""Create actionable strategy for this goal:
            
            {context_str}
            
            Your job:
            1. Break down into 3-5 major subgoals (sequential or parallel)
            2. For each subgoal, suggest 2-4 concrete tasks
            3. Identify critical milestones (30/60/90 day markers)
            4. Suggest weekly commitment (hours/actions)
            5. Define clear success metrics
            6. Identify likely obstacles and mitigation strategies
            7. Create accountability checkpoints
            
            Be specific. No vague advice. Include dates, numbers, and measurable outcomes.""",
            agent=self.strategist,
            expected_output="Detailed execution strategy with subgoals and tasks",
            context=[analyst_task, psychologist_task, contrarian_task]
        )
        
        crew = Crew(
            agents=[self.analyst, self.psychologist, self.contrarian, self.strategist],
            tasks=[analyst_task, psychologist_task, contrarian_task, strategist_task],
            process=Process.sequential,
            verbose=True
        )
        
        result = crew.kickoff()
        
        return self._parse_goal_analysis(str(result), goal_data)
    
    def _parse_goal_analysis(self, analysis: str, goal_data: Dict) -> Dict:
        """Parse the goal analysis into structured format"""
        
        # Extract key insights
        insights = []
        obstacles = []
        recommendations = []
        
        lines = analysis.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Detect sections
            if 'obstacle' in line.lower() or 'challenge' in line.lower():
                current_section = 'obstacles'
            elif 'insight' in line.lower() or 'finding' in line.lower():
                current_section = 'insights'
            elif 'recommend' in line.lower() or 'action' in line.lower() or 'strategy' in line.lower():
                current_section = 'recommendations'
            
            # Extract content
            if line.startswith('-') or line.startswith('•') or line[0].isdigit():
                clean_line = line.lstrip('-•0123456789. ').strip()
                if current_section == 'obstacles':
                    obstacles.append(clean_line)
                elif current_section == 'insights':
                    insights.append(clean_line)
                elif current_section == 'recommendations':
                    recommendations.append(clean_line)
        
        # Extract subgoals from the analysis
        suggested_subgoals = self._extract_subgoals(analysis)
        
        return {
            "analysis": analysis,
            "insights": insights[:5],
            "obstacles": obstacles[:5],
            "recommendations": recommendations[:5],
            "suggested_subgoals": suggested_subgoals,
            "feasibility_score": self._extract_score(analysis),
            "estimated_duration": self._estimate_duration(analysis)
        }
    
    def _extract_subgoals(self, text: str) -> List[Dict]:
        """Extract suggested subgoals from analysis"""
        subgoals = []
        lines = text.split('\n')
        
        in_subgoals_section = False
        for line in lines:
            if 'subgoal' in line.lower() or 'step' in line.lower():
                in_subgoals_section = True
            elif in_subgoals_section and (line.startswith('-') or line.startswith('•') or line[0].isdigit()):
                clean = line.lstrip('-•0123456789. ').strip()
                if len(clean) > 10:  # Valid subgoal
                    subgoals.append({
                        "title": clean[:200],
                        "order": len(subgoals) + 1
                    })
                if len(subgoals) >= 5:
                    break
        
        return subgoals
    
    def _extract_score(self, text: str) -> int:
        """Extract feasibility score from analysis"""
        import re
        # Look for patterns like "8/10" or "score: 7"
        patterns = [
            r'(\d+)/10',
            r'score[:\s]+(\d+)',
            r'rate[:\s]+(\d+)',
            r'feasibility[:\s]+(\d+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                return int(match.group(1))
        
        return 7  # Default
    
    def _estimate_duration(self, text: str) -> str:
        """Estimate goal duration from analysis"""
        text_lower = text.lower()
        
        if 'years' in text_lower or 'long-term' in text_lower:
            return "6-12 months"
        elif 'months' in text_lower:
            return "3-6 months"
        elif 'weeks' in text_lower:
            return "1-3 months"
        else:
            return "3-6 months"  # Default
    
    def analyze_goal_progress(self, goal, progress_data: Dict, user_id: int, db, api_key: str = None) -> Dict:
        """Analyze progress update on a goal"""
        self._ensure_agents(api_key)
        
        # Get recent progress logs
        recent_logs = db.query(models.GoalProgress).filter(
            models.GoalProgress.goal_id == goal.id
        ).order_by(models.GoalProgress.timestamp.desc()).limit(5).all()
        
        progress_history = [
            {
                "date": log.timestamp.strftime("%Y-%m-%d"),
                "progress": log.progress,
                "notes": log.notes,
                "obstacles": log.obstacles,
                "wins": log.wins
            }
            for log in recent_logs
        ]
        
        analysis_task = Task(
            description=f"""Analyze this goal progress update:
            
            Goal: {goal.title}
            Current Progress: {progress_data['progress']}%
            Previous Progress: {progress_history[0]['progress'] if progress_history else 0}%
            
            Progress History (last 5 updates):
            {json.dumps(progress_history, indent=2)}
            
            Current Update:
            - Notes: {progress_data.get('notes', 'None')}
            - Obstacles: {progress_data.get('obstacles', 'None')}
            - Wins: {progress_data.get('wins', 'None')}
            - Mood: {progress_data.get('mood', 'Not specified')}
            
            Your job:
            1. Is the progress rate healthy or stalling?
            2. Are obstacles being addressed or accumulating?
            3. Is their mood/energy sustainable?
            4. Are wins genuine milestones or busywork?
            5. What should they focus on next?
            6. Any red flags suggesting goal should be reconsidered?
            
            Be direct. If they're making excuses, call it out.""",
            agent=self.psychologist,
            expected_output="Progress analysis with specific next steps"
        )
        
        crew = Crew(
            agents=[self.psychologist],
            tasks=[analysis_task],
            process=Process.sequential,
            verbose=False
        )
        
        result = crew.kickoff()
        
        return {
            "feedback": str(result),
            "progress_rate": self._calculate_progress_rate(progress_history, progress_data['progress']),
            "needs_attention": self._needs_attention(str(result))
        }
    
    def _calculate_progress_rate(self, history: List[Dict], current: float) -> str:
        """Calculate if progress rate is healthy"""
        if not history:
            return "insufficient_data"
        
        prev = history[0]['progress']
        change = current - prev
        
        if change > 10:
            return "excellent"
        elif change > 5:
            return "good"
        elif change > 0:
            return "slow"
        else:
            return "stalled"
    
    def _needs_attention(self, feedback: str) -> bool:
        """Determine if goal needs immediate attention"""
        warning_words = ['stall', 'stuck', 'concern', 'warning', 'red flag', 'reconsider']
        return any(word in feedback.lower() for word in warning_words)
    
    def weekly_goals_review(self, user_id: int, db) -> Dict:
        """Weekly review of all active goals"""
        
        goals = db.query(models.Goal).filter(
            models.Goal.user_id == user_id,
            models.Goal.status == 'active'
        ).all()
        
        if not goals:
            return {"message": "No active goals to review"}
        
        goals_summary = []
        for goal in goals:
            recent_progress = db.query(models.GoalProgress).filter(
                models.GoalProgress.goal_id == goal.id
            ).order_by(models.GoalProgress.timestamp.desc()).first()
            
            goals_summary.append({
                "title": goal.title,
                "progress": goal.progress,
                "priority": goal.priority,
                "target_date": goal.target_date.strftime("%Y-%m-%d") if goal.target_date else "No deadline",
                "last_update": recent_progress.timestamp.strftime("%Y-%m-%d") if recent_progress else "Never",
                "subgoals_completed": len([sg for sg in goal.subgoals if sg.status == "completed"]),
                "subgoals_total": len(goal.subgoals)
            })
        
        review_task = Task(
            description=f"""Weekly goals review:
            
            Active Goals:
            {json.dumps(goals_summary, indent=2)}
            
            Your job:
            1. Which goal should be the TOP priority this week?
            2. Any goals that are neglected or stalling?
            3. Any goals that should be paused or abandoned?
            4. Are they spreading too thin across too many goals?
            5. Suggest the ONE goal to make significant progress on
            6. Create specific weekly commitment (X hours on Y goal)
            
            Be ruthless about prioritization. Less is more.""",
            agent=self.strategist,
            expected_output="Weekly priority guidance with specific focus"
        )
        
        crew = Crew(
            agents=[self.strategist],
            tasks=[review_task],
            process=Process.sequential,
            verbose=False
        )
        
        result = crew.kickoff()
        
        return {
            "review": str(result),
            "goals_count": len(goals),
            "needs_reprioritization": self._needs_reprioritization(goals_summary)
        }
    
    def _needs_reprioritization(self, goals: List[Dict]) -> bool:
        """Check if user has too many active goals"""
        high_priority = len([g for g in goals if g['priority'] in ['critical', 'high']])
        return high_priority > 3  # More than 3 high-priority goals is too many