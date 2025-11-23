'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen, Layout, Youtube } from 'lucide-react'
import VideoPlayer from './VideoPlayer'
import SmartNotes from './SmartNotes'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Learning() {
    const [url, setUrl] = useState('')
    const [videoId, setVideoId] = useState('')
    const [transcript, setTranscript] = useState([])
    const [currentTime, setCurrentTime] = useState(0)
    const [notes, setNotes] = useState('')
    const [loadingTranscript, setLoadingTranscript] = useState(false)

    const extractVideoId = (inputUrl: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = inputUrl.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value)
    }

    const handleLoadVideo = () => {
        const id = extractVideoId(url)
        if (id) {
            setVideoId(id)
            fetchTranscript(id)
        } else {
            alert('Invalid YouTube URL')
        }
    }

    const fetchTranscript = async (id: string) => {
        setLoadingTranscript(true)
        try {
            const response = await axios.post(`${API_URL}/learning/transcript`, {
                video_id: id
            })
            setTranscript(response.data.transcript)
        } catch (error) {
            console.error("Failed to fetch transcript", error)
            // Don't clear transcript immediately, maybe show error toast
        } finally {
            setLoadingTranscript(false)
        }
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header / Search */}
            <div className="flex items-center space-x-4 bg-[#242424] p-4 rounded-2xl border border-white/10 shadow-lg">
                <div className="bg-[#933DC9]/20 p-3 rounded-xl">
                    <Youtube className="w-6 h-6 text-[#933DC9]" />
                </div>
                <div className="flex-1 relative flex items-center space-x-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/30 w-5 h-5" />
                        <input
                            type="text"
                            value={url}
                            onChange={handleUrlChange}
                            placeholder="Paste YouTube URL to start learning..."
                            className="w-full bg-[#1a1a1a] text-[#FBFAEE] pl-12 pr-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-[#933DC9] focus:border-transparent outline-none transition"
                            onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
                        />
                    </div>
                    <button
                        onClick={handleLoadVideo}
                        disabled={!url || loadingTranscript}
                        className="bg-[#933DC9] hover:bg-[#A35AD4] text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#933DC9]/20"
                    >
                        {loadingTranscript ? 'Loading...' : 'Load Video'}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {videoId ? (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                    {/* Left: Video */}
                    <div className="flex flex-col space-y-4">
                        <VideoPlayer
                            url={url}
                            onProgress={(state) => setCurrentTime(state.playedSeconds)}
                        />

                        {/* Transcript Status */}
                        <div className="bg-[#242424] p-4 rounded-xl border border-white/10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[#FBFAEE]/70">Transcript Status</span>
                                {loadingTranscript ? (
                                    <span className="text-yellow-400 flex items-center">
                                        <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></span>
                                        Fetching...
                                    </span>
                                ) : transcript.length > 0 ? (
                                    <span className="text-green-400 flex items-center">
                                        <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                        Active
                                    </span>
                                ) : (
                                    <span className="text-red-400">Unavailable</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Notes */}
                    <div className="h-full min-h-[500px]">
                        <SmartNotes
                            currentTime={currentTime}
                            transcript={transcript}
                            notes={notes}
                            setNotes={setNotes}
                        />
                    </div>
                </div>
            ) : (
                // Empty State
                <div className="flex-1 flex flex-col items-center justify-center text-[#FBFAEE]/30 space-y-6">
                    <div className="w-24 h-24 bg-[#242424] rounded-full flex items-center justify-center border border-white/5">
                        <BookOpen className="w-10 h-10" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-medium text-[#FBFAEE] mb-2">Ready to Learn?</h3>
                        <p className="max-w-md mx-auto">Paste a YouTube tutorial link above to enter Active Focus Mode with AI-powered note taking.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
