from fastapi import APIRouter, Depends, HTTPException, Header, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_user_db, get_system_db
from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime, timedelta
import models
from services import sage_crew

router = APIRouter()

class ProblemCreate(BaseModel):
    title: str
    difficulty: str
    pattern: str
    link: str
    mastery_level: int # 1-5
    notes: Optional[str] = None

class CodeReviewRequest(BaseModel):
    code: str
    language: str
    problem_title: str
    problem_description: Optional[str] = None

@router.post("/leetcode/log")
async def log_problem(
    problem: ProblemCreate,
    db: AsyncSession = Depends(get_user_db)
):
    # Calculate next review based on mastery (Simple SRS)
    # Level 1: 1 day, Level 2: 3 days, Level 3: 7 days, Level 4: 14 days, Level 5: 30 days
    intervals = {1: 1, 2: 3, 3: 7, 4: 14, 5: 30}
    next_review = datetime.utcnow() + timedelta(days=intervals.get(problem.mastery_level, 1))
    
    new_problem = models.LeetCodeProblem(
        title=problem.title,
        difficulty=problem.difficulty,
        pattern=problem.pattern,
        link=problem.link,
        mastery_level=problem.mastery_level,
        last_reviewed=datetime.utcnow(),
        next_review=next_review,
        notes=problem.notes
    )
    
    db.add(new_problem)
    await db.commit()
    await db.refresh(new_problem)
    
    # Log initial attempt
    log = models.RepetitionLog(
        problem_id=new_problem.id,
        quality_rating=problem.mastery_level
    )
    db.add(log)
    await db.commit()
    
    return new_problem

@router.get("/leetcode/due")
async def get_due_problems(
    db: AsyncSession = Depends(get_user_db)
):
    now = datetime.utcnow()
    result = await db.execute(select(models.LeetCodeProblem).filter(
        models.LeetCodeProblem.next_review <= now
    ).order_by(models.LeetCodeProblem.next_review))
    
    return result.scalars().all()

@router.post("/leetcode/review")
async def review_code(
    request: CodeReviewRequest,
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    try:
        review = await sage_crew.review_code(
            request.code,
            request.language,
            request.problem_title,
            request.problem_description,
            api_key=x_groq_key
        )
        return review
    except Exception as e:
        print(f"Error reviewing code: {e}")
        raise HTTPException(status_code=500, detail=f"Code review failed: {str(e)}")

@router.post("/leetcode/{problem_id}/review-log")
async def log_review(
    problem_id: int,
    quality_rating: int = Body(..., embed=True),
    db: AsyncSession = Depends(get_user_db)
):
    result = await db.execute(select(models.LeetCodeProblem).filter(models.LeetCodeProblem.id == problem_id))
    problem = result.scalars().first()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Update SRS
    intervals = {0: 0, 1: 1, 2: 3, 3: 7, 4: 14, 5: 30}
    
    # If rating is 0 or 1, reset mastery or reduce it
    if quality_rating <= 1:
        problem.mastery_level = max(1, problem.mastery_level - 1)
    else:
        problem.mastery_level = min(5, problem.mastery_level + 1)
        
    problem.last_reviewed = datetime.utcnow()
    problem.next_review = datetime.utcnow() + timedelta(days=intervals.get(problem.mastery_level, 1))
    
    # Add log
    log = models.RepetitionLog(
        problem_id=problem.id,
        quality_rating=quality_rating
    )
    db.add(log)
    await db.commit()
    
    return {"message": "Review logged", "next_review": problem.next_review}

@router.delete("/leetcode/{problem_id}")
async def delete_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_user_db)
):
    result = await db.execute(select(models.LeetCodeProblem).filter(models.LeetCodeProblem.id == problem_id))
    problem = result.scalars().first()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
        
    await db.delete(problem)
    await db.commit()
    
    return {"message": "Problem deleted successfully"}
