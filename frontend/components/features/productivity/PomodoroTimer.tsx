// frontend/components/PomodoroTimer.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Play, Pause, RotateCcw, X, CheckCircle, Clock, 
  Coffee, Target, TrendingUp, Zap, Volume2, VolumeX,
  Flame, Award, BarChart3, AlertCircle
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PomodoroTimerProps {
  githubUsername: string
  todayCommitment?: string
  checkinId?: number
}

type SessionType = 'work' | 'short_break' | 'long_break'

const SESSION_DURATIONS = {
  work: 25,
  short_break: 5,
  long_break: 15
}

export default function PomodoroTimer({ 
  githubUsername, 
  todayCommitment,
  checkinId 
}: PomodoroTimerProps) {
  // Timer state
  const [sessionType, setSessionType] = useState<SessionType>('work')
  const [minutes, setMinutes] = useState(SESSION_DURATIONS.work)
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  
  // Session tracking
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [interruptions, setInterruptions] = useState(0)
  
  // UI state
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [focusRating, setFocusRating] = useState(3)
  const [sessionNotes, setSessionNotes] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [stats, setStats] = useState<any>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Load stats on mount
  useEffect(() => {
    loadStats()
    checkActiveSession()
  }, [githubUsername])
  
  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer complete
            handleTimerComplete()
          } else {
            setMinutes(minutes - 1)
            setSeconds(59)
          }
        } else {
          setSeconds(seconds - 1)
        }
      }, 1000)
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, isPaused, minutes, seconds])
  
  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/pomodoro/${githubUsername}/stats?days=7`)
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }
  
  const checkActiveSession = async () => {
    try {
      const response = await axios.get(`${API_URL}/pomodoro/${githubUsername}/active`)
      if (response.data.has_active_session) {
        const session = response.data.session
        setSessionId(session.id)
        setSessionType(session.session_type)
        
        // Calculate remaining time
        const elapsed = Math.floor((new Date().getTime() - new Date(session.started_at).getTime()) / 1000 / 60)
        const remaining = session.duration_minutes - elapsed
        
        if (remaining > 0) {
          setMinutes(Math.floor(remaining))
          setSeconds(Math.floor((remaining - Math.floor(remaining)) * 60))
          if (!session.paused_at) {
            setIsRunning(true)
          } else {
            setIsPaused(true)
          }
        }
      }
    } catch (error) {
      console.error('Failed to check active session:', error)
    }
  }
  
  const startSession = async () => {
    try {
      const response = await axios.post(`${API_URL}/pomodoro/${githubUsername}/start`, {
        session_type: sessionType,
        duration_minutes: SESSION_DURATIONS[sessionType],
        checkin_id: checkinId,
        commitment_description: todayCommitment
      })
      
      setSessionId(response.data.session.id)
      setIsRunning(true)
      setIsPaused(false)
      setMinutes(SESSION_DURATIONS[sessionType])
      setSeconds(0)
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }
  
  const pauseSession = async () => {
    if (!sessionId) return
    
    try {
      await axios.patch(`${API_URL}/pomodoro/${githubUsername}/${sessionId}/pause`)
      setIsPaused(true)
      setIsRunning(false)
    } catch (error) {
      console.error('Failed to pause session:', error)
    }
  }
  
  const resumeSession = async () => {
    if (!sessionId) return
    
    try {
      await axios.patch(`${API_URL}/pomodoro/${githubUsername}/${sessionId}/resume`)
      setIsPaused(false)
      setIsRunning(true)
    } catch (error) {
      console.error('Failed to resume session:', error)
    }
  }
  
  const handleTimerComplete = () => {
    setIsRunning(false)
    playSound()
    setShowCompleteModal(true)
    
    if (sessionType === 'work') {
      setCompletedPomodoros(prev => prev + 1)
    }
  }
  
  const completeSession = async () => {
    if (!sessionId) return
    
    try {
      await axios.patch(`${API_URL}/pomodoro/${githubUsername}/${sessionId}/complete`, {
        completed: true,
        focus_rating: focusRating,
        notes: sessionNotes,
        interruptions: interruptions
      })
      
      setShowCompleteModal(false)
      setSessionId(null)
      setFocusRating(3)
      setSessionNotes('')
      setInterruptions(0)
      
      // Auto-start break
      if (sessionType === 'work') {
        const nextSession: SessionType = completedPomodoros > 0 && completedPomodoros % 4 === 0 
          ? 'long_break' 
          : 'short_break'
        setSessionType(nextSession)
        setMinutes(SESSION_DURATIONS[nextSession])
        setSeconds(0)
      } else {
        setSessionType('work')
        setMinutes(SESSION_DURATIONS.work)
        setSeconds(0)
      }
      
      loadStats()
    } catch (error) {
      console.error('Failed to complete session:', error)
    }
  }
  
  const resetTimer = () => {
    setIsRunning(false)
    setIsPaused(false)
    setMinutes(SESSION_DURATIONS[sessionType])
    setSeconds(0)
    setSessionId(null)
  }
  
  const playSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e))
    }
  }
  
  const formatTime = (min: number, sec: number) => {
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  
  const getSessionIcon = (type: SessionType) => {
    switch (type) {
      case 'work': return <Target className="w-5 h-5" />
      case 'short_break': return <Coffee className="w-5 h-5" />
      case 'long_break': return <Coffee className="w-5 h-5" />
    }
  }
  
  const getSessionColor = (type: SessionType) => {
    switch (type) {
      case 'work': return 'from-[#933DC9] to-[#53118F]'
      case 'short_break': return 'from-green-600 to-emerald-500'
      case 'long_break': return 'from-blue-600 to-cyan-500'
    }
  }
  
  const progress = ((SESSION_DURATIONS[sessionType] * 60 - (minutes * 60 + seconds)) / (SESSION_DURATIONS[sessionType] * 60)) * 100
  
  return (
    <div className="space-y-4">
      {/* Main Timer Card */}
      <div className={`bg-gradient-to-br ${getSessionColor(sessionType)} rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FBFAEE_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="relative z-10">
          {/* Session Type Selector */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-xl p-1">
              {(['work', 'short_break', 'long_break'] as SessionType[]).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    if (!isRunning) {
                      setSessionType(type)
                      setMinutes(SESSION_DURATIONS[type])
                      setSeconds(0)
                    }
                  }}
                  disabled={isRunning}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    sessionType === type
                      ? 'bg-white text-gray-900'
                      : 'hover:bg-white/10 text-white/80'
                  } disabled:opacity-50`}
                >
                  {getSessionIcon(type)}
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          {/* Commitment Display */}
          {todayCommitment && (
            <div className="mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <p className="text-sm text-white/80 mb-1">Today's Commitment:</p>
              <p className="text-white font-medium italic">"{todayCommitment}"</p>
            </div>
          )}
          
          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="text-8xl font-bold tracking-tight mb-4">
              {formatTime(minutes, seconds)}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden mb-4">
              <div
                className="h-full bg-white transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <p className="text-white/80 text-lg">
              {isRunning ? 'Stay focused!' : isPaused ? 'Paused' : 'Ready to start?'}
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            {!isRunning && !isPaused && (
              <button
                onClick={startSession}
                className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform flex items-center space-x-2 shadow-lg"
              >
                <Play className="w-6 h-6" />
                <span>Start</span>
              </button>
            )}
            
            {isRunning && !isPaused && (
              <button
                onClick={pauseSession}
                className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform flex items-center space-x-2 shadow-lg"
              >
                <Pause className="w-6 h-6" />
                <span>Pause</span>
              </button>
            )}
            
            {isPaused && (
              <button
                onClick={resumeSession}
                className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform flex items-center space-x-2 shadow-lg"
              >
                <Play className="w-6 h-6" />
                <span>Resume</span>
              </button>
            )}
            
            {(isRunning || isPaused) && (
              <>
                <button
                  onClick={resetTimer}
                  className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-xl font-bold hover:bg-white/30 transition flex items-center space-x-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Reset</span>
                </button>
                
                <button
                  onClick={() => setInterruptions(prev => prev + 1)}
                  className="bg-red-500/30 backdrop-blur-sm px-6 py-4 rounded-xl font-bold hover:bg-red-500/40 transition flex items-center space-x-2"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span>+Interruption ({interruptions})</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#242424] border border-[#242424]/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#C488F8] mb-1">{completedPomodoros}</div>
            <div className="text-xs text-[#FBFAEE]/70">Today</div>
          </div>
          <div className="bg-[#242424] border border-[#242424]/50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Flame className="w-5 h-5 text-orange-400" />
              <div className="text-3xl font-bold text-orange-400">{stats.current_streak}</div>
            </div>
            <div className="text-xs text-[#FBFAEE]/70">Day Streak</div>
          </div>
          <div className="bg-[#242424] border border-[#242424]/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400 mb-1">
              {Math.floor(stats.total_work_minutes / 60)}h
            </div>
            <div className="text-xs text-[#FBFAEE]/70">This Week</div>
          </div>
          <div className="bg-[#242424] border border-[#242424]/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#FBFAEE] mb-1">
              {stats.completion_rate.toFixed(0)}%
            </div>
            <div className="text-xs text-[#FBFAEE]/70">Completion</div>
          </div>
        </div>
      )}
      
      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#242424] border border-[#242424]/60 rounded-3xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#FBFAEE] mb-2">
                {sessionType === 'work' ? 'Pomodoro Complete!' : 'Break Over!'}
              </h2>
              <p className="text-[#FBFAEE]/70">
                {sessionType === 'work' ? 'Great focus! How did it go?' : 'Ready to get back to work?'}
              </p>
            </div>
            
            {sessionType === 'work' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-2">
                    Focus Rating (1-5)
                  </label>
                  <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => setFocusRating(rating)}
                        className={`w-12 h-12 rounded-lg font-bold transition ${
                          focusRating >= rating
                            ? 'bg-gradient-to-r from-[#933DC9] to-[#53118F] text-white'
                            : 'bg-[#000000]/40 text-[#FBFAEE]/60 hover:bg-[#000000]/60'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#FBFAEE]/80 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={sessionNotes}
                    onChange={e => setSessionNotes(e.target.value)}
                    placeholder="What did you accomplish?"
                    className="w-full px-4 py-3 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] placeholder-[#FBFAEE]/50 rounded-xl resize-none"
                    rows={3}
                  />
                </div>
              </>
            )}
            
            <button
              onClick={completeSession}
              className="w-full bg-gradient-to-r from-[#933DC9] to-[#53118F] text-white py-3 rounded-xl font-semibold hover:brightness-110 transition"
            >
              Continue
            </button>
          </div>
        </div>
      )}
      
      {/* Hidden audio element */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
    </div>
  )
}