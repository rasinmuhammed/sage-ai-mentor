'use client'

import { useState } from 'react'
import { Sparkles, Save, Copy, Loader2 } from 'lucide-react'
import axios from 'axios'
import Editor from '@monaco-editor/react'

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
    const [language, setLanguage] = useState('python')

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

            // Append summary to notes (as comment based on language)
            const commentPrefix = language === 'python' ? '# ' : '// '
            const formattedSummary = summary.split('\n').map((line: string) => `${commentPrefix}${line}`).join('\n')

            const newNotes = notes + `\n\n${commentPrefix}### AI Summary (${formatTime(startTime)} - ${formatTime(currentTime)})\n${formattedSummary}\n`
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
        <div className="flex flex-col h-full bg-[#1e1e1e] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#252526]">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-[#FBFAEE] font-semibold text-sm">Code Editor</span>
                    </div>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-[#3c3c3c] text-[#FBFAEE] text-xs px-2 py-1 rounded border border-white/10 outline-none focus:border-[#933DC9]"
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="sql">SQL</option>
                        <option value="markdown">Markdown</option>
                    </select>
                </div>
                <button
                    onClick={handleSummarize}
                    disabled={loading || !transcript.length}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-[#933DC9] hover:bg-[#A35AD4] text-white rounded-lg text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>AI Summarize</span>
                </button>
            </div>

            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    defaultLanguage="python"
                    language={language}
                    value={notes}
                    onChange={(value) => setNotes(value || '')}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', monospace",
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                    }}
                />
            </div>

            <div className="px-3 py-1 border-t border-white/10 bg-[#007acc] flex justify-between items-center text-[10px] text-white">
                <span>{language.toUpperCase()}</span>
                <span>{notes.length} chars</span>
            </div>
        </div>
    )
}
