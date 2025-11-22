'use client'

import { useState } from 'react'
import { Sparkles, Save, Copy, Loader2 } from 'lucide-react'
import axios from 'axios'

interface TranscriptItem {
    text: string
    start: number
    duration: number
}

interface SmartNotesProps {
    currentTime: number
    transcript: TranscriptItem[]
    notes: string
    setNotes: (notes: string) => void
}

export default function SmartNotes({ currentTime, transcript, notes, setNotes }: SmartNotesProps) {
    const [loading, setLoading] = useState(false)

    const handleSummarize = async () => {
        if (!transcript.length) return

        setLoading(true)
        try {
            // Get context: 2 minutes before current time
            const startTime = Math.max(0, currentTime - 120)
            const relevantSegment = transcript.filter(
                item => item.start >= startTime && item.start <= currentTime
            )

            const textToSummarize = relevantSegment.map(item => item.text).join(' ')

            if (!textToSummarize) {
                setLoading(false)
                return
            }

            const groqKey = localStorage.getItem('groq_api_key')
            const response = await axios.post('http://localhost:8000/learning/summarize', {
                text: textToSummarize,
                context: "YouTube Video Tutorial"
            }, {
                headers: groqKey ? { 'X-Groq-Key': groqKey } : {}
            })

            const summary = response.data.summary

            // Append summary to notes
            const newNotes = notes + `\n\n### AI Summary (${formatTime(startTime)} - ${formatTime(currentTime)})\n${summary}\n`
            setNotes(newNotes)

        } catch (error) {
            console.error("Summarization failed", error)
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="flex flex-col h-full bg-[#242424] rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center space-x-2">
                    <span className="text-[#FBFAEE] font-semibold">Smart Notes</span>
                    <span className="text-xs text-[#FBFAEE]/50 bg-white/10 px-2 py-0.5 rounded-full">Markdown</span>
                </div>
                <button
                    onClick={handleSummarize}
                    disabled={loading || !transcript.length}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-[#933DC9] hover:bg-[#A35AD4] text-white rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>AI Summarize</span>
                </button>
            </div>

            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 bg-[#1a1a1a] text-[#FBFAEE] p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                placeholder="# Start typing your notes here...
        
Click 'AI Summarize' to generate notes from the last 2 minutes of video."
            />

            <div className="p-2 border-t border-white/10 bg-white/5 flex justify-end text-xs text-[#FBFAEE]/40">
                {notes.length} chars
            </div>
        </div>
    )
}
