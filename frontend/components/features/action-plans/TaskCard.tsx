import { useState } from 'react'
import axios from 'axios'
import {
    CheckCircle, Brain, ChevronDown, Edit, Trash2, Clock, Loader2
} from 'lucide-react'
import MarkdownRenderer from '../../shared/MarkdownRenderer'
import { DailyTask } from '@/hooks/useActionPlansQuery'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface TaskCardProps {
    task: DailyTask
    planId: number
    githubUsername: string
    onComplete: () => void
    onOptimisticComplete: (taskId: number, updates: Partial<DailyTask>) => void
    onEdit: (task: DailyTask) => void
    onDelete: (taskId: number) => void
}

export default function TaskCard({ task, planId, githubUsername, onComplete, onOptimisticComplete, onEdit, onDelete }: TaskCardProps) {
    const [completing, setCompleting] = useState(false)
    const [showFeedback, setShowFeedback] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [timeSpent, setTimeSpent] = useState<string>('')
    const [difficulty, setDifficulty] = useState(3)
    const [notes, setNotes] = useState('')
    const [feedback, setFeedback] = useState<string | null>(null)

    const handleComplete = async () => {
        if (task.status === 'completed') return

        setCompleting(true)

        // Optimistic update
        onOptimisticComplete(task.id, { status: 'completed' });

        try {
            const response = await axios.post(
                `${API_URL}/action-plans/${githubUsername}/${planId}/tasks/${task.id}/complete`,
                {
                    status: 'completed',
                    actual_time_spent: parseInt(timeSpent || '0') || task.estimated_time,
                    difficulty_rating: difficulty,
                    notes: notes
                }
            )
            setFeedback(response.data.feedback)
            setShowFeedback(true)
            onComplete()
        } catch (error) {
            console.error('Failed to complete task:', error)
            // Revert optimistic update
            onOptimisticComplete(task.id, { status: 'pending' });
            alert('Failed to complete task')
        } finally {
            setCompleting(false)
        }
    }

    if (task.status === 'completed') {
        return (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                        <div>
                            <h4 className="font-semibold text-[#FBFAEE]">{task.title}</h4>
                            <p className="text-xs text-[#FBFAEE]/70">
                                Completed • {task.actual_time_spent || task.estimated_time} mins
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (showFeedback && feedback) {
        return (
            <div className="glass-card border-[#933DC9]/50 rounded-xl p-4">
                <div className="flex items-center mb-3">
                    <Brain className="w-5 h-5 mr-2 text-[#C488F8]" />
                    <h4 className="font-semibold text-[#C488F8]">AI Feedback</h4>
                </div>
                <div className="text-sm text-[#FBFAEE]/70 leading-relaxed prose prose-invert max-w-none">
                    <MarkdownRenderer content={feedback} />
                </div>
                <button
                    onClick={() => setShowFeedback(false)}
                    className="mt-3 text-sm text-[#C488F8] hover:text-[#933DC9]"
                >
                    Close
                </button>
            </div>
        )
    }

    return (
        <div className="bg-black/20 border border-white/5 rounded-xl p-4 hover:border-[#933DC9]/50 transition-all hover:bg-black/30 group relative">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-[#FBFAEE] mb-1 group-hover:text-[#C488F8] transition-colors pr-8">{task.title}</h4>

                        {/* Task Menu */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-1 hover:bg-white/10 rounded text-[#FBFAEE]/40 hover:text-[#FBFAEE] transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(task); }}
                                        className="w-full px-4 py-2 text-left text-xs text-[#FBFAEE]/80 hover:bg-white/5 hover:text-[#FBFAEE] flex items-center space-x-2"
                                    >
                                        <Edit className="w-3 h-3" />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(task.id); }}
                                        className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center space-x-2"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            )}
                            {/* Overlay to close menu */}
                            {showMenu && (
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                            )}
                        </div>
                    </div>

                    <p className="text-sm text-[#FBFAEE]/70">{task.description}</p>
                    <div className="flex items-center space-x-3 mt-2 text-xs text-[#FBFAEE]/60">
                        <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {task.estimated_time} mins
                        </span>
                        <span className={`px-2 py-0.5 rounded ${task.difficulty === 'easy' ? 'bg-green-500/10 text-green-300 border border-green-500/20' :
                            task.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' :
                                'bg-red-500/10 text-red-300 border border-red-500/20'
                            }`}>
                            {task.difficulty}
                        </span>
                    </div>
                </div>
            </div>

            {/* Complete Form */}
            <div className="space-y-3 mt-4 pt-3 border-t border-white/5">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-[#FBFAEE]/60 mb-1">Time Spent (mins)</label>
                        <input
                            type="number"
                            value={timeSpent}
                            onChange={(e) => setTimeSpent(e.target.value)}
                            placeholder={task.estimated_time.toString()}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg text-sm focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-[#FBFAEE]/60 mb-1">Difficulty (1-5)</label>
                        <input
                            type="number"
                            min="1"
                            max="5"
                            value={difficulty}
                            onChange={(e) => setDifficulty(parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg text-sm focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-[#FBFAEE]/60 mb-1">Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="What did you learn? Any challenges?"
                        className="w-full px-3 py-2 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg text-sm resize-none focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
                        rows={2}
                    />
                </div>
                <button
                    onClick={handleComplete}
                    disabled={completing}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-[#FBFAEE] py-2 rounded-lg font-semibold transition-all disabled:opacity-50 text-sm flex items-center justify-center shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                    {completing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Complete
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
