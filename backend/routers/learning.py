from fastapi import APIRouter, Depends, HTTPException, Header, Body
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_user_db, get_system_db
from youtube_transcript_api import YouTubeTranscriptApi
from typing import Optional, List, Dict
from pydantic import BaseModel
from services import sage_crew

router = APIRouter()

class TranscriptRequest(BaseModel):
    video_id: str

class SummarizeRequest(BaseModel):
    text: str
    context: Optional[str] = None

@router.post("/learning/transcript")
async def get_transcript(request: TranscriptRequest):
    try:
        # Fetch transcript
        transcript_list = YouTubeTranscriptApi.get_transcript(request.video_id)
        
        # Format it nicely
        formatted_transcript = []
        for item in transcript_list:
            formatted_transcript.append({
                "text": item['text'],
                "start": item['start'],
                "duration": item['duration']
            })
            
        return {"transcript": formatted_transcript}
    except Exception as e:
        print(f"Error fetching transcript: {e}")
        raise HTTPException(status_code=400, detail=f"Could not fetch transcript: {str(e)}")

@router.post("/learning/summarize")
async def summarize_content(
    request: SummarizeRequest,
    x_groq_key: Optional[str] = Header(None, alias="X-Groq-Key")
):
    try:
        # Use SageMentorCrew to summarize
        summary = await sage_crew.summarize_content(
            request.text, 
            request.context, 
            api_key=x_groq_key
        )
        return summary
    except Exception as e:
        print(f"Error summarizing content: {e}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")
