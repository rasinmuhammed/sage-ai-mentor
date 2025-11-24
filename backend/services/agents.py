from crewai import Agent, LLM
import os
from dotenv import load_dotenv

load_dotenv()

# CRITICAL: Remove any OpenAI references from environment
for key in list(os.environ.keys()):
    if 'OPENAI' in key:
        del os.environ[key]

# Get Groq credentials
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# if not GROQ_API_KEY:
#     print("⚠️ GROQ_API_KEY not found in env. Expecting it via headers.")

print(f"✓ Using Groq model: {GROQ_MODEL}")

def create_agents(api_key: str = None):
    """
    Create agents with dynamic API key.
    If api_key is provided, it overrides the environment variable.
    """
    # Use provided key or fallback to env
    current_api_key = api_key or os.getenv("GROQ_API_KEY")
    
    if not current_api_key:
        # Return None or raise error depending on how we want to handle it.
        # For now, let's assume if no key is available, we can't create agents.
        # But to avoid import errors, we might return a dict of None or raise.
        # Let's raise a helpful error if we try to use it.
        raise ValueError("No Groq API Key provided via headers or environment.")

    # Set Groq API key for LiteLLM
    os.environ["GROQ_API_KEY"] = current_api_key
    
    # Use CrewAI's LLM class with Groq provider via LiteLLM
    groq_llm = LLM(
        model=f"groq/{GROQ_MODEL}",
        temperature=0.7,
        api_key=current_api_key # Explicitly pass key if supported, else env var handles it
    )

    # Agent 1: The Analyst
    analyst = Agent(
        role="Data Analyst",
        goal="Analyze user's GitHub data, coding patterns, and behavior to extract meaningful insights",
        backstory="""You are a meticulous data analyst who specializes in understanding
        developer behavior through code patterns. You don't sugarcoat findings - you present
        raw data and what it really means. You're looking for gaps between what developers
        SAY they do and what their GitHub history SHOWS they do.""",
        verbose=True,
        allow_delegation=False,
        llm=groq_llm
    )

    # Agent 2: The Psychologist
    psychologist = Agent(
        role="Developer Psychologist",
        goal="Identify psychological patterns, procrastination triggers, and emotional blockers in developer behavior",
        backstory="""You're a psychologist who specializes in developer mental health and
        productivity patterns. You can spot imposter syndrome, perfectionism, tutorial hell,
        and burnout from behavioral data. You understand that developers often avoid challenges
        by doing 'productive' busy-work. You're empathetic but direct.""",
        verbose=True,
        allow_delegation=False,
        llm=groq_llm
    )

    # Agent 3: The Strategist
    strategist = Agent(
        role="Strategic Advisor",
        goal="Synthesize insights from all agents and create specific, time-bound action plans with accountability",
        backstory="""You're a no-nonsense strategic advisor who has mentored hundreds of
        developers. You take insights from the Analyst and Psychologist and translate them
        into brutally specific action items. You don't accept vague goals - everything must
        be measurable, time-bound, and realistic. You prioritize ruthlessly based on ROI.""",
        verbose=True,
        allow_delegation=False,
        llm=groq_llm
    )

    # Agent 4: The Contrarian
    contrarian = Agent(
        role="Devil's Advocate",
        goal="Challenge assumptions and point out contradictions in the user's thinking and behavior",
        backstory="""You're the agent who asks uncomfortable questions. When everyone else
        is being supportive, you're the one asking 'But is this really what you want?' or
        'Your actions contradict your words - which one is true?'. You're not mean, you're
        necessary. You prevent self-delusion.""",
        verbose=True,
        allow_delegation=False,
        llm=groq_llm
    )

    return {
        "analyst": analyst,
        "psychologist": psychologist,
        "strategist": strategist,
        "contrarian": contrarian
    }

# Keep global instances for backward compatibility/default env usage if needed,
# but ideally we switch to using the factory.
# For now, we'll try to initialize defaults if env var exists, else None.
try:
    default_agents = create_agents()
    analyst = default_agents["analyst"]
    psychologist = default_agents["psychologist"]
    strategist = default_agents["strategist"]
    contrarian = default_agents["contrarian"]
except:
    # Fallback if no env var set yet
    analyst = None
    psychologist = None
    strategist = None
    contrarian = None

def get_agents():
    """
    Get the default global agents.
    Returns the agents created from environment variables.
    """
    return {
        "analyst": analyst,
        "psychologist": psychologist,
        "strategist": strategist,
        "contrarian": contrarian
    }