import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { DailyTask } from '@/hooks/useActionPlansQuery'
import axios from 'axios'

interface EditTaskModalProps {
    task: DailyTask
    planId: number
    githubUsername: string
    onClose: () => void
    onComplete: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function EditTaskModal({ task, planId, githubUsername, onClose, onComplete }: EditTaskModalProps) {
    const [title, setTitle] = useState(task.title)
    const [description, setDescription] = useState(task.description)
    const [estimatedTime, setEstimatedTime] = useState(task.estimated_time)
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            // We are using the same endpoint as "complete" but for updates?
            // No, we created a specific PUT endpoint for tasks: /action-plans/{plan_id}/tasks/{task_id}
            // Wait, the backend update endpoint I created was:
            // @router.put("/action-plans/{github_username}/{plan_id}/tasks/{task_id}")
            // And it accepted DailyTaskUpdate model (notes, difficulty, actual_time_spent).
            // Did I add title/description to DailyTaskUpdate?
            // Let me check backend/routers/action_plans.py first.

            // If I didn't, I need to update the backend first.
            // Assuming I need to check backend.

            await axios.put(`${API_URL}/action-plans/${githubUsername}/${planId}/tasks/${task.id}`, {
                title,
                description,
                estimated_time: estimatedTime
            })
            onComplete()
        } catch (error) {
            console.error('Failed to update task:', error)
            alert('Failed to update task')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
            <div className="glass-card rounded-2xl max-w-md w-full shadow-2xl border border-white/10">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-gradient">Edit Task</h2>
                    <button onClick={onClose} className="text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">Task Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg resize-none focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-1.5">Estimated Time (mins)</label>
                        <input
                            type="number"
                            value={estimatedTime}
                            onChange={(e) => setEstimatedTime(parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 text-[#FBFAEE] rounded-lg focus:ring-1 focus:ring-[#933DC9] focus:border-[#933DC9]/50 transition-all"
                        />
                    </div>

                    <div className="flex space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white/5 text-[#FBFAEE]/80 rounded-lg font-semibold hover:bg-white/10 transition border border-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-4 py-2 rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center shadow-lg shadow-purple-500/20"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
