import { SignUp } from '@clerk/nextjs'
import { Brain, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Benefits */}
        <div className="hidden lg:block">
          <Link href="/" className="flex items-center space-x-3 mb-8">
            <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Reflog
            </span>
          </Link>

          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Stop Making Excuses.
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Start Shipping.
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-8">
            Join developers who are finally shipping their projects instead of collecting tutorials.
          </p>

          <div className="space-y-4">
            {[
              'Multi-agent AI that debates to give you balanced advice',
              'GitHub integration that spots your procrastination patterns',
              'Daily accountability that actually works',
              'Brutally honest feedback - no sugar-coating'
            ].map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl">
            {/* Brand Change: Sage -> Reflog in testimonial */}
            <p className="text-gray-300 italic">
              "Finally, an AI that doesn't just validate my excuses. Reflog called out my tutorial hell and I actually shipped my project."
            </p>
            <p className="text-sm text-gray-500 mt-2">— Alex Chen, Full-stack Developer</p>
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className="w-full">
          {/* Mobile Logo - Brand Change: Sage -> Reflog */}
          <Link href="/" className="flex lg:hidden items-center justify-center space-x-3 mb-8">
            <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Reflog
            </span>
          </Link>

          {/* Welcome Text */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Create Your Account</h2>
            <p className="text-gray-400">Start your 14-day free trial. No credit card required.</p>
          </div>

          {/* Clerk Sign Up Component */}
          <div className="flex justify-center lg:justify-start">
            <SignUp
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
                  identityPreviewEditButton: "text-blue-400",
                  formFieldSuccessText: "text-green-400"
                }
              }}
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
            />
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center lg:text-left">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-gray-600">
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
              Free 14-day trial
            </span>
            <span>•</span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
              No credit card required
            </span>
            <span>•</span>
            <span className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
              Cancel anytime
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}