'use client'

import { useState } from 'react'
import { X, Sparkles, Loader2, Code } from 'lucide-react'
import axios from 'axios'
import MarkdownRenderer from '../MarkdownRenderer'

interface CodeReviewModalProps {
    isOpen: boolean
    onClose: () => void
    problemTitle: string
}

export default function CodeReviewModal({ isOpen, onClose, problemTitle }: CodeReviewModalProps) {
    const [code, setCode] = useState('')
    const [language, setLanguage] = useState('python')
    const [review, setReview] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleReview = async () => {
        if (!code.trim()) return

        setLoading(true)
        try {
            const groqKey = localStorage.getItem('groq_api_key')
            const response = await axios.post('http://localhost:8000/leetcode/review', {
                code,
                language,
                problem_title: problemTitle
            }, {
                headers: groqKey ? { 'X-Groq-Key': groqKey } : {}
            })

            setReview(response.data.review)
        } catch (error) {
            console.error("Review failed", error)
            setReview("Failed to generate review. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#242424] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="bg-[#933DC9]/20 p-2 rounded-lg">
                            <Code className="w-6 h-6 text-[#933DC9]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#FBFAEE]">AI Code Review</h2>
                            <p className="text-sm text-[#FBFAEE]/60">Get feedback on complexity and style for "{problemTitle}"</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#FBFAEE]/50 hover:text-[#FBFAEE]">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left: Code Input */}
                    <div className="flex-1 flex flex-col border-r border-white/10 min-h-[300px]">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a1a]">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="bg-[#242424] text-[#FBFAEE] border border-white/10 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#933DC9]"
                            >
                                <option value="python">Python</option>
                                <option value="javascript">JavaScript</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                            </select>
                            <button
                                onClick={handleReview}
                                disabled={loading || !code.trim()}
                                className="flex items-center space-x-2 px-4 py-1.5 bg-[#933DC9] hover:bg-[#A35AD4] text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#933DC9]/20"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                <span>Analyze Code</span>
                            </button>
                        </div>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Paste your solution here..."
                            className="flex-1 bg-[#0a0a0a] text-[#FBFAEE] p-4 font-mono text-sm resize-none focus:outline-none"
                            spellCheck={false}
                        />
                    </div>

                    {/* Right: Review Output */}
                    <div className="flex-1 bg-[#242424] overflow-y-auto p-6">
                        {review ? (
                            <div className="prose prose-invert max-w-none">
                                <MarkdownRenderer content={review} />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-[#FBFAEE]/30 space-y-4">
                                <Sparkles className="w-12 h-12 opacity-50" />
                                <p className="text-center max-w-xs">
                                    Paste your code and click "Analyze" to get AI feedback on time complexity and code quality.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
