from fastapi import FastAPI, Depends, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Dict, Optional
import models
from database import system_engine, get_system_db, init_system_db, get_user_db_engine, UserBase
from models import (
    UserCreate, UserResponse, CheckInCreate, CheckInUpdate, CheckInResponse,
    AgentAdviceResponse, GitHubAnalysisResponse, ChatMessage,
    LifeDecisionCreate, LifeDecisionResponse, GoalsDashboardResponse,
    NotificationResponse, NotificationStats,
    ActionPlanCreate, ActionPlanResponse, SkillFocusCreate,
    DailyTaskUpdate, SkillReminderResponse, SkillReminderCreate,
)
from github_integration import GitHubAnalyzer
from crew import SageMentorCrew
from datetime import datetime, timedelta
from pydantic import BaseModel
from datetime import datetime, timedelta, time
from typing import Optional
from notification_service import NotificationService
from action_plan_service import ActionPlanService
from cache import cache, cached, cache_dashboard, get_cached_dashboard, invalidate_user_cache

init_system_db()

app = FastAPI(title="Reflog AI Mentor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://clerk.com",
        "https://*.clerk.accounts.dev"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

github_analyzer = GitHubAnalyzer()
sage_crew = SageMentorCrew()
action_plan_service = ActionPlanService()

def get_user_db(github_username: str, system_db: Session = Depends(get_system_db)):
    """
    Dependency to get a database session for a specific user's Neon DB.
    Requires github_username in the path parameters.
    """
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.neon_db_url:
        # Fallback for development or initial setup - maybe raise error in strict mode
        # For now, raise error to enforce BYOM
        raise HTTPException(
            status_code=400, 
            detail="Database not configured. Please set your Neon Database URL in Settings."
        )
    
    try:
        engine = get_user_db_engine(user.neon_db_url)
        # Ensure tables exist in user's DB
        # Note: In production, we might want a better migration strategy than create_all on every request
        # But for this "BYOM" app, it ensures the user's DB is always up to date
        UserBase.metadata.create_all(bind=engine)
        
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        yield db
    except Exception as e:
        print(f"Failed to connect to user database: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to your database: {str(e)}")
    finally:
        if 'db' in locals():
            db.close()

@app.get("/")
def read_root():
    return {
        "message": "Sage AI Mentor API",
        "version": "1.0.0",
        "status": "running"
    }

@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_system_db)):
    """
    Create or update user - idempotent operation
    If user exists, update their email and return existing user
    """
    # Check if user already exists
    db_user = db.query(models.User).filter(
        models.User.github_username == user.github_username
    ).first()
    
    if db_user:
        # User exists - update email if provided and different
        if user.email and db_user.email != user.email:
            db_user.email = user.email
            db.commit()
            db.refresh(db_user)
            print(f"✓ Updated existing user: {user.github_username}")
        else:
            print(f"ℹ️  User already exists: {user.github_username}")
        return db_user
    
    # Create new user
    new_user = models.User(
        github_username=user.github_username,
        email=user.email,
        onboarding_complete=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"✅ Created new user: {user.github_username}")
    return new_user


@app.get("/users/{github_username}", response_model=UserResponse)
def get_user(github_username: str, db: Session = Depends(get_system_db)):
    """Get user by GitHub username"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=404, 
            detail=f"User '{github_username}' not found. Please complete onboarding first."
        )
    
    return user


@app.patch("/users/{github_username}/complete-onboarding")
def complete_onboarding(github_username: str, db: Session = Depends(get_system_db)):
    """Mark user onboarding as complete"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.onboarding_complete = True
    db.commit()
    db.refresh(user)
    
    return {"message": "Onboarding completed", "user": user}


# Also improve the analyze-github endpoint error handling
@app.post("/analyze-github/{github_username}")
def analyze_github(
    github_username: str, 
    db: Session = Depends(get_user_db), # Use User DB for storing analysis
    system_db: Session = Depends(get_system_db), # Use System DB for user lookup/updates
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    """Analyze GitHub profile and store results"""
    
    # Get user from System DB to update onboarding status
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=404, 
            detail="User not found. Please create user first via /users endpoint."
        )
    
    # Analyze GitHub
    github_data = github_analyzer.analyze_user(github_username)
    
    # Check for errors from GitHub API
    if "error" in github_data:
        error_msg = github_data["error"]
        
        # Provide helpful error messages
        if "404" in error_msg or "not found" in error_msg.lower():
            raise HTTPException(
                status_code=404, 
                detail=f"GitHub user '{github_username}' not found. Please check the username and try again."
            )
        elif "rate limit" in error_msg.lower():
            raise HTTPException(
                status_code=429, 
                detail="GitHub API rate limit exceeded. Please try again in a few minutes."
            )
        elif "token" in error_msg.lower():
            raise HTTPException(
                status_code=500, 
                detail="GitHub token not configured. Please contact support."
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to analyze GitHub profile: {error_msg}"
            )
    
    # Store analysis in database
    analysis = models.GitHubAnalysis(
        user_id=user.id,
        username=github_username,
        total_repos=github_data["total_repos"],
        active_repos=github_data["active_repos"],
        total_commits=github_data["total_commits"],
        languages=github_data["languages"],
        patterns=github_data["patterns"]
    )
    db.add(analysis)
    db.commit()
    
    # Get recent check-ins for context
    recent_checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id
    ).order_by(models.CheckIn.timestamp.desc()).limit(7).all()
    
    checkin_history = [
        {
            "date": c.timestamp.strftime("%Y-%m-%d"),
            "energy": c.energy_level,
            "commitment": c.commitment,
            "shipped": c.shipped
        }
        for c in recent_checkins
    ]
    
    # Run AI analysis
    crew_result = sage_crew.analyze_developer(github_data, checkin_history, api_key=x_groq_key)
    
    # Store AI insights
    advice = models.AgentAdvice(
        user_id=user.id,
        agent_name="Multi-Agent Analysis",
        advice=crew_result["agent_insights"]["full_analysis"],
        evidence=github_data,
        interaction_type="analysis"
    )
    db.add(advice)
    
    # Mark onboarding as complete in System DB
    user.onboarding_complete = True
    system_db.commit()
    
    print(f"✅ Analysis complete for {github_username}")
    
    return {
        "github_analysis": github_data,
        "ai_insights": crew_result,
        "message": "Analysis complete - welcome to Sage!"
    }

@app.get("/github-analysis/{github_username}", response_model=GitHubAnalysisResponse)
def get_github_analysis(github_username: str, db: Session = Depends(get_user_db)):
    # Note: We don't need to query User table here, as we are already in User DB context
    # But we need the user_id for the query.
    # In the new model, user_id is just an integer column in User DB.
    # We need to find the user_id. 
    # OPTION 1: Pass user_id from frontend? No.
    # OPTION 2: Look up user in System DB to get ID? Yes.
    # Actually, get_user_db dependency already verifies user exists in System DB.
    # But it yields the User DB session.
    # We need the user ID.
    # Let's inject system_db as well to get the ID.
    pass

