import asyncio
from database import system_engine
from sqlalchemy import text

async def migrate():
    async with system_engine.begin() as conn:
        print("Migrating users table...")
        columns = [
            ("total_xp", "INTEGER DEFAULT 0"),
            ("current_streak", "INTEGER DEFAULT 0"),
            ("best_streak", "INTEGER DEFAULT 0"),
            ("last_activity_date", "TIMESTAMP"),
            ("level", "INTEGER DEFAULT 1")
        ]
        
        for col_name, col_type in columns:
            try:
                await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                print(f"Added {col_name}")
            except Exception as e:
                print(f"Skipping {col_name} (might already exist or error: {e})")

if __name__ == "__main__":
    asyncio.run(migrate())
