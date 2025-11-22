from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict
from datetime import datetime
import models
from models import LifeDecisionResponse, LifeDecisionCreate, ChatMessage, AgentAdviceResponse
from database import get_user_db, get_system_db
from services import sage_crew
from ai_insights import ProactiveInsightsEngine

router = APIRouter()

@router.get("/insights/{github_username}/weekly")
async def get_weekly_insights(
    github_username: str, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    engine = ProactiveInsightsEngine()
    insights = await engine.analyze_weekly_patterns(user.id, db)
    report = await engine.generate_weekly_report(user.id, db)
    return {"metrics": insights, "report": report, "generated_at": datetime.utcnow().isoformat()}

@router.get("/advice/{github_username}", response_model=List[AgentAdviceResponse])
async def get_agent_advice_history(
    github_username: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    result = await db.execute(select(models.AgentAdvice).filter(
        models.AgentAdvice.user_id == user.id
    ).order_by(models.AgentAdvice.created_at.desc()).limit(limit))
    advice_history = result.scalars().all()
    
    return advice_history

@router.post("/chat/{github_username}")
async def chat_with_mentor(
    github_username: str,
    message: ChatMessage,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.GitHubAnalysis).filter(
        models.GitHubAnalysis.user_id == user.id
    ).order_by(models.GitHubAnalysis.analyzed_at.desc()))
    github_analysis = result.scalars().first()
    
    result = await db.execute(select(models.CheckIn).filter(
        models.CheckIn.user_id == user.id
    ).order_by(models.CheckIn.timestamp.desc()).limit(7))
    recent_checkins = result.scalars().all()
    
    result = await db.execute(select(models.LifeEvent).filter(
        models.LifeEvent.user_id == user.id
    ).order_by(models.LifeEvent.timestamp.desc()).limit(10))
    life_events = result.scalars().all()
    
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
    
    async def event_generator():
        async for event in sage_crew.stream_chat_deliberation(
            message.message,
            user_context,
            message.context,
            api_key=x_groq_key
        ):
            if event:
                yield f"data: {json.dumps(event)}\n\n"
                
                # If this is the final response, save it to DB
                if event["type"] == "final":
                    try:
                        final_data = event["data"]
                        # Reconstruct debate from what we might have tracked or just save the final response
                        # Since we're streaming, we might not have the full debate structure easily available 
                        # unless we tracked it in the generator. 
                        # For now, we'll save what we have.
                        
                        advice = models.AgentAdvice(
                            user_id=user.id,
                            agent_name="Multi-Agent Chat",
                            advice=final_data["final_response"],
                            evidence={
                                "user_message": message.message, 
                                "key_insights": final_data["key_insights"],
                                "actions": final_data["actions"]
                            },
                            interaction_type="chat"
                        )
                        db.add(advice)
                        await db.commit()
                    except Exception as e:
                        print(f"Error saving advice: {e}")

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/life-decisions/{github_username}", response_model=LifeDecisionResponse)
async def create_life_decision(
    github_username: str,
    decision: LifeDecisionCreate,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
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
    await db.commit()
    await db.refresh(life_event)
    
    try:
        analysis = await sage_crew.analyze_life_decision(
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
        
        life_event.context["ai_analysis"] = analysis["analysis"]
        life_event.context["lessons"] = analysis["lessons"]
        life_event.outcome = analysis["long_term_impact"]
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(life_event, "context")
        
        await db.commit()
        await db.refresh(life_event)
        
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

@router.post("/life-decisions/{github_username}/{decision_id}/reanalyze")
async def reanalyze_life_decision(
    github_username: str,
    decision_id: int,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.LifeEvent).filter(
        models.LifeEvent.id == decision_id,
        models.LifeEvent.user_id == user.id
    ))
    life_event = result.scalars().first()
    if not life_event:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    context = life_event.context if isinstance(life_event.context, dict) else {}
    
    try:
        analysis = await sage_crew.analyze_life_decision(
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
        
        life_event.context["ai_analysis"] = analysis["analysis"]
        life_event.context["lessons"] = analysis["lessons"]
        life_event.outcome = analysis["long_term_impact"]
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(life_event, "context")
        
        await db.commit()
        await db.refresh(life_event)
        
        return {
            "message": "Re-analysis complete",
            "ai_analysis": analysis["analysis"],
            "lessons_learned": analysis["lessons"],
            "long_term_impact": analysis["long_term_impact"]
        }
    except Exception as e:
        print(f"❌ Re-analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Re-analysis failed: {str(e)}")

@router.get("/life-decisions/{github_username}", response_model=List[LifeDecisionResponse])
async def get_life_decisions(
    github_username: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.LifeEvent).filter(
        models.LifeEvent.user_id == user.id
    ).order_by(models.LifeEvent.timestamp.desc()).limit(limit))
    events = result.scalars().all()
    
    results = []
    for e in events:
        context = e.context if isinstance(e.context, dict) else {}
        results.append({
            "id": e.id,
            "title": e.description,
            "description": context.get("full_description", e.description),
            "decision_type": e.event_type,
            "impact_areas": context.get("impact_areas", []),
            "timestamp": e.timestamp,
            "time_horizon": e.time_horizon,
            "ai_analysis": context.get("ai_analysis"),
            "lessons_learned": context.get("lessons", [])
        })
    return results

@router.get("/life-decisions/{github_username}/{decision_id}", response_model=LifeDecisionResponse)
async def get_life_decision_detail(
    github_username: str,
    decision_id: int,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.execute(select(models.LifeEvent).filter(
        models.LifeEvent.id == decision_id,
        models.LifeEvent.user_id == user.id
    ))
    event = result.scalars().first()
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

@router.post("/life-decisions/{github_username}/{decision_id}/evaluate")
async def evaluate_decision(
    github_username: str,
    decision_id: int,
    evaluation: Dict,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db),
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    result = await db.execute(select(models.LifeEvent).filter(models.LifeEvent.id == decision_id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    result = await system_db.execute(select(models.User).filter(models.User.id == event.user_id))
    user = result.scalars().first()
    
    re_evaluation = await sage_crew.reevaluate_decision(
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
    await db.commit()
    
    return {
        "message": "Decision re-evaluated",
        "analysis": re_evaluation["analysis"],
        "new_lessons": re_evaluation["new_lessons"],
        "how_it_aged": re_evaluation["how_it_aged"]
    }

@router.delete("/life-decisions/{github_username}/{decision_id}")
async def delete_life_decision(
    github_username: str,
    decision_id: int,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(models.LifeEvent).filter(models.LifeEvent.id == decision_id, models.LifeEvent.user_id == user.id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Decision not found")

    await db.delete(event)
    await db.commit()
    return {"message": "Life decision deleted successfully"}

@router.put("/life-decisions/{github_username}/{decision_id}", response_model=LifeDecisionResponse)
async def update_life_decision(
    github_username: str,
    decision_id: int,
    decision: LifeDecisionCreate,
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(models.LifeEvent).filter(models.LifeEvent.id == decision_id, models.LifeEvent.user_id == user.id))
    event = result.scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Decision not found")

    event.description = decision.title
    event.event_type = decision.decision_type
    event.time_horizon = decision.time_horizon
    
    # Update context
    context = event.context if isinstance(event.context, dict) else {}
    context["full_description"] = decision.description
    context["impact_areas"] = decision.impact_areas
    if decision.context:
        context.update(decision.context)
        
    event.context = context
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(event, "context")

    await db.commit()
    await db.refresh(event)
    
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

@router.get("/debug/life-decisions/{github_username}")
async def debug_life_decisions(
    github_username: str, 
    db: AsyncSession = Depends(get_user_db),
    system_db: AsyncSession = Depends(get_system_db)
):
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        return {"error": "User not found"}
    
    # Need to fetch life_events explicitly or use selectinload if relationship is defined
    # Assuming user.life_events is a relationship, we need to load it or query it
    # Let's query it directly
    result = await db.execute(select(models.LifeEvent).filter(models.LifeEvent.user_id == user.id))
    life_events = result.scalars().all()
    
    return {
        "life_decisions": [
            {
                "id": e.id,
                "description": e.description,
                "context": e.context
            }
            for e in life_events
        ]
    }
