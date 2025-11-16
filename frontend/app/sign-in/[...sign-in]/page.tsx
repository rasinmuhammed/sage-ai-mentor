import { SignIn } from '@clerk/nextjs'
import { Brain } from 'lucide-react'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo - Brand Change: Sage -> Reflog */}
        <Link href="/" className="flex items-center justify-center space-x-3 mb-8">
          <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Reflog
          </span>
        </Link>

        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to continue your journey</p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 shadow-2xl",
                headerTitle: "text-white",
                headerSubtitle: "text-gray-400",
                socialButtonsBlockButton: "bg-gray-800 border-gray-700 text-white hover:bg-gray-700",
                socialButtonsBlockButtonText: "text-white",
                formButtonPrimary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white",
                formFieldInput: "bg-gray-800 border-gray-700 text-white placeholder-gray-500",
                formFieldLabel: "text-gray-300",
                footerActionLink: "text-blue-400 hover:text-blue-300",
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-blue-400"
              }
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
          />
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Don't have an account?{' '}
            <Link href="/sign-up" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-gray-600">
          <span>🔒 Secure</span>
          <span>•</span>
          <span>⚡ Fast</span>
          <span>•</span>
          <span>🎯 No BS</span>
        </div>
      </div>
    </div>
  )
}