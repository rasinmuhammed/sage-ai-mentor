import sys
import os
from sqlalchemy.orm import Session

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import init_system_db, get_system_db, get_user_db_engine, UserBase
import models

def verify_dual_db():
    print("1. Initializing System DB...")
    init_system_db()
    
    db = next(get_system_db())
    
    # Create or get test user
    username = "test_dual_db_user"
    user = db.query(models.User).filter(models.User.github_username == username).first()
    if not user:
        print(f"2. Creating test user '{username}'...")
        user = models.User(
            github_username=username,
            email="test@example.com",
            neon_db_url="sqlite:///./test_user_db.sqlite" # Simulating User DB with SQLite
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        print(f"2. Test user '{username}' already exists. Updating DB URL...")
        user.neon_db_url = "sqlite:///./test_user_db.sqlite"
        db.commit()
    
    print(f"3. User DB URL set to: {user.neon_db_url}")
    
    # Simulate get_user_db logic
    print("4. Connecting to User DB and creating tables...")
    try:
        engine = get_user_db_engine(user.neon_db_url)
        UserBase.metadata.create_all(bind=engine)
        print("   ✅ User DB tables created successfully.")
        
        # Verify tables exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"   ✅ Found tables in User DB: {tables}")
        
        expected_tables = ['goals', 'checkins', 'action_plans', 'daily_tasks']
        missing = [t for t in expected_tables if t not in tables]
        
        if not missing:
            print("   ✅ All critical tables present.")
        else:
            print(f"   ❌ Missing tables: {missing}")
            
    except Exception as e:
        print(f"   ❌ Failed to connect/create User DB: {e}")
        raise e
    finally:
        # Cleanup
        if os.path.exists("./test_user_db.sqlite"):
            print("5. Cleaning up test database file...")
            os.remove("./test_user_db.sqlite")
            print("   ✅ Cleanup complete.")

if __name__ == "__main__":
    verify_dual_db()
