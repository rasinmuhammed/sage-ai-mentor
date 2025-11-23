'use client'

import { useState } from 'react'
import { BookOpen, Code, Youtube, Plus } from 'lucide-react'
import ActionPlans from '../action-plans/ActionPlans'
import Dojo from '../dojo/Dojo'
import VideoPlayer from './VideoPlayer'

interface LearningHubProps {
    githubUsername: string
}

type LearningTab = 'curriculum' | 'library' | 'dojo'

export default function LearningHub({ githubUsername }: LearningHubProps) {
    const [activeTab, setActiveTab] = useState<LearningTab>('curriculum')
    const [videoUrl, setVideoUrl] = useState('')

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-[#FBFAEE]">Learning Hub</h2>
                    <p className="text-[#FBFAEE]/60">Manage your curriculum, resources, and practice.</p>
                </div>

                <div className="flex bg-[#242424] p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveTab('curriculum')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${activeTab === 'curriculum'
                            ? 'bg-[#933DC9] text-white shadow-lg'
                            : 'text-[#FBFAEE]/60 hover:text-[#FBFAEE] hover:bg-white/5'
                            }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        <span>Curriculum</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('library')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${activeTab === 'library'
                            ? 'bg-[#933DC9] text-white shadow-lg'
                            : 'text-[#FBFAEE]/60 hover:text-[#FBFAEE] hover:bg-white/5'
                            }`}
                    >
                        <Youtube className="w-4 h-4" />
                        <span>Library</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('dojo')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${activeTab === 'dojo'
                            ? 'bg-[#933DC9] text-white shadow-lg'
                            : 'text-[#FBFAEE]/60 hover:text-[#FBFAEE] hover:bg-white/5'
                            }`}
                    >
                        <Code className="w-4 h-4" />
                        <span>Dojo</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'curriculum' && (
                    <ActionPlans githubUsername={githubUsername} />
                )}

                {activeTab === 'library' && (
                    <div className="h-full overflow-y-auto space-y-6">
                        <div className="bg-[#242424] p-6 rounded-2xl border border-white/10">
                            <h3 className="text-xl font-semibold text-[#FBFAEE] mb-4 flex items-center">
                                <Youtube className="w-6 h-6 text-red-500 mr-2" />
                                Video Learning
                            </h3>
                            <div className="flex space-x-4 mb-6">
                                <input
                                    type="text"
                                    placeholder="Paste YouTube URL to learn..."
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="flex-1 bg-[#1a1a1a] text-[#FBFAEE] px-4 py-3 rounded-xl border border-white/10 focus:ring-2 focus:ring-[#933DC9] outline-none"
                                />
                            </div>

                            {videoUrl && (
                                <VideoPlayer
                                    url={videoUrl}
                                    onProgress={() => { }}
                                />
                            )}

                            {!videoUrl && (
                                <div className="text-center py-12 text-[#FBFAEE]/30 border-2 border-dashed border-white/5 rounded-xl">
                                    <Youtube className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>Paste a link to start watching and taking notes</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'dojo' && (
                    <Dojo githubUsername={githubUsername} />
                )}
            </div>
        </div>
    )
}
