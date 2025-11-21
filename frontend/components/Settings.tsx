'use client'

import { useState, useEffect } from 'react'
import { Save, Database, Key, AlertTriangle, Check, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SettingsProps {
    githubUsername: string
}

export default function Settings({ githubUsername }: SettingsProps) {
    const [groqKey, setGroqKey] = useState('')
    const [dbUrl, setDbUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [showGroqGuide, setShowGroqGuide] = useState(false)
    const [showNeonGuide, setShowNeonGuide] = useState(false)

    useEffect(() => {
        // Load Groq key from local storage
        const savedKey = localStorage.getItem('groq_api_key')
        if (savedKey) setGroqKey(savedKey)
    }, [])

    const handleSaveGroq = () => {
        if (!groqKey.trim()) {
            localStorage.removeItem('groq_api_key')
            setMessage({ type: 'success', text: 'Groq API Key removed.' })
            return
        }
        localStorage.setItem('groq_api_key', groqKey.trim())
        setMessage({ type: 'success', text: 'Groq API Key saved locally.' })
        setTimeout(() => setMessage(null), 3000)
    }

    const handleSaveDb = async () => {
        if (!dbUrl.trim().startsWith('postgresql://') && !dbUrl.trim().startsWith('postgres://')) {
            setMessage({ type: 'error', text: 'Invalid Database URL. Must start with postgresql://' })
            return
        }

        setLoading(true)
        try {
            // Use the setup-database endpoint for immediate validation and initialization
            await axios.post(`${API_URL}/users/${githubUsername}/setup-database`, { database_url: dbUrl })
            setMessage({ type: 'success', text: 'Database connected & initialized successfully! You are ready to go.' })
            setDbUrl('')
        } catch (err: any) {
            console.error(err)
            const errorMsg = err.response?.data?.detail || 'Failed to connect to database.'
            setMessage({ type: 'error', text: errorMsg })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-[#FBFAEE] mb-2">Settings</h2>
                <p className="text-[#FBFAEE]/60">Configure your own AI models and database connection.</p>
            </div>

            {/* Groq Configuration */}
            <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-6">
                <div className="flex items-start space-x-4">
                    <div className="p-3 bg-[#933DC9]/20 rounded-xl">
                        <Key className="w-6 h-6 text-[#C488F8]" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold text-[#FBFAEE] mb-2">Groq API Key</h3>
                        <p className="text-sm text-[#FBFAEE]/60 mb-4">
                            Bring your own LLM. Your key is stored locally in your browser and sent securely with each request.
                        </p>

                        <div className="flex space-x-3 mb-4">
                            <input
                                type="password"
                                value={groqKey}
                                onChange={(e) => setGroqKey(e.target.value)}
                                placeholder="gsk_..."
                                className="flex-1 px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-xl focus:ring-2 focus:ring-[#933DC9] focus:border-transparent"
                            />
                            <button
                                onClick={handleSaveGroq}
                                className="px-6 py-2.5 bg-[#933DC9] text-[#FBFAEE] rounded-xl font-semibold hover:bg-[#7E34AB] transition flex items-center"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save
                            </button>
                        </div>

                        {/* Groq Guide Accordion */}
                        <div className="border border-[#242424]/60 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowGroqGuide(!showGroqGuide)}
                                className="w-full px-4 py-3 bg-[#000000]/20 flex items-center justify-between text-sm text-[#FBFAEE]/70 hover:text-[#FBFAEE] transition"
                            >
                                <span>How to get a Groq API Key</span>
                                {showGroqGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {showGroqGuide && (
                                <div className="p-4 bg-[#000000]/40 text-sm text-[#FBFAEE]/60 space-y-2">
                                    <p>1. Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-[#C488F8] hover:underline inline-flex items-center">Groq Console <ExternalLink className="w-3 h-3 ml-1" /></a>.</p>
                                    <p>2. Sign up or log in.</p>
                                    <p>3. Click "Create API Key".</p>
                                    <p>4. Copy the key (starts with <code>gsk_</code>) and paste it above.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Database Configuration */}
            <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl p-6">
                <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                        <Database className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold text-[#FBFAEE] mb-2">Neon Database URL</h3>
                        <p className="text-sm text-[#FBFAEE]/60 mb-4">
                            Connect to your own Neon PostgreSQL database.
                        </p>

                        <div className="flex space-x-3 mb-4">
                            <input
                                type="password"
                                value={dbUrl}
                                onChange={(e) => setDbUrl(e.target.value)}
                                placeholder="postgresql://user:pass@ep-xyz.neon.tech/neondb..."
                                className="flex-1 px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleSaveDb}
                                disabled={loading}
                                className="px-6 py-2.5 bg-blue-600 text-[#FBFAEE] rounded-xl font-semibold hover:bg-blue-700 transition flex items-center disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Update
                            </button>
                        </div>

                        {/* Neon Guide Accordion */}
                        <div className="border border-[#242424]/60 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowNeonGuide(!showNeonGuide)}
                                className="w-full px-4 py-3 bg-[#000000]/20 flex items-center justify-between text-sm text-[#FBFAEE]/70 hover:text-[#FBFAEE] transition"
                            >
                                <span>How to get a Neon Database URL</span>
                                {showNeonGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {showNeonGuide && (
                                <div className="p-4 bg-[#000000]/40 text-sm text-[#FBFAEE]/60 space-y-2">
                                    <p>1. Go to <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center">Neon.tech <ExternalLink className="w-3 h-3 ml-1" /></a>.</p>
                                    <p>2. Sign up and create a new project.</p>
                                    <p>3. In the Dashboard, look for "Connection Details".</p>
                                    <p>4. Copy the "Connection String" (starts with <code>postgresql://</code>).</p>
                                    <p>5. Paste it above and click Update.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                    {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span>{message.text}</span>
                </div>
            )}
        </div>
    )
}
