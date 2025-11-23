import React from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {

        const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"

        const variants = {
            primary: "bg-[#933DC9] hover:bg-[#7E34AB] text-white shadow-lg shadow-[#933DC9]/25 border border-transparent",
            secondary: "bg-white/10 hover:bg-white/20 text-[#FBFAEE] border border-white/10",
            ghost: "hover:bg-white/5 text-[#FBFAEE]/60 hover:text-[#FBFAEE]",
            glass: "glass-button text-[#FBFAEE]",
            danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
        }

        const sizes = {
            sm: "px-3 py-1.5 text-xs",
            md: "px-4 py-2 text-sm",
            lg: "px-6 py-3 text-base"
        }

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                {children}
                {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
            </button>
        )
    }
)

Button.displayName = "Button"
