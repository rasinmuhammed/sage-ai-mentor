'use client'

import { useState, useEffect } from 'react'
import { X, Lightbulb } from 'lucide-react'

interface FirstTimeTooltipProps {
    id: string
    title: string
    description: string
    position?: 'top' | 'bottom' | 'left' | 'right'
    onDismiss?: () => void
}

export default function FirstTimeTooltip({
    id,
    title,
    description,
    position = 'bottom',
    onDismiss
}: FirstTimeTooltipProps) {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        // Check if user has seen this tooltip before
        const seen = localStorage.getItem(`tooltip_seen_${id}`)
        if (seen) {
            setIsVisible(false)
        }
    }, [id])

    const handleDismiss = () => {
        localStorage.setItem(`tooltip_seen_${id}`, 'true')
        setIsVisible(false)
        onDismiss?.()
    }

    if (!isVisible) return null

    const positionClasses = {
        top: '-top-24',
        bottom: '-bottom-24',
        left: '-left-64',
        right: '-right-64'
    }

    return (
        <div className={`absolute ${positionClasses[position]} left-0 right-0 z-50 animate-in fade-in slide-in-from-top duration-300`}>
            <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] rounded-xl p-4 shadow-2xl border border-[#933DC9]/50 relative">
                <div className="flex items-start space-x-3">
                    <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
                        <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white mb-1">{title}</h4>
                        <p className="text-sm text-white/90">{description}</p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-white/80 hover:text-white transition flex-shrink-0 p-1 hover:bg-white/10 rounded"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Arrow */}
                <div className={`absolute ${position === 'top' ? 'bottom-0 translate-y-full' :
                        position === 'bottom' ? 'top-0 -translate-y-full' :
                            position === 'left' ? 'right-0 translate-x-full top-1/2 -translate-y-1/2' :
                                'left-0 -translate-x-full top-1/2 -translate-y-1/2'
                    } left-1/2 -translate-x-1/2`}>
                    <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#933DC9]"></div>
                </div>
            </div>
        </div>
    )
}
