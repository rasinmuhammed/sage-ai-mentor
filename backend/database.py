from sqlalchemy import create_engine, event, text # Import 'text'
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import os
from dotenv import load_dotenv
import logging

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # If DATABASE_URL is not set, default to local SQLite for development
    DATABASE_URL = "sqlite:///./sage.db"
    print("⚠️ WARNING: DATABASE_URL not set. Falling back to SQLite.")

# Production-grade connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,  # Increased for production
    max_overflow=40,  # Allow more overflow connections
    pool_pre_ping=True,  # Verify connections
    pool_recycle=3600,  # Recycle after 1 hour
    pool_timeout=30,  # Wait up to 30s for connection
    echo=False,  # Disable SQL logging in production
    connect_args={
        "connect_timeout": 10,
        # REMOVED: "options": "-c statement_timeout=30000" as it is unsupported by Neon.tech connection pooler
    }
)

# Add connection pool logging
logging.basicConfig()
logging.getLogger('sqlalchemy.pool').setLevel(logging.INFO)

# Optimize PostgreSQL settings for each connection
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    # Only run for PostgreSQL connections
    if engine.url.drivername.startswith("postgresql"):
        cursor = dbapi_conn.cursor()
        # Set optimal work_mem for this connection
        cursor.execute("SET work_mem = '64MB'")
        # Enable JIT compilation for complex queries
        cursor.execute("SET jit = on")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    expire_on_commit=False  # Better for read-heavy workloads
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables with indexes"""
    Base.metadata.create_all(bind=engine)
    
    # Create additional indexes for performance
    with engine.connect() as conn:
        # Index for checkins by user and timestamp
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_checkins_user_timestamp 
            ON checkins(user_id, timestamp DESC)
        """))
        
        # Index for goals by user and status
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_goals_user_status 
            ON goals(user_id, status)
        """))
        
        # Index for notifications by user and read status
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
            ON notifications(user_id, read, created_at DESC)
        """))
        
        conn.commit()
    
    print("✓ Database tables and indexes created successfully")

# Health check function
def check_db_health():
    """Check database connection health"""
    try:
        with engine.connect() as conn:
            # FIX: Use text() for simple SELECT queries as well
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logging.error(f"Database health check failed: {e}")
        return False