'use client'

import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    Activity,
    Timer,
    BookOpen,
    Target,
    Brain,
    History,
    MessageCircle,
    CheckCircle,
    Plus,
    Flame
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onNavigate: (tab: string) => void
    onAction: (action: string) => void
}

export default function CommandPalette({ open, onOpenChange, onNavigate, onAction }: CommandPaletteProps) {
    const router = useRouter()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                onOpenChange(!open)
            }
        }

        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [open, onOpenChange])

    const runCommand = (command: () => void) => {
        onOpenChange(false)
        command()
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => onOpenChange(false)} />

            <div className="relative w-full max-w-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200">
                <Command
                    className="w-full bg-[#1A1A1A]/90 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                    loop
                >
                    <div className="flex items-center border-b border-white/10 px-4" cmdk-input-wrapper="">
                        <Search className="w-5 h-5 text-[#FBFAEE]/40 mr-3" />
                        <Command.Input
                            placeholder="Type a command or search..."
                            className="w-full bg-transparent py-4 text-lg text-[#FBFAEE] placeholder:text-[#FBFAEE]/40 focus:outline-none"
                        />
                    </div>

                    <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
                        <Command.Empty className="py-6 text-center text-[#FBFAEE]/40 text-sm">
                            No results found.
                        </Command.Empty>

                        <Command.Group heading="Navigation" className="text-xs font-medium text-[#FBFAEE]/40 px-2 py-1.5 mb-1 uppercase tracking-wider">
                            <Command.Item
                                onSelect={() => runCommand(() => onNavigate('overview'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <Activity className="w-4 h-4 mr-3 text-[#FBFAEE]/60" />
                                Overview
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => onNavigate('focus'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <Timer className="w-4 h-4 mr-3 text-[#FBFAEE]/60" />
                                Focus Session
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => onNavigate('goals'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <Target className="w-4 h-4 mr-3 text-[#FBFAEE]/60" />
                                Goals
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => onNavigate('learning'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <BookOpen className="w-4 h-4 mr-3 text-[#FBFAEE]/60" />
                                Learning Plans
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => onNavigate('decisions'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <Brain className="w-4 h-4 mr-3 text-[#FBFAEE]/60" />
                                Life Decisions
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => onNavigate('chat'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <MessageCircle className="w-4 h-4 mr-3 text-[#FBFAEE]/60" />
                                AI Mentor Chat
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => onNavigate('history'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <History className="w-4 h-4 mr-3 text-[#FBFAEE]/60" />
                                History
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => onNavigate('settings'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <Settings className="w-4 h-4 mr-3 text-[#FBFAEE]/60" />
                                Settings
                            </Command.Item>
                        </Command.Group>

                        <Command.Separator className="h-px bg-white/10 my-2" />

                        <Command.Group heading="Quick Actions" className="text-xs font-medium text-[#FBFAEE]/40 px-2 py-1.5 mb-1 uppercase tracking-wider">
                            <Command.Item
                                onSelect={() => runCommand(() => onAction('checkin'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <CheckCircle className="w-4 h-4 mr-3 text-green-400" />
                                Daily Check-in
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => onAction('new_goal'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <Plus className="w-4 h-4 mr-3 text-orange-400" />
                                New Goal
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => onAction('new_plan'))}
                                className="flex items-center px-3 py-2.5 rounded-lg text-sm text-[#FBFAEE] aria-selected:bg-[#933DC9]/20 aria-selected:text-white cursor-pointer transition-colors mb-1"
                            >
                                <Plus className="w-4 h-4 mr-3 text-[#C488F8]" />
                                New Learning Plan
                            </Command.Item>
                        </Command.Group>
                    </Command.List>
                </Command>
            </div>
        </div>
    )
}
