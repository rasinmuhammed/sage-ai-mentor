
'use client'

import { useState } from 'react'
import { 
  Calendar, Target, MessageCircle, CheckCircle, 
  ArrowRight, X
} from 'lucide-react'

// Tutorial Steps for First-Time Users
const TUTORIAL_STEPS = [
  {
    target: "checkin",
    title: "Start Your First Check-in",
    description: "Click here to set your daily commitment. Be specific about what you'll ship today.",
    position: "bottom"
  },
  {
    target: "chat",
    title: "Ask Your AI Mentor",
    description: "Have questions? Chat with your AI council for honest, data-driven advice.",
    position: "left"
  },
  {
    target: "goals",
    title: "Set Your Goals",
    description: "Create goals with AI-powered planning and track your progress.",
    position: "right"
  }
]

// Example questions for chat demo
const EXAMPLE_QUESTIONS = [
  "Should I focus on depth or breadth in learning?",
  "How do I know if I'm actually improving?",
  "What should I prioritize this week?"
]

interface InteractiveTutorialProps {
  onComplete: () => void
}

export default function InteractiveTutorial({ onComplete }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#FBFAEE] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full animate-in fade-in duration-500">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#FBFAEE] mb-3">
            Interactive Tutorial
          </h2>
          <p className="text-[#FBFAEE]/70">
            Let's walk through the key features together
          </p>
        </div>

        {/* Mock Dashboard with Tutorial Overlays */}
        <div className="relative bg-[#242424] border border-[#242424]/50 rounded-3xl shadow-2xl p-8">
          {/* Tutorial Step Overlay */}
          <div className="absolute top-4 right-4 z-20 bg-[#933DC9] text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </div>

          {/* Mock Dashboard Elements */}
          <div className="space-y-6">
            {/* Check-in Button */}
            <div className="relative">
              <button
                id="checkin"
                className={`w-full bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] p-6 rounded-2xl hover:brightness-110 transition-all shadow-lg ${
                  currentStep === 0 ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-[#242424]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Calendar className="w-8 h-8" />
                    <div className="text-left">
                      <div className="text-xl font-bold">Daily Check-in</div>
                      <div className="text-sm text-[#FBFAEE]/90">Set today's commitment</div>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6" />
                </div>
              </button>
              
              {currentStep === 0 && (
                <div className="absolute -bottom-24 left-0 right-0 bg-yellow-900/90 border border-yellow-500/50 rounded-xl p-4 z-10 animate-in slide-in-from-top duration-300">
                  <h4 className="font-bold text-yellow-200 mb-1">
                    {TUTORIAL_STEPS[0].title}
                  </h4>
                  <p className="text-sm text-yellow-100/90">
                    {TUTORIAL_STEPS[0].description}
                  </p>
                </div>
              )}
            </div>

            {/* Chat and Goals Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Chat Card */}
              <div className="relative">
                <div
                  id="chat"
                  className={`bg-[#000000]/40 border border-[#242424]/50 p-6 rounded-2xl hover:border-[#933DC9]/40 transition cursor-pointer ${
                    currentStep === 1 ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-[#242424]' : ''
                  }`}
                >
                  <MessageCircle className="w-8 h-8 text-[#C488F8] mb-3" />
                  <h3 className="text-lg font-bold text-[#FBFAEE] mb-2">Chat with AI</h3>
                  <p className="text-sm text-[#FBFAEE]/70">Get instant advice</p>
                </div>
                
                {currentStep === 1 && (
                  <div className="absolute -bottom-24 left-0 right-0 bg-yellow-900/90 border border-yellow-500/50 rounded-xl p-4 z-10 animate-in slide-in-from-top duration-300">
                    <h4 className="font-bold text-yellow-200 mb-1">
                      {TUTORIAL_STEPS[1].title}
                    </h4>
                    <p className="text-sm text-yellow-100/90">
                      {TUTORIAL_STEPS[1].description}
                    </p>
                  </div>
                )}
              </div>

              {/* Goals Card */}
              <div className="relative">
                <div
                  id="goals"
                  className={`bg-[#000000]/40 border border-[#242424]/50 p-6 rounded-2xl hover:border-[#933DC9]/40 transition cursor-pointer ${
                    currentStep === 2 ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-[#242424]' : ''
                  }`}
                >
                  <Target className="w-8 h-8 text-[#C488F8] mb-3" />
                  <h3 className="text-lg font-bold text-[#FBFAEE] mb-2">Your Goals</h3>
                  <p className="text-sm text-[#FBFAEE]/70">Track progress</p>
                </div>
                
                {currentStep === 2 && (
                  <div className="absolute -bottom-24 left-0 right-0 bg-yellow-900/90 border border-yellow-500/50 rounded-xl p-4 z-10 animate-in slide-in-from-top duration-300">
                    <h4 className="font-bold text-yellow-200 mb-1">
                      {TUTORIAL_STEPS[2].title}
                    </h4>
                    <p className="text-sm text-yellow-100/90">
                      {TUTORIAL_STEPS[2].description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Example Questions (only show on chat step) */}
            {currentStep === 1 && (
              <div className="bg-gradient-to-br from-[#933DC9]/15 to-[#53118F]/15 border border-[#933DC9]/30 rounded-2xl p-6 animate-in fade-in duration-300">
                <h4 className="text-lg font-semibold text-[#C488F8] mb-3 flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Try asking:
                </h4>
                <div className="space-y-2">
                  {EXAMPLE_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left p-3 bg-[#000000]/40 hover:bg-[#000000]/60 border border-[#242424]/40 hover:border-[#933DC9]/40 rounded-lg text-sm text-[#FBFAEE]/80 hover:text-[#FBFAEE] transition group"
                    >
                      <span className="flex items-center justify-between">
                        <span>"{question}"</span>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tutorial Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#242424]/50">
            <button
              onClick={handleSkip}
              className="text-sm text-[#FBFAEE]/60 hover:text-[#FBFAEE]/80 transition"
            >
              Skip tutorial
            </button>

            <div className="flex items-center space-x-3">
              <span className="text-sm text-[#FBFAEE]/60">
                {currentStep + 1} of {TUTORIAL_STEPS.length}
              </span>
              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition-all shadow-lg group"
              >
                {currentStep === TUTORIAL_STEPS.length - 1 ? (
                  <>
                    Start Using Reflog
                    <CheckCircle className="inline-block w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="inline-block w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}