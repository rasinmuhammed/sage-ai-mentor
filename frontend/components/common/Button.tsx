import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: React.ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClass = "font-semibold transition rounded-xl"
  
  const variants = {
    primary: "bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] hover:brightness-110 disabled:opacity-50",
    secondary: "bg-[#000000]/40 text-[#FBFAEE]/60 border border-[#242424]/60 hover:bg-[#000000]/60",
    ghost: "text-[#FBFAEE]/60 hover:text-[#FBFAEE]"
  }
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-2.5",
    lg: "px-8 py-3 text-lg"
  }
  
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseClass} ${variants[variant]} ${sizes[size]}`}
    >
      <span className="flex items-center justify-center gap-2">
        {isLoading && <span className="animate-spin">⏳</span>}
        {icon}
        {children}
      </span>
    </button>
  )
}