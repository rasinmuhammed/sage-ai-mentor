'use client'

import { useState, useRef, useEffect } from 'react'
import ReactPlayer from 'react-player'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'

interface VideoPlayerProps {
    url: string
    onProgress: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void
    onDuration: (duration: number) => void
}

export default function VideoPlayer({ url, onProgress, onDuration }: VideoPlayerProps) {
    const [playing, setPlaying] = useState(false)
    const [volume, setVolume] = useState(0.8)
    const [muted, setMuted] = useState(false)
    const playerRef = useRef<any>(null)

    // Hydration fix for ReactPlayer
    const [hasWindow, setHasWindow] = useState(false)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHasWindow(true)
        }
    }, [])

    if (!hasWindow) return null

    return (
        <div className="relative w-full pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 group">
            <div className="absolute top-0 left-0 w-full h-full">
                {/* @ts-ignore */}
                <ReactPlayer
                    ref={playerRef}
                    url={url}
                    width="100%"
                    height="100%"
                    playing={playing}
                    volume={volume}
                    muted={muted}
                    onProgress={onProgress as any}
                    onDuration={onDuration}
                    controls={true}
                    config={{
                        youtube: {
                            playerVars: { showinfo: 1 }
                        }
                    } as any}
                />
            </div>
        </div>
    )
}
