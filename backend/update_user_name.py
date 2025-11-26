import asyncio
from database import SystemSessionLocal
from models.user import User
from sqlalchemy import select

async def update_user_name():
    print("=== Updating User Name ===")
    
    async with SystemSessionLocal() as db:
        username = "rasinmuhammed"
        result = await db.execute(select(User).filter(User.github_username == username))
        user = result.scalars().first()
        
        if not user:
            print("❌ User not found!")
            return

        print(f"Current full_name: {user.full_name}")
        
        if not user.full_name:
            user.full_name = "Rasin Muhammed"
            await db.commit()
            print("✅ Updated full_name to 'Rasin Muhammed'")
        else:
            print("ℹ️ full_name already set")

if __name__ == "__main__":
    asyncio.run(update_user_name())
