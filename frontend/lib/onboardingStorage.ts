export interface OnboardingProgress {
  hasSeenWalkthrough: boolean
  hasSeenTutorial: boolean
  hasCompletedFirstCheckin: boolean
  hasCreatedFirstGoal: boolean
  hasUsedChat: boolean
  completedAt: string | null
}

const STORAGE_KEY = 'reflog_onboarding_progress'

export function getOnboardingProgress(): OnboardingProgress {
  if (typeof window === 'undefined') {
    return getDefaultProgress()
  }
  
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return getDefaultProgress()
  }
  
  try {
    return JSON.parse(stored)
  } catch {
    return getDefaultProgress()
  }
}

export function updateOnboardingProgress(updates: Partial<OnboardingProgress>) {
  if (typeof window === 'undefined') return
  
  const current = getOnboardingProgress()
  const updated = { ...current, ...updates }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function markOnboardingComplete() {
  updateOnboardingProgress({
    completedAt: new Date().toISOString()
  })
}

export function shouldShowOnboarding(): boolean {
  const progress = getOnboardingProgress()
  return !progress.completedAt
}

function getDefaultProgress(): OnboardingProgress {
  return {
    hasSeenWalkthrough: false,
    hasSeenTutorial: false,
    hasCompletedFirstCheckin: false,
    hasCreatedFirstGoal: false,
    hasUsedChat: false,
    completedAt: null
  }
}