# Redefine with system_db injection
@app.get("/github-analysis/{github_username}", response_model=GitHubAnalysisResponse)
def get_github_analysis(
    github_username: str, 
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    analysis = db.query(models.GitHubAnalysis).filter(
        models.GitHubAnalysis.user_id == user.id
    ).order_by(models.GitHubAnalysis.analyzed_at.desc()).first()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found. Run /analyze-github first")
    
    return analysis

@app.post("/checkins/{github_username}")
def create_checkin(
    github_username: str,
    checkin: CheckInCreate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    recent_checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id
    ).order_by(models.CheckIn.timestamp.desc()).limit(7).all()
    
    history = {
        "recent_checkins": len(recent_checkins),
        "avg_energy": sum(c.energy_level for c in recent_checkins) / len(recent_checkins) if recent_checkins else 0,
        "commitments_kept": sum(1 for c in recent_checkins if c.shipped) if recent_checkins else 0
    }
    
    analysis = sage_crew.quick_checkin_analysis(
        {
            "energy_level": checkin.energy_level,
            "avoiding_what": checkin.avoiding_what,
            "commitment": checkin.commitment,
            "mood": checkin.mood
        },
        history,
        api_key=x_groq_key
    )
    
    new_checkin = models.CheckIn(
        user_id=user.id,
        energy_level=checkin.energy_level,
        avoiding_what=checkin.avoiding_what,
        commitment=checkin.commitment,
        mood=checkin.mood,
        ai_analysis=analysis["analysis"]
    )
    db.add(new_checkin)
    
    # Store as interaction
    advice = models.AgentAdvice(
        user_id=user.id,
        agent_name="Psychologist",
        advice=analysis["analysis"],
        evidence={"checkin": checkin.dict()},
        interaction_type="checkin"
    )
    db.add(advice)
    
    db.commit()
    db.refresh(new_checkin)

    invalidate_user_cache(github_username)
    
    return {
        "checkin_id": new_checkin.id,
        "ai_response": analysis["analysis"],
        "message": "Check-in recorded"
    }

@app.patch("/checkins/{github_username}/{checkin_id}/evening")
def evening_checkin(
    github_username: str,
    checkin_id: int,
    update: CheckInUpdate,
    db: Session = Depends(get_user_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    checkin = db.query(models.CheckIn).filter(
        models.CheckIn.id == checkin_id
    ).first()
    
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    
    checkin.shipped = update.shipped
    checkin.excuse = update.excuse
    db.commit()
    
    feedback = sage_crew.evening_checkin_review(
        checkin.commitment,
        update.shipped,
        update.excuse,
        api_key=x_groq_key
    )
    
    return {
        "message": "Evening check-in recorded",
        "ai_feedback": feedback["feedback"]
    }

@app.get("/checkins/{github_username}", response_model=List[CheckInResponse])
def get_checkins(
    github_username: str,
    limit: int = 30,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id
    ).order_by(models.CheckIn.timestamp.desc()).limit(limit).all()
    
    return checkins

@app.get("/advice/{github_username}", response_model=List[AgentAdviceResponse])
def get_advice(
    github_username: str, 
    limit: int = 20, 
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    advice = db.query(models.AgentAdvice).filter(
        models.AgentAdvice.user_id == user.id
    ).order_by(models.AgentAdvice.created_at.desc()).limit(limit).all()
    
    return advice

@app.get("/dashboard/{github_username}")
def get_dashboard(
    github_username: str, 
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    # Check cache first
    cached_data = get_cached_dashboard(github_username)
    if cached_data:
        return cached_data
    
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Use single optimized query with eager loading
    github_analysis = db.query(models.GitHubAnalysis).filter(
        models.GitHubAnalysis.user_id == user.id
    ).order_by(models.GitHubAnalysis.analyzed_at.desc()).first()
    
    # Optimized checkins query with limit
    checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id
    ).order_by(models.CheckIn.timestamp.desc()).limit(7).all()
    
    # Optimized advice query
    latest_advice = db.query(models.AgentAdvice).filter(
        models.AgentAdvice.user_id == user.id
    ).order_by(models.AgentAdvice.created_at.desc()).limit(3).all()
    
    # Calculate stats efficiently
    total_checkins = len(checkins)
    commitments_kept = sum(1 for c in checkins if c.shipped == True)
    avg_energy = sum(c.energy_level for c in checkins) / total_checkins if total_checkins > 0 else 0
    
    dashboard_data = {
        "user": {
            "username": user.github_username,
            "member_since": user.created_at.strftime("%Y-%m-%d")
        },
        "github": {
            "total_repos": github_analysis.total_repos if github_analysis else 0,
            "active_repos": github_analysis.active_repos if github_analysis else 0,
            "languages": github_analysis.languages if github_analysis else {},
            "patterns": github_analysis.patterns if github_analysis else []
        },
        "stats": {
            "total_checkins": total_checkins,
            "commitments_kept": commitments_kept,
            "success_rate": (commitments_kept / total_checkins * 100) if total_checkins > 0 else 0,
            "avg_energy": round(avg_energy, 1)
        },
        "recent_advice": [
            {
                "id": a.id,
                "agent": a.agent_name,
                "advice": a.advice[:200] + "..." if len(a.advice) > 200 else a.advice,
                "date": a.created_at.strftime("%Y-%m-%d"),
                "type": a.interaction_type
            }
            for a in latest_advice
        ]
    }
    
    # Cache the result
    cache_dashboard(github_username, dashboard_data)
    
    return dashboard_data

@app.post("/chat/{github_username}")
async def chat_with_mentor(
    github_username: str,
    message: ChatMessage,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    github_analysis = db.query(models.GitHubAnalysis).filter(
        models.GitHubAnalysis.user_id == user.id
    ).order_by(models.GitHubAnalysis.analyzed_at.desc()).first()
    
    recent_checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id
    ).order_by(models.CheckIn.timestamp.desc()).limit(7).all()
    
    life_events = db.query(models.LifeEvent).filter(
        models.LifeEvent.user_id == user.id
    ).order_by(models.LifeEvent.timestamp.desc()).limit(10).all()
    
    user_context = {
        "github": {
            "total_repos": github_analysis.total_repos if github_analysis else 0,
            "active_repos": github_analysis.active_repos if github_analysis else 0,
            "languages": github_analysis.languages if github_analysis else {},
            "patterns": github_analysis.patterns if github_analysis else []
        },
        "recent_performance": {
            "total_checkins": len(recent_checkins),
            "commitments_kept": sum(1 for c in recent_checkins if c.shipped),
            "avg_energy": sum(c.energy_level for c in recent_checkins) / len(recent_checkins) if recent_checkins else 0
        },
        "life_decisions": [
            {
                "title": e.description,
                "type": e.event_type,
                "date": e.timestamp.strftime("%Y-%m-%d")
            }
            for e in life_events
        ]
    }
    
    deliberation = sage_crew.chat_deliberation(
        message.message,
        user_context,
        message.context,
        api_key=x_groq_key
    )
    
    advice = models.AgentAdvice(
        user_id=user.id,
        agent_name="Multi-Agent Chat",
        advice=deliberation["final_response"],
        evidence={"user_message": message.message, "deliberation": deliberation["debate"], "raw_deliberation": deliberation.get("raw_deliberation", [])},
        interaction_type="chat"
    )
    db.add(advice)
    db.commit()
    
    return {
        "response": deliberation["final_response"],
        "agent_debate": deliberation["debate"],
        "key_insights": deliberation["key_insights"],
        "recommended_actions": deliberation["actions"],
        "raw_deliberation": deliberation.get("raw_deliberation", []),
        "interaction_id": advice.id
    }

@app.post("/life-decisions/{github_username}", response_model=LifeDecisionResponse)
def create_life_decision(
    github_username: str,
    decision: LifeDecisionCreate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    """Create a new life decision and analyze it with AI"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create the life event FIRST (without AI analysis)
    context_data = {
        "full_description": decision.description,
        "impact_areas": decision.impact_areas,
        **(decision.context if decision.context else {})
    }
    
    life_event = models.LifeEvent(
        user_id=user.id,
        event_type=decision.decision_type,
        description=decision.title,
        time_horizon=decision.time_horizon,
        context=context_data
    )
    
    db.add(life_event)
    db.commit()
    db.refresh(life_event)
    
    print(f"📝 Life event created (ID: {life_event.id}), now analyzing...")
    
        # NOW run AI analysis
    try:
        analysis = sage_crew.analyze_life_decision(
            {
                "title": decision.title,
                "description": decision.description,
                "type": decision.decision_type,
                "impact_areas": decision.impact_areas,
                "time_horizon": decision.time_horizon
            },
            user.id,
            db,
            api_key=x_groq_key
        )
        
        print(f"🤖 AI Analysis completed:")
        print(f"  - Analysis length: {len(analysis.get('analysis', ''))}")
        print(f"  - Lessons count: {len(analysis.get('lessons', []))}")
        
        # Update the context with AI analysis
        life_event.context["ai_analysis"] = analysis["analysis"]
        life_event.context["lessons"] = analysis["lessons"]
        life_event.outcome = analysis["long_term_impact"]
        
        # IMPORTANT: Mark the object as modified for PostgreSQL JSON
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(life_event, "context")
        
        db.commit()
        db.refresh(life_event)
        
        print(f"✅ AI analysis saved to database")
        
        return {
            "id": life_event.id,
            "title": decision.title,
            "description": decision.description,
            "decision_type": decision.decision_type,
            "impact_areas": decision.impact_areas,
            "timestamp": life_event.timestamp,
            "time_horizon": decision.time_horizon,
            "ai_analysis": analysis["analysis"],
            "lessons_learned": analysis["lessons"]
        }
        
    except Exception as e:
        print(f"❌ AI analysis failed: {str(e)}")
        # Return without AI analysis if it fails
        return {
            "id": life_event.id,
            "title": decision.title,
            "description": decision.description,
            "decision_type": decision.decision_type,
            "impact_areas": decision.impact_areas,
            "timestamp": life_event.timestamp,
            "time_horizon": decision.time_horizon,
            "ai_analysis": None,
            "lessons_learned": []
        }


# Add new endpoint to re-analyze existing decisions
@app.post("/life-decisions/{github_username}/{decision_id}/reanalyze")
def reanalyze_life_decision(
    github_username: str,
    decision_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    """Re-run AI analysis on an existing life decision"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    life_event = db.query(models.LifeEvent).filter(
        models.LifeEvent.id == decision_id,
        models.LifeEvent.user_id == user.id
    ).first()
    
    if not life_event:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    context = life_event.context if isinstance(life_event.context, dict) else {}
    
    print(f"🔄 Re-analyzing life decision {decision_id}...")
    
    try:
        # Run AI analysis
        analysis = sage_crew.analyze_life_decision(
            {
                "title": life_event.description,
                "description": context.get("full_description", life_event.description),
                "type": life_event.event_type,
                "impact_areas": context.get("impact_areas", []),
                "time_horizon": life_event.time_horizon
            },
            user.id,
            db,
            api_key=x_groq_key
        )
        
        print(f"🤖 Re-analysis completed:")
        print(f"  - Analysis length: {len(analysis.get('analysis', ''))}")
        print(f"  - Lessons count: {len(analysis.get('lessons', []))}")
        
        # Update context with new analysis
        life_event.context["ai_analysis"] = analysis["analysis"]
        life_event.context["lessons"] = analysis["lessons"]
        life_event.outcome = analysis["long_term_impact"]
        
        # Mark as modified for PostgreSQL
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(life_event, "context")
        
        db.commit()
        db.refresh(life_event)
        
        print(f"✅ Re-analysis saved")
        
        return {
            "message": "Re-analysis complete",
            "ai_analysis": analysis["analysis"],
            "lessons_learned": analysis["lessons"],
            "long_term_impact": analysis["long_term_impact"]
        }
        
    except Exception as e:
        print(f"❌ Re-analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Re-analysis failed: {str(e)}")


@app.get("/life-decisions/{github_username}", response_model=List[LifeDecisionResponse])
def get_life_decisions(
    github_username: str,
    limit: int = 20,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get all life decisions for a user"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    events = db.query(models.LifeEvent).filter(
        models.LifeEvent.user_id == user.id
    ).order_by(models.LifeEvent.timestamp.desc()).limit(limit).all()
    
    results = []
    for e in events:
        # Handle both dict and potential string JSON
        context = e.context if isinstance(e.context, dict) else {}
        
        # Debug print to see what we're getting
        print(f"📊 Event {e.id} context keys: {context.keys() if context else 'None'}")
        
        results.append({
            "id": e.id,
            "title": e.description,  # Title is stored in description
            "description": context.get("full_description", e.description),
            "decision_type": e.event_type,
            "impact_areas": context.get("impact_areas", []),
            "timestamp": e.timestamp,
            "time_horizon": e.time_horizon,
            "ai_analysis": context.get("ai_analysis"),
            "lessons_learned": context.get("lessons", [])
        })
    
    return results


@app.get("/life-decisions/{github_username}/{decision_id}", response_model=LifeDecisionResponse)
def get_life_decision_detail(
    github_username: str,
    decision_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get detailed view of a specific life decision"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    event = db.query(models.LifeEvent).filter(
        models.LifeEvent.id == decision_id,
        models.LifeEvent.user_id == user.id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    context = event.context if isinstance(event.context, dict) else {}
    
    return {
        "id": event.id,
        "title": event.description,
        "description": context.get("full_description", event.description),
        "decision_type": event.event_type,
        "impact_areas": context.get("impact_areas", []),
        "timestamp": event.timestamp,
        "time_horizon": event.time_horizon,
        "ai_analysis": context.get("ai_analysis"),
        "lessons_learned": context.get("lessons", [])
    }

@app.post("/life-decisions/{github_username}/{decision_id}/evaluate")
def evaluate_decision(
    github_username: str,
    decision_id: int,
    evaluation: Dict,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    event = db.query(models.LifeEvent).filter(
        models.LifeEvent.id == decision_id
    ).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    user = system_db.query(models.User).filter(models.User.id == event.user_id).first()
    
    re_evaluation = sage_crew.reevaluate_decision(
        event,
        evaluation.get("current_situation", ""),
        evaluation.get("what_changed", ""),
        user.id,
        db,
        api_key=x_groq_key
    )
    
    if "re_evaluations" not in event.context:
        event.context["re_evaluations"] = []
    
    event.context["re_evaluations"].append({
        "date": datetime.now().isoformat(),
        "analysis": re_evaluation["analysis"],
        "new_lessons": re_evaluation["new_lessons"],
        "how_it_aged": re_evaluation["how_it_aged"]
    })
    db.commit()
    
    return {
        "message": "Decision re-evaluated",
        "analysis": re_evaluation["analysis"],
        "new_lessons": re_evaluation["new_lessons"],
        "how_it_aged": re_evaluation["how_it_aged"]
    }

# Add this debug endpoint to main.py to inspect what's in the database

@app.get("/debug/life-decisions/{github_username}")
def debug_life_decisions(
    github_username: str, 
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Debug endpoint to see raw life decision data"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        return {"error": "User not found"}
    
    return {
        "life_decisions": [
            {
                "id": e.id,
                "description": e.description,
                "context": e.context
            }
            for e in user.life_events
        ]
    }

class DatabaseConfig(BaseModel):
    database_url: str

@app.post("/config/database")
def update_database_config(config: DatabaseConfig):
    """Update the database URL in .env file"""
    import re
    import os
    
    # Basic validation
    if not config.database_url.startswith("postgresql://") and not config.database_url.startswith("postgres://"):
        raise HTTPException(status_code=400, detail="Invalid database URL. Must start with postgresql://")
    
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    
    try:
        # Read current .env
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                content = f.read()
        else:
            content = ""
            
        # Update or add DATABASE_URL
        if "DATABASE_URL=" in content:
            content = re.sub(r"DATABASE_URL=.*", f"DATABASE_URL={config.database_url}", content)
        else:
            content += f"\nDATABASE_URL={config.database_url}\n"
            
        # Write back
        with open(env_path, "w") as f:
            f.write(content)
            
        return {"message": "Database configuration updated. Please restart the backend for changes to take effect."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")

@app.patch("/users/{github_username}/config")
def update_user_config(
    github_username: str,
    config: DatabaseConfig,
    db: Session = Depends(get_system_db)
):
    """Update user's Neon Database URL"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate URL
    if not config.database_url.startswith("postgresql://") and not config.database_url.startswith("postgres://"):
        raise HTTPException(status_code=400, detail="Invalid database URL. Must start with postgresql://")
    
    user.neon_db_url = config.database_url
    db.commit()
    db.refresh(user)
    
    return {"message": "Database configuration updated successfully"}
    
    events = db.query(models.LifeEvent).filter(
        models.LifeEvent.user_id == user.id
    ).all()
    
    debug_data = []
    for event in events:
        debug_data.append({
            "id": event.id,
            "event_type": event.event_type,
            "description": event.description,
            "time_horizon": event.time_horizon,
            "timestamp": str(event.timestamp),
            "outcome": event.outcome,
            "context_type": type(event.context).__name__,
            "context_keys": list(event.context.keys()) if isinstance(event.context, dict) else None,
            "has_ai_analysis": "ai_analysis" in event.context if isinstance(event.context, dict) else False,
            "ai_analysis_length": len(event.context.get("ai_analysis", "")) if isinstance(event.context, dict) else 0,
            "has_lessons": "lessons" in event.context if isinstance(event.context, dict) else False,
            "lessons_count": len(event.context.get("lessons", [])) if isinstance(event.context, dict) else 0,
            "raw_context": event.context  # Full context for inspection
        })
    
    return {
        "user": github_username,
        "total_events": len(events),
        "events": debug_data
    }

# ==================== COMMITMENT TRACKING ====================

@app.get("/commitments/{github_username}/today")
def get_today_commitment(
    github_username: str, 
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get today's commitment if exists"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get today's date range (start and end of day)
    today_start = datetime.combine(datetime.now().date(), time.min)
    today_end = datetime.combine(datetime.now().date(), time.max)
    
    # Find today's check-in
    checkin = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= today_start,
        models.CheckIn.timestamp <= today_end
    ).order_by(models.CheckIn.timestamp.desc()).first()
    
    if not checkin:
        return {
            "has_commitment": False,
            "message": "No check-in today"
        }
    
    # Calculate hours since commitment
    hours_since = (datetime.now() - checkin.timestamp).total_seconds() / 3600
    
    # Determine if it's time for evening check-in (after 6 PM)
    current_hour = datetime.now().hour
    should_review = current_hour >= 18 and checkin.shipped is None
    
    return {
        "has_commitment": True,
        "checkin_id": checkin.id,
        "commitment": checkin.commitment,
        "energy_level": checkin.energy_level,
        "avoiding_what": checkin.avoiding_what,
        "created_at": checkin.timestamp.isoformat(),
        "hours_since": round(hours_since, 1),
        "shipped": checkin.shipped,
        "excuse": checkin.excuse,
        "needs_review": should_review,
        "can_review": current_hour >= 17  # Can review after 5 PM
    }


@app.get("/commitments/{github_username}/pending")
def get_pending_commitments(
    github_username: str, 
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get all unreviewed commitments (past days not marked shipped/failed)"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get check-ins from last 7 days that haven't been reviewed
    week_ago = datetime.now() - timedelta(days=7)
    
    pending = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= week_ago,
        models.CheckIn.shipped == None  # Not yet reviewed
    ).order_by(models.CheckIn.timestamp.desc()).all()
    
    return {
        "pending_count": len(pending),
        "commitments": [
            {
                "id": c.id,
                "commitment": c.commitment,
                "date": c.timestamp.strftime("%Y-%m-%d"),
                "days_ago": (datetime.now().date() - c.timestamp.date()).days
            }
            for c in pending
        ]
    }


@app.post("/commitments/{github_username}/{checkin_id}/review")
def review_commitment(
    github_username: str,
    checkin_id: int,
    review: CheckInUpdate,
    db: Session = Depends(get_user_db)
):
    """Mark commitment as shipped or failed with excuse"""
    checkin = db.query(models.CheckIn).filter(
        models.CheckIn.id == checkin_id
    ).first()
    
    if not checkin:
        raise HTTPException(status_code=404, detail="Check-in not found")
    
    # Update shipped status
    checkin.shipped = review.shipped
    checkin.excuse = review.excuse
    
    db.commit()
    db.refresh(checkin)
    
    # Generate AI feedback on the excuse/success
    # Note: checkin.user_id is just an int now, not a relationship
    # But we don't need the user object here, just the ID for queries
    
    # Get recent pattern
    recent_checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == checkin.user_id,
        models.CheckIn.shipped != None
    ).order_by(models.CheckIn.timestamp.desc()).limit(10).all()
    
    shipped_count = sum(1 for c in recent_checkins if c.shipped)
    total_count = len(recent_checkins)
    
    feedback = sage_crew.evening_checkin_review(
        checkin.commitment,
        review.shipped,
        review.excuse
    )
    
    # Store feedback
    advice = models.AgentAdvice(
        user_id=checkin.user_id,
        agent_name="Contrarian",
        advice=feedback["feedback"],
        evidence={
            "commitment": checkin.commitment,
            "shipped": review.shipped,
            "excuse": review.excuse,
            "recent_success_rate": f"{shipped_count}/{total_count}" if total_count > 0 else "0/0"
        },
        interaction_type="evening_review"
    )
    db.add(advice)
    db.commit()
    
    return {
        "message": "Commitment reviewed",
        "shipped": review.shipped,
        "feedback": feedback["feedback"],
        "success_rate": f"{shipped_count}/{total_count}" if total_count > 0 else "N/A",
        "streak_info": calculate_streak(recent_checkins)
    }


@app.get("/commitments/{github_username}/stats")
def get_commitment_stats(
    github_username: str,
    days: int = 30,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get commitment statistics"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    since = datetime.now() - timedelta(days=days)
    
    checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= since,
        models.CheckIn.shipped != None  # Only reviewed ones
    ).order_by(models.CheckIn.timestamp.desc()).all()
    
    if not checkins:
        return {
            "total_commitments": 0,
            "shipped": 0,
            "failed": 0,
            "success_rate": 0,
            "current_streak": 0,
            "best_streak": 0,
            "common_excuses": []
        }
    
    shipped_count = sum(1 for c in checkins if c.shipped)
    failed_count = len(checkins) - shipped_count
    
    # Calculate streaks
    current_streak, best_streak = calculate_streaks_detailed(checkins)
    
    # Get common excuses
    excuses = [c.excuse for c in checkins if c.excuse and not c.shipped]
    excuse_counter = {}
    for excuse in excuses:
        # Simple keyword extraction
        words = excuse.lower().split()
        for word in ['time', 'tired', 'hard', 'busy', 'complex', 'stuck']:
            if word in words:
                excuse_counter[word] = excuse_counter.get(word, 0) + 1
    
    common_excuses = sorted(excuse_counter.items(), key=lambda x: x[1], reverse=True)[:3]
    
    return {
        "period_days": days,
        "total_commitments": len(checkins),
        "shipped": shipped_count,
        "failed": failed_count,
        "success_rate": round((shipped_count / len(checkins) * 100), 1),
        "current_streak": current_streak,
        "best_streak": best_streak,
        "common_excuses": [{"excuse": e[0], "count": e[1]} for e in common_excuses],
        "weekly_breakdown": get_weekly_breakdown(checkins)
    }


def calculate_streak(checkins: list) -> dict:
    """Calculate current streak from recent check-ins"""
    if not checkins:
        return {"current": 0, "best": 0}
    
    current_streak = 0
    for checkin in checkins:
        if checkin.shipped:
            current_streak += 1
        else:
            break
    
    return {"current": current_streak, "type": "shipping" if current_streak > 0 else "none"}


def calculate_streaks_detailed(checkins: list) -> tuple:
    """Calculate current and best streak"""
    if not checkins:
        return 0, 0
    
    current_streak = 0
    best_streak = 0
    temp_streak = 0
    
    for checkin in reversed(checkins):  # Start from oldest
        if checkin.shipped:
            temp_streak += 1
            best_streak = max(best_streak, temp_streak)
        else:
            temp_streak = 0
    
    # Current streak is from most recent
    for checkin in checkins:
        if checkin.shipped:
            current_streak += 1
        else:
            break
    
    return current_streak, best_streak


def get_weekly_breakdown(checkins: list) -> list:
    """Get week-by-week breakdown"""
    weeks = {}
    for checkin in checkins:
        week_start = checkin.timestamp.date() - timedelta(days=checkin.timestamp.weekday())
        week_key = week_start.strftime("%Y-%m-%d")
        
        if week_key not in weeks:
            weeks[week_key] = {"shipped": 0, "failed": 0}
        
        if checkin.shipped:
            weeks[week_key]["shipped"] += 1
        else:
            weeks[week_key]["failed"] += 1
    
    return [
        {
            "week_start": week,
            "shipped": data["shipped"],
            "failed": data["failed"],
            "rate": round((data["shipped"] / (data["shipped"] + data["failed"]) * 100), 1)
        }
        for week, data in sorted(weeks.items(), reverse=True)[:4]  # Last 4 weeks
    ]


@app.get("/commitments/{github_username}/reminder-needed")
def check_reminder_needed(
    github_username: str, 
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Check if user needs a reminder (for notifications)"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        return {"needs_reminder": False}
    
    # Check if there's a commitment today that needs review
    today_start = datetime.combine(datetime.now().date(), time.min)
    today_end = datetime.combine(datetime.now().date(), time.max)
    current_hour = datetime.now().hour
    
    checkin = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= today_start,
        models.CheckIn.timestamp <= today_end,
        models.CheckIn.shipped == None
    ).first()
    
    if not checkin:
        return {
            "needs_reminder": False,
            "reason": "no_commitment_today"
        }
    
    # Reminder logic
    if current_hour >= 20:  # After 8 PM
        return {
            "needs_reminder": True,
            "type": "urgent",
            "message": "⚠️ Did you ship what you promised today?",
            "commitment": checkin.commitment,
            "checkin_id": checkin.id
        }
    elif current_hour >= 18:  # After 6 PM
        return {
            "needs_reminder": True,
            "type": "gentle",
            "message": "🔔 Time to review: Did you ship today's commitment?",
            "commitment": checkin.commitment,
            "checkin_id": checkin.id
        }
    
    return {
        "needs_reminder": False,
        "reason": "too_early",
        "check_back_at": "18:00"
    }

@app.get("/commitments/{github_username}/weekly-summary")
def get_weekly_summary(
    github_username: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get week-by-week commitment summary with insights"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get last 4 weeks of data
    four_weeks_ago = datetime.now() - timedelta(days=28)
    
    checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= four_weeks_ago,
        models.CheckIn.shipped != None
    ).order_by(models.CheckIn.timestamp.asc()).all()
    
    # Group by week
    weeks = {}
    for checkin in checkins:
        week_start = checkin.timestamp.date() - timedelta(days=checkin.timestamp.weekday())
        week_key = week_start.strftime("%Y-%m-%d")
        
        if week_key not in weeks:
            weeks[week_key] = {
                "shipped": 0,
                "failed": 0,
                "total_energy": 0,
                "count": 0,
                "commitments": []
            }
        
        weeks[week_key]["count"] += 1
        weeks[week_key]["total_energy"] += checkin.energy_level
        weeks[week_key]["commitments"].append({
            "text": checkin.commitment,
            "shipped": checkin.shipped,
            "date": checkin.timestamp.strftime("%Y-%m-%d")
        })
        
        if checkin.shipped:
            weeks[week_key]["shipped"] += 1
        else:
            weeks[week_key]["failed"] += 1
    
    # Format for response
    summary = []
    for week_start, data in sorted(weeks.items(), reverse=True):
        summary.append({
            "week_start": week_start,
            "shipped": data["shipped"],
            "failed": data["failed"],
            "success_rate": round((data["shipped"] / data["count"] * 100), 1) if data["count"] > 0 else 0,
            "avg_energy": round(data["total_energy"] / data["count"], 1) if data["count"] > 0 else 0,
            "commitments": data["commitments"]
        })
    
    return {
        "weeks": summary,
        "total_weeks": len(summary)
    }

# ==================== GOALS ENDPOINTS ====================

@app.post("/goals/{github_username}", response_model=models.GoalResponse)
async def create_goal(
    github_username: str,
    goal: models.GoalCreate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Create a new life goal with AI analysis"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user context for AI analysis
    github_analysis = db.query(models.GitHubAnalysis).filter(
        models.GitHubAnalysis.user_id == user.id
    ).order_by(models.GitHubAnalysis.analyzed_at.desc()).first()
    
    recent_checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.shipped != None
    ).order_by(models.CheckIn.timestamp.desc()).limit(30).all()
    
    past_goals = db.query(models.Goal).filter(
        models.Goal.user_id == user.id,
        models.Goal.status == 'completed'
    ).all()
    
    user_context = {
        "github_stats": {
            "total_repos": github_analysis.total_repos if github_analysis else 0,
            "active_repos": github_analysis.active_repos if github_analysis else 0,
            "languages": github_analysis.languages if github_analysis else {}
        },
        "recent_performance": {
            "success_rate": (sum(1 for c in recent_checkins if c.shipped) / len(recent_checkins) * 100) if recent_checkins else 0,
            "avg_energy": sum(c.energy_level for c in recent_checkins) / len(recent_checkins) if recent_checkins else 0
        },
        "past_goals": [
            {"title": g.title, "completed": g.completed_at.strftime("%Y-%m-%d") if g.completed_at else None}
            for g in past_goals
        ]
    }
    
    # Create goal first
    new_goal = models.Goal(
        user_id=user.id,
        title=goal.title,
        description=goal.description,
        goal_type=goal.goal_type,
        priority=goal.priority,
        target_date=goal.target_date,
        success_criteria={"criteria": goal.success_criteria} if goal.success_criteria else None
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    
    print(f"🎯 Goal created (ID: {new_goal.id}), analyzing...")
    
    # AI Analysis
    try:
        analysis = sage_crew.analyze_goal(
            {
                "title": goal.title,
                "description": goal.description,
                "goal_type": goal.goal_type,
                "priority": goal.priority,
                "target_date": goal.target_date.isoformat() if goal.target_date else None,
                "success_criteria": goal.success_criteria
            },
            user_context,
            db
        )
        
        # Update goal with AI analysis
        new_goal.ai_analysis = analysis["analysis"]
        new_goal.ai_insights = {
            "insights": analysis["insights"],
            "obstacles": analysis["obstacles"],
            "recommendations": analysis["recommendations"],
            "feasibility_score": analysis["feasibility_score"],
            "estimated_duration": analysis["estimated_duration"]
        }
        new_goal.obstacles_identified = {"obstacles": analysis["obstacles"]}
        
        # Create suggested subgoals
        for sg in analysis["suggested_subgoals"]:
            subgoal = models.SubGoal(
                goal_id=new_goal.id,
                title=sg["title"],
                order=sg["order"]
            )
            db.add(subgoal)
        
        # Create milestones if provided
        if goal.milestones:
            for ms in goal.milestones:
                milestone = models.Milestone(
                    goal_id=new_goal.id,
                    title=ms.title,
                    description=ms.description,
                    target_date=ms.target_date
                )
                db.add(milestone)
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(new_goal, "ai_insights")
        flag_modified(new_goal, "obstacles_identified")
        
        db.commit()
        db.refresh(new_goal)
        
        print(f"✅ Goal analysis complete")
        
    except Exception as e:
        print(f"❌ Goal analysis failed: {str(e)}")
        # Continue without analysis if it fails
    
    return new_goal


@app.get("/goals/{github_username}", response_model=List[models.GoalResponse])
def get_goals(
    github_username: str,
    status: str = None,  # active, completed, paused, abandoned
    goal_type: str = None,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get all goals for a user with optional filters"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Base query
    query = db.query(models.Goal).filter(models.Goal.user_id == user.id)
    
    if status:
        query = query.filter(models.Goal.status == status)
    if goal_type:
        query = query.filter(models.Goal.goal_type == goal_type)

    # Use nested joinedload for sync endpoints
    query = query.options(
        joinedload(models.Goal.subgoals).joinedload(models.SubGoal.tasks),
        joinedload(models.Goal.milestones)
    )
    
    goals = query.order_by(models.Goal.created_at.desc()).all()
    return goals

@app.get("/goals/{github_username}/dashboard", response_model=GoalsDashboardResponse)
def get_goals_dashboard(
    github_username: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get comprehensive goals dashboard"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Use selectinload instead of joinedload for better collection loading
    active_goals = db.query(models.Goal).options(
        selectinload(models.Goal.subgoals).selectinload(models.SubGoal.tasks)
    ).filter(
        models.Goal.user_id == user.id,
        models.Goal.status == 'active'
    ).all()
    
    completed_goals = db.query(models.Goal).filter(
        models.Goal.user_id == user.id,
        models.Goal.status == 'completed'
    ).count()
    
    # Defensive programming: ensure progress is numeric and handle None
    total_progress = sum(float(g.progress or 0.0) for g in active_goals)
    avg_progress = (total_progress / len(active_goals)) if active_goals else 0.0
    
    # Fix the milestone query - properly join Goal table
    recent_milestones = db.query(models.Milestone).join(
        models.Goal,
        models.Milestone.goal_id == models.Goal.id
    ).filter(
        models.Goal.user_id == user.id,
        models.Milestone.achieved == True
    ).options(
        joinedload(models.Milestone.goal)
    ).order_by(models.Milestone.achieved_at.desc()).limit(5).all()
    
    goals_by_type = {}
    for goal in active_goals:
        goal_type_key = goal.goal_type or "unknown"  
        if goal_type_key not in goals_by_type:
            goals_by_type[goal_type_key] = 0
        goals_by_type[goal_type_key] += 1
    
    return {
        "active_goals_count": len(active_goals),
        "completed_goals_count": completed_goals,
        "average_progress": round(avg_progress, 1),
        "goals_by_type": goals_by_type,
        "active_goals": [
                {
                    "id": g.id,
                    "title": g.title or "Untitled Goal",
                    "goal_type": g.goal_type or "personal",  
                    "priority": g.priority or "medium",    
                    "progress": g.progress or 0.0,        
                    "target_date": g.target_date.strftime("%Y-%m-%d") if g.target_date else None,
                    "subgoals_completed": len([sg for sg in g.subgoals if sg.status == 'completed']),
                    "subgoals_total": len(g.subgoals or []),
                }
                for g in active_goals
            ],
            "recent_milestones": [
                {
                    "title": m.title or "Untitled Milestone",
                    "goal": m.goal.title if m.goal and m.goal.title else "Unknown Goal", # <-- Made safer
                    "achieved_at": m.achieved_at.strftime("%Y-%m-%d") if m.achieved_at else None,
                    "celebration": m.celebration_note or "",
                }
                for m in recent_milestones
            ],
        }

@app.get("/goals/{github_username}/{goal_id}", response_model=models.GoalResponse)
def get_goal_detail(
    github_username: str,
    goal_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get detailed view of a specific goal"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    goal = db.query(models.Goal).options(
        joinedload(models.Goal.subgoals).joinedload(models.SubGoal.tasks),
        joinedload(models.Goal.milestones)
    ).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return goal


@app.patch("/goals/{github_username}/{goal_id}")
def update_goal(
    github_username: str,
    goal_id: int,
    update: models.GoalUpdateRequest,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Update goal details"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Update fields
    if update.title:
        goal.title = update.title
    if update.description:
        goal.description = update.description
    if update.priority:
        goal.priority = update.priority
    if update.status:
        goal.status = update.status
        if update.status == 'completed' and not goal.completed_at:
            goal.completed_at = datetime.utcnow()
    if update.target_date:
        goal.target_date = update.target_date
    if update.success_criteria:
        goal.success_criteria = {"criteria": update.success_criteria}
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(goal, "success_criteria")
    
    goal.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(goal)
    
    return {"message": "Goal updated", "goal": goal}


@app.post("/goals/{github_username}/{goal_id}/progress")
def log_progress(
    github_username: str,
    goal_id: int,
    progress: models.GoalProgressCreate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Log progress update for a goal"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Create progress log
    progress_log = models.GoalProgress(
        goal_id=goal.id,
        progress=progress.progress,
        notes=progress.notes,
        mood=progress.mood,
        obstacles=progress.obstacles,
        wins=progress.wins
    )
    db.add(progress_log)
    
    # Update goal progress
    goal.progress = progress.progress
    goal.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(progress_log)
    
    # AI Feedback
    try:
        analysis = sage_crew.analyze_goal_progress(
            goal,
            {
                "progress": progress.progress,
                "notes": progress.notes,
                "obstacles": progress.obstacles,
                "wins": progress.wins,
                "mood": progress.mood
            },
            user.id,
            db
        )
        
        progress_log.ai_feedback = analysis["feedback"]
        db.commit()
        
        return {
            "message": "Progress logged",
            "progress_id": progress_log.id,
            "ai_feedback": analysis["feedback"],
            "progress_rate": analysis["progress_rate"],
            "needs_attention": analysis["needs_attention"]
        }
    except Exception as e:
        print(f"❌ Progress analysis failed: {str(e)}")
        return {
            "message": "Progress logged (AI analysis unavailable)",
            "progress_id": progress_log.id
        }


@app.get("/goals/{github_username}/{goal_id}/progress", response_model=List[models.GoalProgressResponse])
def get_progress_history(
    github_username: str,
    goal_id: int,
    limit: int = 20,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get progress history for a goal"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    progress_logs = db.query(models.GoalProgress).filter(
        models.GoalProgress.goal_id == goal.id
    ).order_by(models.GoalProgress.timestamp.desc()).limit(limit).all()
    
    return progress_logs


@app.post("/goals/{github_username}/{goal_id}/subgoals")
def create_subgoal(
    github_username: str,
    goal_id: int,
    subgoal: models.SubGoalCreate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Add a subgoal to a goal"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    new_subgoal = models.SubGoal(
        goal_id=goal.id,
        title=subgoal.title,
        description=subgoal.description,
        order=subgoal.order,
        target_date=subgoal.target_date
    )
    db.add(new_subgoal)
    db.commit()
    db.refresh(new_subgoal)
    
    # Create tasks if provided
    if subgoal.tasks:
        for task_data in subgoal.tasks:
            task = models.Task(
                subgoal_id=new_subgoal.id,
                title=task_data.title,
                description=task_data.description,
                priority=task_data.priority,
                estimated_hours=task_data.estimated_hours,
                due_date=task_data.due_date
            )
            db.add(task)
        db.commit()
    
    return {"message": "Subgoal created", "subgoal": new_subgoal}


@app.patch("/goals/{github_username}/{goal_id}/subgoals/{subgoal_id}")
def update_subgoal_status(
    github_username: str,
    goal_id: int,
    subgoal_id: int,
    status: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Update subgoal status"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subgoal = db.query(models.SubGoal).join(models.Goal).filter(
        models.SubGoal.id == subgoal_id,
        models.SubGoal.goal_id == goal_id,
        models.Goal.user_id == user.id
    ).first()
    
    if not subgoal:
        raise HTTPException(status_code=404, detail="Subgoal not found")
    
    subgoal.status = status
    if status == 'completed':
        subgoal.completed_at = datetime.utcnow()
        subgoal.progress = 100.0
    
    db.commit()
    
    # Update parent goal progress
    goal = subgoal.parent_goal
    total_subgoals = len(goal.subgoals)
    completed_subgoals = len([sg for sg in goal.subgoals if sg.status == 'completed'])
    goal.progress = (completed_subgoals / total_subgoals * 100) if total_subgoals > 0 else 0
    
    db.commit()
    
    return {"message": "Subgoal updated", "goal_progress": goal.progress}


@app.post("/goals/{github_username}/{goal_id}/milestones/{milestone_id}/achieve")
def achieve_milestone(
    github_username: str,
    goal_id: int,
    milestone_id: int,
    celebration_note: str = None,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Mark a milestone as achieved"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    milestone = db.query(models.Milestone).join(models.Goal).filter(
        models.Milestone.id == milestone_id,
        models.Milestone.goal_id == goal_id,
        models.Goal.user_id == user.id
    ).first()
    
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    milestone.achieved = True
    milestone.achieved_at = datetime.utcnow()
    milestone.celebration_note = celebration_note
    
    db.commit()
    
    return {
        "message": "🎉 Milestone achieved! Celebrate this win!",
        "milestone": milestone.title
    }


@app.get("/goals/{github_username}/weekly-review")
def get_weekly_review(
    github_username: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get weekly goals review with AI guidance"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        review = sage_crew.weekly_goals_review(user.id, db)
        return review
    except Exception as e:
        print(f"❌ Weekly review failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate review")


@app.patch("/goals/{github_username}/{goal_id}/tasks/{task_id}")
def update_task_status(
    github_username: str,
    goal_id: int,
    task_id: int,
    status: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Update a single task's status"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify the task belongs to a subgoal that belongs to a goal owned by this user
    task = db.query(models.Task).join(
        models.SubGoal, models.Task.subgoal_id == models.SubGoal.id
    ).join(
        models.Goal, models.SubGoal.goal_id == models.Goal.id
    ).filter(
        models.Task.id == task_id,
        models.Goal.id == goal_id,
        models.Goal.user_id == user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task status
    task.status = status
    if status == 'completed' and not task.completed_at:
        task.completed_at = datetime.utcnow()
    elif status != 'completed':
        task.completed_at = None
    
    db.commit()
    db.refresh(task)
    
    return {"message": "Task updated successfully", "task": task}

@app.get("/insights/{github_username}/weekly")
def get_weekly_insights(
    github_username: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get weekly insights and recommendations"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    engine = ProactiveInsightsEngine()
    insights = engine.analyze_weekly_patterns(user.id, db)
    report = engine.generate_weekly_report(user.id, db)
    
    return {
        "metrics": insights,
        "report": report,
        "generated_at": datetime.utcnow().isoformat()
    }

@app.get("/notifications/{github_username}", response_model=List[NotificationResponse])
def get_notifications(
    github_username: str,
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get notifications for a user"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = db.query(models.Notification).filter(
        models.Notification.user_id == user.id
    )
    
    if unread_only:
        query = query.filter(models.Notification.read == False)
    
    notifications = query.order_by(
        models.Notification.created_at.desc()
    ).limit(limit).all()
    
    # Convert to response format with metadata mapped from extra_data
    return [
        models.NotificationResponse.from_orm(n) for n in notifications
    ]


@app.get("/notifications/{github_username}/stats", response_model=NotificationStats)
def get_notification_stats(
    github_username: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get notification statistics"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Total notifications
    total = db.query(models.Notification).filter(
        models.Notification.user_id == user.id
    ).count()
    
    # Unread notifications
    unread = db.query(models.Notification).filter(
        models.Notification.user_id == user.id,
        models.Notification.read == False
    ).count()
    
    # By type
    all_notifications = db.query(models.Notification).filter(
        models.Notification.user_id == user.id
    ).all()
    
    by_type = {}
    for notif in all_notifications:
        by_type[notif.notification_type] = by_type.get(notif.notification_type, 0) + 1
    
    # Recent (last 24 hours)
    day_ago = datetime.utcnow() - timedelta(days=1)
    recent_count = db.query(models.Notification).filter(
        models.Notification.user_id == user.id,
        models.Notification.created_at >= day_ago
    ).count()
    
    return {
        "total": total,
        "unread": unread,
        "by_type": by_type,
        "recent_count": recent_count
    }


@app.patch("/notifications/{github_username}/{notification_id}/read")
def mark_notification_read(
    github_username: str,
    notification_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Mark a notification as read"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Notification marked as read"}


@app.post("/notifications/{github_username}/mark-all-read")
def mark_all_notifications_read(
    github_username: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Mark all notifications as read"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.query(models.Notification).filter(
        models.Notification.user_id == user.id,
        models.Notification.read == False
    ).update({
        "read": True,
        "read_at": datetime.utcnow()
    })
    
    db.commit()
    
    return {"message": "All notifications marked as read"}


@app.delete("/notifications/{github_username}/{notification_id}")
def delete_notification(
    github_username: str,
    notification_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Delete a notification"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"message": "Notification deleted"}


@app.post("/notifications/{github_username}/check")
def check_and_create_notifications(
    github_username: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Manually trigger notification checks (useful for testing or manual refresh)"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    NotificationService.run_all_checks(db, user.id)
    
    return {"message": "Notification checks completed"}

@app.get("/commitments/{github_username}/stats/comparison")
def get_stats_comparison(
    github_username: str,
    days: int = 7,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get current and previous period stats for comparison"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Current period
    current_start = datetime.now() - timedelta(days=days)
    current_checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= current_start,
        models.CheckIn.shipped != None
    ).all()
    
    # Previous period
    previous_start = datetime.now() - timedelta(days=days * 2)
    previous_end = current_start
    previous_checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= previous_start,
        models.CheckIn.timestamp < previous_end,
        models.CheckIn.shipped != None
    ).all()
    
    def calculate_stats(checkins):
        if not checkins:
            return {"success_rate": 0, "avg_energy": 0, "total": 0}
        
        shipped = sum(1 for c in checkins if c.shipped)
        return {
            "success_rate": (shipped / len(checkins) * 100) if checkins else 0,
            "avg_energy": sum(c.energy_level for c in checkins) / len(checkins) if checkins else 0,
            "total": len(checkins)
        }
    
    return {
        "current": calculate_stats(current_checkins),
        "previous": calculate_stats(previous_checkins),
        "period_days": days
    }

# ==================== ACTION PLANS ====================

@app.post("/action-plans/{github_username}", response_model=ActionPlanResponse)
async def create_action_plan(
    github_username: str,
    plan: ActionPlanCreate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Create a new 30-day action plan with AI"""
    user = system_db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user context for AI
    github_analysis = db.query(models.GitHubAnalysis).filter(
        models.GitHubAnalysis.user_id == user.id
    ).order_by(models.GitHubAnalysis.analyzed_at.desc()).first()
    
    recent_checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.shipped != None
    ).order_by(models.CheckIn.timestamp.desc()).limit(30).all()
    
    user_context = {
        'github_stats': {
            'total_repos': github_analysis.total_repos if github_analysis else 0,
            'active_repos': github_analysis.active_repos if github_analysis else 0,
            'languages': github_analysis.languages if github_analysis else {}
        },
        'recent_performance': {
            'success_rate': (sum(1 for c in recent_checkins if c.shipped) / len(recent_checkins) * 100) if recent_checkins else 0,
            'avg_energy': sum(c.energy_level for c in recent_checkins) / len(recent_checkins) if recent_checkins else 0
        }
    }
    
    print(f"🚀 Generating 30-day plan for {plan.focus_area}...")
    
    # Generate plan with AI
    try:
        ai_result = action_plan_service.generate_30_day_plan(
            user_context=user_context,
            focus_area=plan.focus_area,
            skills_to_learn=plan.skills_to_learn,
            skill_level=plan.current_skill_level,
            hours_per_day=plan.available_hours_per_day
        )
        
        # Create action plan
        end_date = plan.end_date or (datetime.utcnow() + timedelta(days=30))
        new_plan = models.ActionPlan(
            user_id=user.id,
            title=plan.title,
            description=plan.description,
            plan_type=plan.plan_type,
            focus_area=plan.focus_area,
            end_date=end_date,
            ai_analysis=ai_result['analysis'],
            skills_to_focus={"skills": ai_result['skills_to_focus']},
            milestones=ai_result['milestones']
        )
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)
        
        # Create daily tasks
        for task_data in ai_result['daily_tasks']:
            task = models.DailyTask(
                action_plan_id=new_plan.id,
                day_number=task_data['day_number'],
                date=new_plan.start_date + timedelta(days=task_data['day_number'] - 1),
                title=task_data['title'],
                description=task_data['description'],
                task_type=task_data['task_type'],
                difficulty=task_data['difficulty'],
                estimated_time=task_data['estimated_time']
            )
            db.add(task)
        
        db.commit()
        db.refresh(new_plan)
        
        print(f"✅ Action plan created with {len(ai_result['daily_tasks'])} daily tasks")
        
        return new_plan
        
    except Exception as e:
        print(f"❌ Plan generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate plan: {str(e)}")


@app.get("/action-plans/{github_username}", response_model=List[ActionPlanResponse])
def get_action_plans(
    github_username: str,
    status: str = None,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get all action plans for user"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = db.query(models.ActionPlan).filter(models.ActionPlan.user_id == user.id)
    
    if status:
        query = query.filter(models.ActionPlan.status == status)
    
    query = query.options(
        joinedload(models.ActionPlan.daily_tasks)
    )
    
    plans = query.order_by(models.ActionPlan.start_date.desc()).all()
    return plans


@app.get("/action-plans/{github_username}/{plan_id}", response_model=ActionPlanResponse)
def get_action_plan_detail(
    github_username: str,
    plan_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get detailed action plan"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    plan = db.query(models.ActionPlan).options(
        joinedload(models.ActionPlan.daily_tasks)
    ).filter(
        models.ActionPlan.id == plan_id,
        models.ActionPlan.user_id == user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Action plan not found")
    
    return plan


@app.get("/action-plans/{github_username}/{plan_id}/today")
def get_today_tasks(
    github_username: str,
    plan_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get today's tasks from action plan"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    plan = db.query(models.ActionPlan).filter(
        models.ActionPlan.id == plan_id,
        models.ActionPlan.user_id == user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Action plan not found")
    
    # Get today's tasks
    today_tasks = db.query(models.DailyTask).filter(
        models.DailyTask.action_plan_id == plan_id,
        models.DailyTask.day_number == plan.current_day
    ).all()
    
    return {
        'plan_id': plan_id,
        'day_number': plan.current_day,
        'focus_area': plan.focus_area,
        'tasks': today_tasks,
        'skills_to_focus': plan.skills_to_focus.get('skills', []) if plan.skills_to_focus else []
    }


@app.post("/action-plans/{github_username}/{plan_id}/tasks/{task_id}/complete")
def complete_daily_task(
    github_username: str,
    plan_id: int,
    task_id: int,
    update: DailyTaskUpdate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Mark task as complete and get AI feedback"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    task = db.query(models.DailyTask).filter(
        models.DailyTask.id == task_id,
        models.DailyTask.action_plan_id == plan_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task
    task.status = update.status or 'completed'
    task.actual_time_spent = update.actual_time_spent
    task.difficulty_rating = update.difficulty_rating
    task.notes = update.notes
    task.completed_at = datetime.utcnow()
    
    # Get AI feedback
    try:
        feedback = action_plan_service.evaluate_task_completion(
            task={'title': task.title, 'estimated_time': task.estimated_time},
            user_feedback={
                'notes': update.notes,
                'actual_time': update.actual_time_spent,
                'difficulty_rating': update.difficulty_rating
            }
        )
        
        task.ai_feedback = feedback['feedback']
        
        db.commit()
        db.refresh(task)
        
        return {
            'message': 'Task completed',
            'feedback': feedback['feedback'],
            'difficulty_adjustment': feedback['difficulty_adjustment']
        }
    except Exception as e:
        db.commit()
        return {
            'message': 'Task completed (AI feedback unavailable)',
            'error': str(e)
        }


@app.post("/action-plans/{github_username}/{plan_id}/advance-day")
def advance_to_next_day(
    github_username: str,
    plan_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Move to next day in plan"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    plan = db.query(models.ActionPlan).filter(
        models.ActionPlan.id == plan_id,
        models.ActionPlan.user_id == user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Action plan not found")
    
    # Check if current day tasks are completed
    current_tasks = db.query(models.DailyTask).filter(
        models.DailyTask.action_plan_id == plan_id,
        models.DailyTask.day_number == plan.current_day
    ).all()
    
    incomplete = [t for t in current_tasks if t.status != 'completed']
    
    if incomplete and plan.current_day < 30:
        return {
            'warning': f'{len(incomplete)} tasks incomplete',
            'incomplete_tasks': [t.title for t in incomplete],
            'can_advance': True
        }
    
    # Advance day
    plan.current_day += 1
    
    # Update completion percentage
    total_tasks = db.query(models.DailyTask).filter(
        models.DailyTask.action_plan_id == plan_id
    ).count()
    
    completed_tasks = db.query(models.DailyTask).filter(
        models.DailyTask.action_plan_id == plan_id,
        models.DailyTask.status == 'completed'
    ).count()
    
    plan.completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Mark as completed if reached day 30
    if plan.current_day > 30:
        plan.status = 'completed'
        plan.completed_at = datetime.utcnow()
    
    db.commit()
    
    return {
        'message': 'Advanced to next day',
        'current_day': plan.current_day,
        'completion_percentage': plan.completion_percentage,
        'plan_completed': plan.status == 'completed'
    }


# ==================== SKILL FOCUS & REMINDERS ====================

@app.post("/skill-focus/{github_username}")
def log_skill_focus(
    github_username: str,
    focus: SkillFocusCreate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Log time spent on a skill"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find active action plan
    active_plan = db.query(models.ActionPlan).filter(
        models.ActionPlan.user_id == user.id,
        models.ActionPlan.status == 'active'
    ).first()
    
    log = models.SkillFocusLog(
        user_id=user.id,
        action_plan_id=active_plan.id if active_plan else None,
        skill_name=focus.skill_name,
        time_spent=focus.time_spent,
        activities={"activities": focus.activities},
        progress_note=focus.progress_note,
        confidence_level=focus.confidence_level
    )
    
    db.add(log)
    db.commit()
    
    return {"message": "Skill focus logged", "log_id": log.id}


@app.get("/skill-focus/{github_username}/summary")
def get_skill_focus_summary(
    github_username: str,
    days: int = 7,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get summary of skill focus time"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    since = datetime.utcnow() - timedelta(days=days)
    
    logs = db.query(models.SkillFocusLog).filter(
        models.SkillFocusLog.user_id == user.id,
        models.SkillFocusLog.focus_date >= since
    ).all()
    
    # Aggregate by skill
    skill_summary = {}
    for log in logs:
        if log.skill_name not in skill_summary:
            skill_summary[log.skill_name] = {
                'total_time': 0,
                'sessions': 0,
                'avg_confidence': []
            }
        skill_summary[log.skill_name]['total_time'] += log.time_spent
        skill_summary[log.skill_name]['sessions'] += 1
        skill_summary[log.skill_name]['avg_confidence'].append(log.confidence_level)
    
    # Calculate averages
    for skill in skill_summary:
        confidences = skill_summary[skill]['avg_confidence']
        skill_summary[skill]['avg_confidence'] = sum(confidences) / len(confidences) if confidences else 0
    
    return {
        'period_days': days,
        'skills': skill_summary,
        'total_time': sum(s['total_time'] for s in skill_summary.values()),
        'total_sessions': len(logs)
    }


@app.post("/skill-reminders/{github_username}", response_model=SkillReminderResponse)
def create_skill_reminder(
    github_username: str,
    reminder: SkillReminderCreate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Create a skill focus reminder"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate next reminder date
    if reminder.frequency == 'daily':
        next_date = datetime.utcnow() + timedelta(days=1)
    elif reminder.frequency == 'weekly':
        next_date = datetime.utcnow() + timedelta(weeks=1)
    else:
        next_date = datetime.utcnow() + timedelta(days=1)
    
    new_reminder = models.SkillReminder(
        user_id=user.id,
        skill_name=reminder.skill_name,
        reminder_message=reminder.reminder_message,
        priority=reminder.priority,
        frequency=reminder.frequency,
        next_reminder_date=next_date
    )
    
    db.add(new_reminder)
    db.commit()
    db.refresh(new_reminder)
    
    return new_reminder


@app.get("/skill-reminders/{github_username}", response_model=List[SkillReminderResponse])
def get_skill_reminders(
    github_username: str,
    active_only: bool = True,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get all skill reminders"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = db.query(models.SkillReminder).filter(
        models.SkillReminder.user_id == user.id
    )
    
    if active_only:
        query = query.filter(models.SkillReminder.is_active == True)
    
    reminders = query.order_by(models.SkillReminder.next_reminder_date).all()
    return reminders

@app.post("/pomodoro/{github_username}/start")
def start_pomodoro_session(
    github_username: str,
    session: models.PomodoroSessionCreate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Start a new Pomodoro session"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if there's an active session
    active_session = db.query(models.PomodoroSession).filter(
        models.PomodoroSession.user_id == user.id,
        models.PomodoroSession.completed == False,
        models.PomodoroSession.paused_at == None
    ).first()
    
    if active_session:
        return {
            "message": "Active session already exists",
            "session": active_session
        }
    
    new_session = models.PomodoroSession(
        user_id=user.id,
        checkin_id=session.checkin_id,
        session_type=session.session_type,
        duration_minutes=session.duration_minutes,
        commitment_description=session.commitment_description
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return {
        "message": "Pomodoro session started",
        "session": new_session
    }


@app.get("/pomodoro/{github_username}/active")
def get_active_session(
    github_username: str,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get current active Pomodoro session"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    active_session = db.query(models.PomodoroSession).filter(
        models.PomodoroSession.user_id == user.id,
        models.PomodoroSession.completed == False
    ).order_by(models.PomodoroSession.started_at.desc()).first()
    
    if not active_session:
        return {"has_active_session": False}
    
    return {
        "has_active_session": True,
        "session": active_session
    }


@app.patch("/pomodoro/{github_username}/{session_id}/complete")
def complete_pomodoro_session(
    github_username: str,
    session_id: int,
    update: models.PomodoroSessionUpdate,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Complete a Pomodoro session"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session = db.query(models.PomodoroSession).filter(
        models.PomodoroSession.id == session_id,
        models.PomodoroSession.user_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.completed = update.completed if update.completed is not None else True
    session.completed_at = datetime.utcnow()
    session.notes = update.notes
    session.focus_rating = update.focus_rating
    session.interruptions = update.interruptions if update.interruptions is not None else session.interruptions
    
    db.commit()
    db.refresh(session)
    
    return {
        "message": "Session completed",
        "session": session
    }


@app.patch("/pomodoro/{github_username}/{session_id}/pause")
def pause_pomodoro_session(
    github_username: str,
    session_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Pause a Pomodoro session"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session = db.query(models.PomodoroSession).filter(
        models.PomodoroSession.id == session_id,
        models.PomodoroSession.user_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.paused_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Session paused"}


@app.patch("/pomodoro/{github_username}/{session_id}/resume")
def resume_pomodoro_session(
    github_username: str,
    session_id: int,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Resume a paused Pomodoro session"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session = db.query(models.PomodoroSession).filter(
        models.PomodoroSession.id == session_id,
        models.PomodoroSession.user_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.paused_at = None
    db.commit()
    
    return {"message": "Session resumed"}


@app.get("/pomodoro/{github_username}/stats", response_model=models.PomodoroStatsResponse)
def get_pomodoro_stats(
    github_username: str,
    days: int = 30,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get Pomodoro statistics"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    since = datetime.utcnow() - timedelta(days=days)
    
    sessions = db.query(models.PomodoroSession).filter(
        models.PomodoroSession.user_id == user.id,
        models.PomodoroSession.started_at >= since
    ).all()
    
    completed_sessions = [s for s in sessions if s.completed]
    work_sessions = [s for s in completed_sessions if s.session_type == 'work']
    
    # Today's sessions
    today_start = datetime.combine(datetime.now().date(), datetime.min.time())
    sessions_today = db.query(models.PomodoroSession).filter(
        models.PomodoroSession.user_id == user.id,
        models.PomodoroSession.started_at >= today_start
    ).count()
    
    # Calculate streaks
    current_streak, best_streak = calculate_pomodoro_streaks(user.id, db)
    
    # Average focus rating
    rated_sessions = [s for s in completed_sessions if s.focus_rating]
    avg_focus = sum(s.focus_rating for s in rated_sessions) / len(rated_sessions) if rated_sessions else 0
    
    return {
        "total_sessions": len(sessions),
        "completed_sessions": len(completed_sessions),
        "total_work_minutes": sum(s.duration_minutes for s in work_sessions),
        "avg_focus_rating": round(avg_focus, 2),
        "completion_rate": round(len(completed_sessions) / len(sessions) * 100, 1) if sessions else 0,
        "sessions_today": sessions_today,
        "current_streak": current_streak,
        "best_streak": best_streak
    }


@app.get("/pomodoro/{github_username}/history")
def get_pomodoro_history(
    github_username: str,
    limit: int = 50,
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get Pomodoro session history"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    sessions = db.query(models.PomodoroSession).filter(
        models.PomodoroSession.user_id == user.id
    ).order_by(models.PomodoroSession.started_at.desc()).limit(limit).all()
    
    return {"sessions": sessions}


def calculate_pomodoro_streaks(user_id: int, db: Session) -> tuple:
    """Calculate current and best Pomodoro streaks"""
    # Get all days with completed sessions
    sessions = db.query(models.PomodoroSession).filter(
        models.PomodoroSession.user_id == user_id,
        models.PomodoroSession.completed == True
    ).order_by(models.PomodoroSession.started_at.desc()).all()
    
    if not sessions:
        return 0, 0
    
    # Group by date
    dates = set()
    for session in sessions:
        dates.add(session.started_at.date())
    
    sorted_dates = sorted(dates, reverse=True)
    
    # Calculate current streak
    current_streak = 0
    today = datetime.now().date()
    check_date = today
    
    for date in sorted_dates:
        if date == check_date or (check_date - date).days == 1:
            current_streak += 1
            check_date = date
        else:
            break
    
    # Calculate best streak
    best_streak = 0
    temp_streak = 1
    
    for i in range(len(sorted_dates) - 1):
        if (sorted_dates[i] - sorted_dates[i + 1]).days == 1:
            temp_streak += 1
            best_streak = max(best_streak, temp_streak)
        else:
            temp_streak = 1
    
    best_streak = max(best_streak, temp_streak, current_streak)
    
    return current_streak, best_streak

@app.get("/commitments/{github_username}/streak-detailed")
def get_detailed_streak(
    github_username: str, 
    db: Session = Depends(get_user_db),
    system_db: Session = Depends(get_system_db)
):
    """Get detailed streak information based on daily check-ins"""
    user = db.query(models.User).filter(
        models.User.github_username == github_username
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get ALL check-ins from last year ordered by date
    checkins = db.query(models.CheckIn).filter(
        models.CheckIn.user_id == user.id,
        models.CheckIn.timestamp >= datetime.now() - timedelta(days=365)
    ).order_by(models.CheckIn.timestamp.desc()).all()
    
    # Group by date (not timestamp) to handle multiple check-ins per day
    checkin_dates = set()
    for checkin in checkins:
        checkin_dates.add(checkin.timestamp.date())
    
    # Calculate current streak
    current_streak = 0
    check_date = datetime.now().date()
    
    while check_date in checkin_dates:
        current_streak += 1
        check_date -= timedelta(days=1)
    
    # Calculate best streak
    sorted_dates = sorted(checkin_dates, reverse=True)
    best_streak = 0
    temp_streak = 1
    
    for i in range(len(sorted_dates) - 1):
        if (sorted_dates[i] - sorted_dates[i + 1]).days == 1:
            temp_streak += 1
            best_streak = max(best_streak, temp_streak)
        else:
            temp_streak = 1
    
    best_streak = max(best_streak, current_streak)
    
    # Check if streak is at risk (no check-in today)
    today = datetime.now().date()
    has_checked_in_today = today in checkin_dates
    
    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "has_checked_in_today": has_checked_in_today,
        "at_risk": not has_checked_in_today and current_streak > 0,
        "total_days_active": len(checkin_dates),
        "last_checkin_date": sorted_dates[0].isoformat() if sorted_dates else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)