'use client'

import { useState, useEffect } from 'react'
import { Trophy, Star, ArrowRight, X } from 'lucide-react'
import { markOnboardingComplete } from '@/lib/onboardingStorage'

interface OnboardingCelebrationProps {
    onClose: () => void
}

export default function OnboardingCelebration({ onClose }: OnboardingCelebrationProps) {
    const [show, setShow] = useState(true)

    useEffect(() => {
        // Mark as complete in storage immediately so it doesn't show again
        markOnboardingComplete()

        // Auto-dismiss after 10 seconds if not interacted with
        const timer = setTimeout(() => {
            handleClose()
        }, 10000)

        return () => clearTimeout(timer)
    }, [])

    const handleClose = () => {
        setShow(false)
        setTimeout(onClose, 500) // Wait for exit animation
    }

    if (!show) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
            {/* Confetti Effect (CSS-based for simplicity, or could use a library) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute animate-fall"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `-10%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}
                    >
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{
                                backgroundColor: ['#933DC9', '#53118F', '#FFD700', '#4ADE80'][Math.floor(Math.random() * 4)]
                            }}
                        />
                    </div>
                ))}
            </div>

            <div className="relative max-w-lg w-full bg-[#242424] border border-[#933DC9]/50 rounded-3xl p-8 shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-[#FBFAEE]/40 hover:text-[#FBFAEE] transition"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-lg mb-6 animate-bounce">
                        <Trophy className="w-12 h-12 text-white" />
                    </div>

                    <h2 className="text-3xl font-bold text-[#FBFAEE] mb-2">
                        You're All Set! 🚀
                    </h2>
                    <p className="text-[#FBFAEE]/70 mb-8 text-lg">
                        You've mastered the basics. Now you have everything you need to crush your goals with brutal honesty.
                    </p>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-center p-4 bg-[#000000]/40 rounded-xl border border-[#242424]/50">
                            <div className="bg-green-500/20 p-2 rounded-lg mr-4">
                                <Star className="w-6 h-6 text-green-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-[#FBFAEE]">Premium Status Unlocked</h3>
                                <p className="text-sm text-[#FBFAEE]/60">You're officially a Reflog power user</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-full bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] py-4 rounded-xl font-bold text-lg hover:brightness-110 transition-all shadow-lg hover:shadow-[#933DC9]/40 flex items-center justify-center group"
                    >
                        Let's Get to Work
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            <style jsx>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
        </div>
    )
}
