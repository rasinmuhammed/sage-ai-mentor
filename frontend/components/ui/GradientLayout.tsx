'use client'

import React from 'react'

interface GradientLayoutProps {
    children: React.ReactNode
    className?: string
}

export default function GradientLayout({ children, className = '' }: GradientLayoutProps) {
    return (
        <div className={`relative min-h-screen bg-[#000000] text-[#FBFAEE] overflow-x-hidden ${className}`}>
            {/* Gradient Leaks */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#933DC9]/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#53118F]/20 rounded-full blur-[120px] pointer-events-none animate-pulse-slow delay-1000" />
            <div className="fixed top-[40%] left-[40%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-float" />

            {/* Content */}
            <div className="relative z-10 h-full">
                {children}
            </div>
        </div>
    )
}
