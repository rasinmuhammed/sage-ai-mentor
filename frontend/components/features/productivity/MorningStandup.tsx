'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, ChevronRight } from 'lucide-react'

interface MorningStandupProps {
    userName: string
    onComplete: () => void
}

export default function MorningStandup({ userName, onComplete }: MorningStandupProps) {
    const [step, setStep] = useState(0)
    const [text, setText] = useState('')
    const fullText = `> SYSTEM_INIT: SUCCESS\n> AUTHENTICATED_USER: ${userName.toUpperCase()}\n> DATE: ${new Date().toLocaleDateString()}\n> LOADING_MODULES: [GOALS, TASKS, ANALYTICS]... OK\n> STATUS: READY_FOR_DEPLOYMENT`

    useEffect(() => {
        // Typewriter effect
        if (step === 0) {
            let i = 0
            const interval = setInterval(() => {
                setText(fullText.slice(0, i))
                i++
                if (i > fullText.length) {
                    clearInterval(interval)
                    setStep(1)
                }
            }, 30)
            return () => clearInterval(interval)
        }
    }, [step, fullText])

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center font-mono"
        >
            <div className="w-full max-w-2xl p-8">
                <div className="mb-8 text-green-500 text-lg md:text-xl leading-relaxed whitespace-pre-line min-h-[200px]">
                    {text}
                    <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-3 h-6 bg-green-500 ml-1 align-middle"
                    />
                </div>

                <AnimatePresence>
                    {step === 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <button
                                onClick={onComplete}
                                className="group flex items-center space-x-3 text-white/80 hover:text-white transition-colors"
                            >
                                <span className="text-sm uppercase tracking-widest border-b border-transparent group-hover:border-green-500 transition-all">
                                    Initialize Workspace
                                </span>
                                <ChevronRight className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />
        </motion.div>
    )
}
