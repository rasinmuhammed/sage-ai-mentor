from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_system_db, init_user_db
import models
from models import UserCreate, UserResponse, DatabaseConfig
from services import email_service

router = APIRouter()

@router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_system_db)):
    """
    Create or update user - idempotent operation
    """
    result = await db.execute(select(models.User).filter(models.User.github_username == user.github_username))
    db_user = result.scalars().first()
    
    if db_user:
        if user.email and db_user.email != user.email:
            db_user.email = user.email
            await db.commit()
            await db.refresh(db_user)
        return db_user
    
    new_user = models.User(
        github_username=user.github_username,
        email=user.email,
        onboarding_complete=False
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    print(f"✅ Created new user: {user.github_username}")
    
    if user.email:
        # Fire and forget welcome email
        try:
            await email_service.send_welcome_email(user.email, user.github_username)
        except Exception as e:
            print(f"⚠️ Failed to send welcome email: {e}")
            
    return new_user

@router.get("/users/{github_username}", response_model=UserResponse)
async def get_user(github_username: str, db: AsyncSession = Depends(get_system_db)):
    result = await db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=404, 
            detail=f"User '{github_username}' not found. Please complete onboarding first."
        )
    
    return user

@router.post("/users/{github_username}/setup-database")
async def setup_user_database(
    github_username: str,
    setup: DatabaseConfig,
    db: AsyncSession = Depends(get_system_db)
):
    """
    Set up user's Neon database URL during onboarding.
    This must be called before analyze-github.
    """
    result = await db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate URL
    if not setup.database_url.startswith("postgresql://") and \
       not setup.database_url.startswith("postgres://"):
        raise HTTPException(
            status_code=400, 
            detail="Invalid database URL. Must be a PostgreSQL connection string."
        )
    
    # Fix URL format
    db_url = setup.database_url.replace("postgres://", "postgresql://")
    
    # Test connection and initialize tables
    try:
        await init_user_db(db_url)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to connect to database: {str(e)}"
        )
    
    user.neon_db_url = db_url
    await db.commit()
    
    return {"message": "Database configured successfully"}

@router.post("/onboarding/submit")
async def submit_onboarding(
    data: dict,
    db: AsyncSession = Depends(get_system_db)
):
    # Extract username
    github_username = data.get("github_username")
    if not github_username:
        raise HTTPException(status_code=400, detail="Missing github_username")
        
    result = await db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Mark as complete
    user.onboarding_complete = True
    user.onboarding_data = data
    await db.commit()
    
    return {"message": "Onboarding completed"}

@router.get("/onboarding/status/{github_username}")
async def get_onboarding_status(
    github_username: str,
    db: AsyncSession = Depends(get_system_db)
):
    result = await db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    
    if not user:
        return {"complete": False, "step": "welcome"}
        
    return {
        "complete": user.onboarding_complete,
        "has_db": bool(user.neon_db_url)
    }
