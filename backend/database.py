from sqlalchemy import event, text, Engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, AsyncEngine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import AsyncAdaptedQueuePool
from fastapi import Depends, HTTPException
import os
from dotenv import load_dotenv

load_dotenv()

# --- Configuration Helpers ---
def fix_db_url(url: str) -> str:
    """Ensure URL is compatible with SQLAlchemy Async (postgres -> postgresql+asyncpg)"""
    if url:
        # Replace postgres:// or postgresql:// with postgresql+asyncpg://
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

# --- System Database (Internal) ---
# For SQLite, we use aiosqlite driver
SYSTEM_DATABASE_URL = os.getenv("SYSTEM_DATABASE_URL", "sqlite+aiosqlite:///./sage.db")

if not SYSTEM_DATABASE_URL.startswith("sqlite"):
     # Fallback logic if needed, but for now assuming sqlite+aiosqlite
     pass

system_engine = create_async_engine(
    SYSTEM_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SYSTEM_DATABASE_URL else {}
)
SystemSessionLocal = sessionmaker(
    bind=system_engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False, 
    autoflush=False
)
SystemBase = declarative_base()

async def get_system_db():
    async with SystemSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()

async def init_system_db():
    async with system_engine.begin() as conn:
        await conn.run_sync(SystemBase.metadata.create_all)
    print("✓ System database initialized (Async)")

# --- User Database (Neon/Postgres) ---
UserBase = declarative_base()

# Engine cache to prevent creating new pools for every request
_engine_cache = {}

def get_user_db_engine(database_url: str) -> AsyncEngine:
    """Create or retrieve a dynamic async engine for the user's database"""
    if not database_url:
        raise ValueError("Database URL is required")
    
    clean_url = fix_db_url(database_url)
    
    # Return cached engine if available
    if clean_url in _engine_cache:
        return _engine_cache[clean_url]
    
    # Fix for asyncpg: remove sslmode and channel_binding from URL and pass ssl='require' in connect_args
    # asyncpg does not support 'sslmode' or 'channel_binding' in the connection string/kwargs
    if "?" in clean_url:
        base, query = clean_url.split("?", 1)
        params = query.split("&")
        # Filter out sslmode and channel_binding
        params = [p for p in params if not p.startswith("sslmode=") and not p.startswith("channel_binding=")]
        if params:
            clean_url = f"{base}?{'&'.join(params)}"
        else:
            clean_url = base

    # CRITICAL: Neon requires SSL.
    connect_args = {}
    if "postgresql" in clean_url:
        connect_args = {
            "server_settings": {
                "jit": "off" # Optimization for asyncpg
            },
            "ssl": "require"
        }

    engine = create_async_engine(
        clean_url,
        poolclass=AsyncAdaptedQueuePool,
        pool_size=20,
        max_overflow=30,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args=connect_args
    )
    
    # Cache the engine
    _engine_cache[clean_url] = engine
    return engine

# --- Initialization Helpers ---
_initialized_dbs = set()

def _tables_initialized(db_url: str) -> bool:
    return db_url in _initialized_dbs

def _mark_tables_initialized(db_url: str):
    _initialized_dbs.add(db_url)

async def init_user_db(db_url: str):
    """Helper to initialize tables in a user's Neon DB (Async)"""
    try:
        engine = get_user_db_engine(db_url)
        async with engine.begin() as conn:
            await conn.run_sync(UserBase.metadata.create_all)
        _mark_tables_initialized(db_url)
        print(f"✓ Initialized tables for {db_url}")
    except Exception as e:
        print(f"❌ Failed to initialize tables: {e}")
        raise

async def get_user_db(github_username: str, system_db: AsyncSession = Depends(get_system_db)):
    """
    Robust dependency to get User DB AsyncSession.
    """
    # Local import to avoid circular dependency
    import models
    from sqlalchemy import select
    
    # Async query
    result = await system_db.execute(select(models.User).filter(models.User.github_username == github_username))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.neon_db_url:
        raise HTTPException(
            status_code=400, 
            detail="Database not configured. Please complete onboarding."
        )
        
    engine = get_user_db_engine(user.neon_db_url)
    SessionLocal = sessionmaker(
        bind=engine, 
        class_=AsyncSession, 
        expire_on_commit=False,
        autocommit=False, 
        autoflush=False
    )
    
    async with SessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()