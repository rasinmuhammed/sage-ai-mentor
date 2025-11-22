'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Maximize2, Minimize2, Play, Pause } from 'lucide-react'

interface FlowModeProps {
    onExit: () => void
}

export default function FlowMode({ onExit }: FlowModeProps) {
    const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes
    const [isActive, setIsActive] = useState(false)
    const [task, setTask] = useState('')

    useEffect(() => {
        let interval: NodeJS.Timeout

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1)
            }, 1000)
        } else if (timeLeft === 0) {
            setIsActive(false)
        }

        return () => clearInterval(interval)
    }, [isActive, timeLeft])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const toggleTimer = () => setIsActive(!isActive)

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[90] bg-[#050505] flex flex-col items-center justify-center text-[#FBFAEE]"
        >
            {/* Exit Button */}
            <button
                onClick={onExit}
                className="absolute top-8 right-8 p-2 text-white/30 hover:text-white transition-colors"
            >
                <X className="w-8 h-8" />
            </button>

            {/* Content */}
            <div className="text-center space-y-12 max-w-2xl w-full px-4">
                <div className="space-y-4">
                    <input
                        type="text"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        placeholder="What are you working on?"
                        className="w-full bg-transparent text-center text-2xl md:text-3xl text-white/60 placeholder:text-white/20 focus:outline-none focus:text-white transition-colors font-light"
                    />
                </div>

                <div className="relative group cursor-pointer" onClick={toggleTimer}>
                    <div className="text-[12rem] md:text-[16rem] font-bold leading-none tracking-tighter font-mono tabular-nums select-none">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {isActive ? (
                            <Pause className="w-24 h-24 text-white/50" />
                        ) : (
                            <Play className="w-24 h-24 text-white/50 ml-2" />
                        )}
                    </div>
                </div>

                <div className="flex justify-center space-x-8 text-sm text-white/30 uppercase tracking-widest">
                    <button onClick={() => setTimeLeft(25 * 60)} className="hover:text-white transition-colors">Pomodoro</button>
                    <button onClick={() => setTimeLeft(5 * 60)} className="hover:text-white transition-colors">Short Break</button>
                    <button onClick={() => setTimeLeft(15 * 60)} className="hover:text-white transition-colors">Long Break</button>
                </div>
            </div>

            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#933DC9]/5" />
        </motion.div>
    )
}
