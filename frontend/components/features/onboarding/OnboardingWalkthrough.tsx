'use client'

import { useState } from 'react'
import { 
  Calendar, Target, Brain, MessageCircle, CheckCircle, 
  ArrowRight, X, Play
} from 'lucide-react'

// Onboarding Steps Configuration
const ONBOARDING_STEPS = [
  {
    title: "Daily Check-ins",
    description: "Start each day by setting your commitment. Review it in the evening to build accountability.",
    visual: <Calendar className="w-16 h-16" />,
    gradient: "from-blue-500 to-cyan-500",
    cta: "I'll commit daily",
    features: [
      "Set morning commitment",
      "Evening accountability review",
      "Track your success streak"
    ]
  },
  {
    title: "Track Everything",
    description: "Goals, decisions, learning plans - all in one place with AI guidance.",
    visual: <Target className="w-16 h-16" />,
    gradient: "from-[#933DC9] to-[#53118F]",
    cta: "Show me how",
    features: [
      "Set and track goals",
      "Log major decisions",
      "30-day action plans"
    ]
  },
  {
    title: "AI-Powered Insights",
    description: "Get brutally honest feedback on your patterns and progress.",
    visual: <Brain className="w-16 h-16" />,
    gradient: "from-purple-500 to-pink-500",
    cta: "Let's go!",
    features: [
      "Multi-agent AI deliberation",
      "Pattern detection",
      "Personalized recommendations"
    ]
  }
]

interface OnboardingWalkthroughProps {
  onComplete: () => void
}

export default function OnboardingWalkthrough({ onComplete }: OnboardingWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      onComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#FBFAEE] flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#933DC9]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#53118F]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-3xl w-full relative z-10 animate-in fade-in duration-500">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#FBFAEE] mb-3">
            Welcome to Your AI Mentor
          </h2>
          <p className="text-[#FBFAEE]/70">
            Here's how Reflog helps you grow faster
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2 mb-8">
          {ONBOARDING_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'w-8 bg-gradient-to-r from-[#933DC9] to-[#53118F]'
                  : 'w-2 bg-[#242424]'
              }`}
            />
          ))}
        </div>

        {/* Current Step Card */}
        <div className="bg-[#242424] border border-[#242424]/50 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
          {/* Gradient Background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${ONBOARDING_STEPS[currentStep].gradient} opacity-10`}></div>
          
          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br ${ONBOARDING_STEPS[currentStep].gradient} rounded-2xl shadow-lg mb-6`}>
                <div className="text-white">
                  {ONBOARDING_STEPS[currentStep].visual}
                </div>
              </div>
              
              <h3 className="text-3xl font-bold text-[#FBFAEE] mb-3">
                {ONBOARDING_STEPS[currentStep].title}
              </h3>
              <p className="text-lg text-[#FBFAEE]/80 mb-6 max-w-xl mx-auto">
                {ONBOARDING_STEPS[currentStep].description}
              </p>

              {/* Feature List */}
              <div className="space-y-3 mb-8">
                {ONBOARDING_STEPS[currentStep].features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-center space-x-3 text-[#FBFAEE]/80 animate-in fade-in duration-300"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="px-6 py-3 bg-[#000000]/40 text-[#FBFAEE]/80 rounded-xl font-semibold hover:bg-[#000000]/60 transition border border-[#242424]/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Back
              </button>

              <button
                onClick={handleSkip}
                className="text-sm text-[#FBFAEE]/60 hover:text-[#FBFAEE]/80 transition"
              >
                Skip tour →
              </button>

              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition-all shadow-lg group"
              >
                {currentStep === ONBOARDING_STEPS.length - 1 ? (
                  <>
                    Start Tutorial
                    <Play className="inline-block w-5 h-5 ml-2" />
                  </>
                ) : (
                  <>
                    {ONBOARDING_STEPS[currentStep].cta}
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



// ============================================
// USAGE INSTRUCTIONS
// ============================================
/*
1. Add OnboardingWalkthrough and InteractiveTutorial imports to Onboarding.tsx
2. Update Onboarding component to show walkthrough after success step
3. Add FirstTimeTooltip to components that need contextual hints:

Example in CheckInModal.tsx:
import FirstTimeTooltip from './FirstTimeTooltip'

<div className="relative">
  <input ... />
  <FirstTimeTooltip
    id="first_checkin_commitment"
    title="Be Specific"
    description="Don't say 'work on project'. Say 'implement user auth API endpoint by 5pm'."
    position="bottom"
  />
</div>

4. Track progress in Dashboard.tsx:
import { updateOnboardingProgress } from '@/lib/onboardingStorage'

// When user completes first check-in:
updateOnboardingProgress({ hasCompletedFirstCheckin: true })

// When user creates first goal:
updateOnboardingProgress({ hasCreatedFirstGoal: true })

// When user uses chat:
updateOnboardingProgress({ hasUsedChat: true })

5. Show completion celebration when all milestones are hit
*/