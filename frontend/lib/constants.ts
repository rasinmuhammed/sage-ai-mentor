export const COLORS = {
  primary: {
    DEFAULT: '#933DC9',
    dark: '#53118F',
    light: '#C488F8',
  },
  surface: {
    DEFAULT: '#242424',
    dark: '#000000',
  },
  text: {
    DEFAULT: '#FBFAEE',
  },
  semantic: {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  }
}

export const TAILWIND_CLASSES = {
  input: "px-4 py-2.5 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] placeholder-[#FBFAEE]/50 rounded-lg focus:ring-2 focus:ring-[#933DC9] focus:border-transparent transition",
  button: {
    primary: "bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-2.5 rounded-xl font-semibold hover:brightness-110 transition disabled:opacity-50",
    secondary: "bg-[#000000]/40 text-[#FBFAEE]/60 border border-[#242424]/60 px-6 py-2.5 rounded-xl hover:bg-[#000000]/60 transition",
    ghost: "text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition-colors"
  },
  card: "bg-[#242424] border border-[#242424]/50 rounded-2xl p-6",
  badge: "px-3 py-1 bg-[#933DC9]/20 text-[#C488F8] border border-[#933DC9]/40 rounded-full text-xs font-medium"
}

export const COMMITMENT_TEMPLATES = [
  { text: "Ship a bug fix", color: "from-red-600 to-orange-600" },
  { text: "Build a feature", color: "from-blue-600 to-cyan-600" },
  { text: "Refactor code", color: "from-purple-600 to-pink-600" },
  { text: "Write docs", color: "from-green-600 to-emerald-600" }
]

export const MOOD_OPTIONS = [
  { value: "energized", emoji: "⚡", label: "Energized" },
  { value: "focused", emoji: "🎯", label: "Focused" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "scattered", emoji: "🌪️", label: "Scattered" },
  { value: "overwhelmed", emoji: "😰", label: "Overwhelmed" }
]

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'