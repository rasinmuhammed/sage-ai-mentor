'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, X, Check } from 'lucide-react'
import confetti from 'canvas-confetti'

interface TwoMinuteTimerProps {
    onComplete?: () => void
    onClose: () => void
}

export default function TwoMinuteTimer({ onComplete, onClose }: TwoMinuteTimerProps) {
    const [timeLeft, setTimeLeft] = useState(120) // 2 minutes
    const [isActive, setIsActive] = useState(false)

    useEffect(() => {
        let interval: NodeJS.Timeout

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1)
            }, 1000)
        } else if (timeLeft === 0) {
            setIsActive(false)
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10B981', '#34D399', '#FBFAEE']
            })
            if (onComplete) onComplete()
        }

        return () => clearInterval(interval)
    }, [isActive, timeLeft, onComplete])

    const toggleTimer = () => {
        setIsActive(!isActive)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50"
        >
            <div className="glass-panel p-4 rounded-2xl flex items-center gap-4 shadow-2xl border-t border-white/10">
                <div className="flex flex-col">
                    <span className="text-xs text-[#FBFAEE]/60 font-medium uppercase tracking-wider">2-Minute Rule</span>
                    <span className={`text-2xl font-bold font-mono ${timeLeft < 10 ? 'text-red-400' : 'text-[#FBFAEE]'}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {!isActive && timeLeft > 0 && (
                        <button
                            onClick={toggleTimer}
                            className="p-3 rounded-full bg-[#933DC9] hover:bg-[#7E22CE] text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#933DC9]/30"
                        >
                            <Play className="w-5 h-5 fill-current" />
                        </button>
                    )}

                    {isActive && (
                        <button
                            onClick={toggleTimer}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-[#FBFAEE] transition-all"
                        >
                            <span className="block w-4 h-4 bg-current rounded-sm" />
                        </button>
                    )}

                    {timeLeft === 0 && (
                        <div className="p-3 rounded-full bg-green-500 text-white animate-bounce">
                            <Check className="w-5 h-5" />
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/5 text-[#FBFAEE]/40 hover:text-[#FBFAEE] transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
