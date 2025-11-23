import React from 'react'
import { Search } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', leftIcon, rightIcon, error, ...props }, ref) => {
        return (
            <div className="w-full">
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FBFAEE]/40">
                            {leftIcon}
                        </div>
                    )}

                    <input
                        ref={ref}
                        className={`
              w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[#FBFAEE] 
              placeholder:text-[#FBFAEE]/30 focus:outline-none focus:ring-2 focus:ring-[#933DC9]/50 focus:border-[#933DC9]/50
              transition-all duration-200
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-red-500/50 focus:ring-red-500/50' : ''}
              ${className}
            `}
                        {...props}
                    />

                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FBFAEE]/40">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1 text-xs text-red-400">{error}</p>
                )}
            </div>
        )
    }
)

Input.displayName = "Input"
