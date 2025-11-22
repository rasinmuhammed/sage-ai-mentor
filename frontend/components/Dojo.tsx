'use client'

import { useState, useEffect } from 'react'
import { Plus, Brain, Clock, CheckCircle2, ExternalLink, Code, RefreshCw, Trash2 } from 'lucide-react'
import axios from 'axios'
import CodeReviewModal from './dojo/CodeReviewModal'

interface Problem {
    id: number
    title: string
    difficulty: string
    pattern: string
    link: string
    mastery_level: number
    next_review: string
}

export default function Dojo() {
    const [problems, setProblems] = useState<Problem[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
    const [showReviewModal, setShowReviewModal] = useState(false)

    // Form State
    const [newProblem, setNewProblem] = useState({
        title: '',
        difficulty: 'Medium',
        pattern: '',
        link: '',
        mastery_level: 1,
        notes: ''
    })

    useEffect(() => {
        fetchDueProblems()
    }, [])

    const fetchDueProblems = async () => {
        try {
            const response = await axios.get('http://localhost:8000/leetcode/due')
            setProblems(response.data)
        } catch (error) {
            console.error("Failed to fetch problems", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteProblem = async (problemId: number) => {
        if (!window.confirm('Are you sure you want to delete this problem?')) return

        try {
            await axios.delete(`http://localhost:8000/leetcode/${problemId}`)
            fetchDueProblems()
        } catch (error) {
            console.error("Failed to delete problem", error)
            alert("Failed to delete problem")
        }
    }

    const handleAddProblem = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await axios.post('http://localhost:8000/leetcode/log', newProblem)
            setShowAddForm(false)
            setNewProblem({
                title: '',
                difficulty: 'Medium',
                pattern: '',
                link: '',
                mastery_level: 1,
                notes: ''
            })
            fetchDueProblems() // Refresh list
        } catch (error) {
            console.error("Failed to add problem", error)
        }
    }

    const handleLogReview = async (problemId: number, rating: number) => {
        try {
            await axios.post(`http://localhost:8000/leetcode/${problemId}/review-log`, {
                quality_rating: rating
            })
            // Remove from list or update
            fetchDueProblems()
        } catch (error) {
            console.error("Failed to log review", error)
        }
    }

    const getDifficultyColor = (diff: string) => {
        switch (diff.toLowerCase()) {
            case 'easy': return 'text-green-400 bg-green-400/10 border-green-400/20'
            case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
            case 'hard': return 'text-red-400 bg-red-400/10 border-red-400/20'
            default: return 'text-gray-400 bg-gray-400/10'
        }
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#242424] p-6 rounded-2xl border border-white/10 shadow-lg">
                <div className="flex items-center space-x-4">
                    <div className="bg-[#933DC9]/20 p-3 rounded-xl">
                        <Brain className="w-8 h-8 text-[#933DC9]" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#FBFAEE]">The Dojo</h2>
                        <p className="text-[#FBFAEE]/60">Master algorithms with Spaced Repetition</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#933DC9] hover:bg-[#A35AD4] text-white rounded-xl font-medium transition shadow-lg shadow-[#933DC9]/20"
                >
                    <Plus className="w-5 h-5" />
                    <span>Log Problem</span>
                </button>
            </div>

            {/* Add Problem Form */}
            {showAddForm && (
                <div className="bg-[#242424] p-6 rounded-2xl border border-white/10 animate-in slide-in-from-top duration-300">
                    <form onSubmit={handleAddProblem} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Problem Title (e.g. Two Sum)"
                                value={newProblem.title}
                                onChange={e => setNewProblem({ ...newProblem, title: e.target.value })}
                                className="bg-[#1a1a1a] text-[#FBFAEE] px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-[#933DC9] outline-none"
                                required
                            />
                            <select
                                value={newProblem.difficulty}
                                onChange={e => setNewProblem({ ...newProblem, difficulty: e.target.value })}
                                className="bg-[#1a1a1a] text-[#FBFAEE] px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-[#933DC9] outline-none"
                            >
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Hard</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Pattern (e.g. Sliding Window)"
                                value={newProblem.pattern}
                                onChange={e => setNewProblem({ ...newProblem, pattern: e.target.value })}
                                className="bg-[#1a1a1a] text-[#FBFAEE] px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-[#933DC9] outline-none"
                            />
                            <input
                                type="url"
                                placeholder="LeetCode Link"
                                value={newProblem.link}
                                onChange={e => setNewProblem({ ...newProblem, link: e.target.value })}
                                className="bg-[#1a1a1a] text-[#FBFAEE] px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-[#933DC9] outline-none"
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-4 py-2 text-[#FBFAEE]/60 hover:text-[#FBFAEE]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-[#933DC9] hover:bg-[#A35AD4] text-white rounded-xl font-medium"
                            >
                                Save to SRS
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Due for Review */}
            <div className="flex-1 bg-[#242424] rounded-2xl border border-white/10 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#FBFAEE] flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-orange-400" />
                        Due for Review Today
                    </h3>
                    <span className="bg-white/10 text-[#FBFAEE]/60 px-3 py-1 rounded-full text-sm">
                        {problems.length} problems
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {problems.length === 0 ? (
                        <div className="text-center py-12 text-[#FBFAEE]/30">
                            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>All caught up! No reviews due right now.</p>
                        </div>
                    ) : (
                        problems.map(problem => (
                            <div key={problem.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 hover:border-white/20 transition group">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center space-x-3 mb-1">
                                            <h4 className="text-lg font-medium text-[#FBFAEE]">{problem.title}</h4>
                                            <span className={`text-xs px-2 py-0.5 rounded border ${getDifficultyColor(problem.difficulty)}`}>
                                                {problem.difficulty}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm text-[#FBFAEE]/50">
                                            <span>{problem.pattern}</span>
                                            <span>•</span>
                                            <span>Level {problem.mastery_level}/5</span>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition">
                                        <a
                                            href={problem.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[#FBFAEE]/70 hover:text-[#FBFAEE]"
                                            title="Open in LeetCode"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                        <button
                                            onClick={() => {
                                                setSelectedProblem(problem)
                                                setShowReviewModal(true)
                                            }}
                                            className="p-2 bg-[#933DC9]/10 hover:bg-[#933DC9]/20 rounded-lg text-[#933DC9]"
                                            title="AI Code Review"
                                        >
                                            <Code className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProblem(problem.id)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400"
                                            title="Delete Problem"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* SRS Controls */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <span className="text-xs text-[#FBFAEE]/40">How did it go?</span>
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleLogReview(problem.id, 1)} className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg border border-red-500/20">Forgot</button>
                                        <button onClick={() => handleLogReview(problem.id, 3)} className="px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs rounded-lg border border-yellow-500/20">Hard</button>
                                        <button onClick={() => handleLogReview(problem.id, 5)} className="px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs rounded-lg border border-green-500/20">Easy</button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <CodeReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                problemTitle={selectedProblem?.title || ''}
            />
        </div>
    )
}
