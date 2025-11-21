from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from datetime import datetime
import os
import re
import models
from models import DatabaseConfig
from database import get_system_db, system_engine

router = APIRouter()

@router.get("/health")
async def health_check():
    try:
        # For health check, we can use the async engine directly or a session
        # Using engine connect is fine but needs to be async
        async with system_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "system_db": "connected", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e), "timestamp": datetime.utcnow().isoformat()}

@router.post("/config/database")
async def update_database_config(config: DatabaseConfig):
    """Update the database URL in .env file"""
    
    if not config.database_url.startswith("postgresql://") and not config.database_url.startswith("postgres://"):
        raise HTTPException(status_code=400, detail="Invalid database URL. Must start with postgresql://")
    
    # Go up one level from routers to backend
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    try:
        content = ""
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                content = f.read()
        
        if "DATABASE_URL=" in content:
            content = re.sub(r"DATABASE_URL=.*", f"DATABASE_URL={config.database_url}", content)
        else:
            content += f"\nDATABASE_URL={config.database_url}\n"
            
        with open(env_path, "w") as f:
            f.write(content)
        return {"message": "Database configuration updated. Please restart the backend."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")

@router.patch("/users/{github_username}/config")
async def update_user_config(
    github_username: str,
    config: DatabaseConfig,
    db: AsyncSession = Depends(get_system_db)
):
    """Update user's Neon Database URL"""
    result = await db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not config.database_url.startswith("postgresql://") and not config.database_url.startswith("postgres://"):
        raise HTTPException(status_code=400, detail="Invalid database URL. Must start with postgresql://")
    
    user.neon_db_url = config.database_url
    await db.commit()
    await db.refresh(user)
    return {"message": "Database configuration updated successfully"}
