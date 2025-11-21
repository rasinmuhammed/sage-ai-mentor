from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_system_db
from routers import (
    users,
    goals,
    action_plans,
    notifications,
    pomodoro,
    commitments,
    insights,
    dashboard,
    system
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize System DB
    try:
        print("🔄 Initializing System Database...")
        await init_system_db()
        print("✅ System Database initialized successfully")
    except Exception as e:
        print(f"❌ CRITICAL ERROR: Failed to initialize System Database: {e}")
    
    yield
    
    # Shutdown: Clean up resources if needed
    print("🛑 Shutting down...")

app = FastAPI(title="Reflog AI Mentor API", version="1.0.0", lifespan=lifespan)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://clerk.com",
        "https://*.clerk.accounts.dev"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(system.router, tags=["System"])
app.include_router(users.router, tags=["Users"])
app.include_router(dashboard.router, tags=["Dashboard"])
app.include_router(goals.router, tags=["Goals"])
app.include_router(action_plans.router, tags=["Action Plans"])
app.include_router(pomodoro.router, tags=["Pomodoro"])
app.include_router(commitments.router, tags=["Commitments"])
app.include_router(insights.router, tags=["Insights"])
app.include_router(notifications.router, tags=["Notifications"])

@app.get("/")
def read_root():
    return {"message": "Reflog AI Mentor API is running", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)