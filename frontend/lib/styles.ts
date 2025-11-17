/**
 * Centralized Tailwind class utilities
 * Use these instead of hardcoding class strings
 */

export const tw = {
  // Inputs
  input: (size: 'sm' | 'md' = 'md') => 
    `px-${size === 'sm' ? '3' : '4'} py-${size === 'sm' ? '1.5' : '2.5'} bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE] placeholder-[#FBFAEE]/50 rounded-lg focus:ring-2 focus:ring-[#933DC9] transition`,
  
  // Buttons
  btnPrimary: "bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] hover:brightness-110 disabled:opacity-50",
  btnSecondary: "bg-[#000000]/40 text-[#FBFAEE]/60 border border-[#242424]/60 hover:bg-[#000000]/60",
  btnBase: "font-semibold transition px-6 py-2.5 rounded-xl",
  
  // Cards
  card: "bg-[#242424] border border-[#242424]/50 rounded-2xl",
  cardPrimary: "bg-gradient-to-br from-[#933DC9] to-[#53118F]",
  
  // Text
  textPrimary: "text-[#FBFAEE]",
  textSecondary: "text-[#FBFAEE]/70",
  textMuted: "text-[#FBFAEE]/50",
  
  // Badges
  badge: "px-3 py-1 bg-[#933DC9]/20 text-[#C488F8] border border-[#933DC9]/40 rounded-full text-xs font-medium",
  
  // Containers
  container: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8",
  
  // Animations
  fadeIn: "animate-in fade-in duration-300",
  slideIn: "animate-in slide-in-from-bottom duration-300"
}