from sqlalchemy import create_engine, event, text, Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# --- Configuration ---
# Neon/Postgres requires 'postgresql://', but dashboard often gives 'postgres://'
def fix_db_url(url: str) -> str:
    if url and url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url

# --- System Database (Local/Internal or Neon) ---
# You can set this to a Neon URL in .env if you want the System DB on Neon too
SYSTEM_DATABASE_URL = fix_db_url(os.getenv("SYSTEM_DATABASE_URL", "sqlite:///./sage.db"))

def get_system_engine_args(url):
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    
    # Args for Neon/Postgres
    return {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True, # Vital for Neon serverless (disconnects idle)
        "pool_recycle": 300,
        "connect_args": {
            "sslmode": "require",
            "connect_timeout": 10
        }
    }

system_engine = create_engine(SYSTEM_DATABASE_URL, **get_system_engine_args(SYSTEM_DATABASE_URL))
SystemSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=system_engine)
SystemBase = declarative_base()

def get_system_db():
    db = SystemSessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_system_db():
    """Initialize system database tables"""
    SystemBase.metadata.create_all(bind=system_engine)
    print("✓ System database initialized")

# --- User Database (Dynamic/Neon) ---
UserBase = declarative_base()

def get_user_db_engine(database_url: str):
    """Create a dynamic engine for the user's Neon database"""
    if not database_url:
        raise ValueError("Database URL is required")
    
    # Fix protocol for SQLAlchemy
    clean_url = fix_db_url(database_url)
        
    connect_args = {}
    # Neon requires SSL
    if clean_url.startswith("postgresql"):
        connect_args = {
            "connect_timeout": 10,
            "sslmode": "require"
        }

    return create_engine(
        clean_url,
        poolclass=QueuePool,
        pool_size=10,         # Keep active connections low for serverless
        max_overflow=20,      # Allow bursts
        pool_pre_ping=True,   # CRITICAL: Checks if connection is alive before using
        pool_recycle=1800,    # Recycle connections every 30 mins
        connect_args=connect_args
    )

# --- Optimizations ---

# Optimize PostgreSQL settings for user connections
@event.listens_for(Engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    try:
        # Only run this for Postgres connections (Neon)
        if hasattr(dbapi_conn, 'info') and hasattr(dbapi_conn.info, 'dbname'):
             with dbapi_conn.cursor() as cursor:
                # Optimize for analytical/agent workloads
                cursor.execute("SET work_mem = '64MB'")
                cursor.execute("SET jit = on")
                # Optional: Set statement timeout to prevent hanging queries
                cursor.execute("SET statement_timeout = '60s'")
    except Exception as e:
        # Fail silently for SQLite or if permissions are denied
        pass