'use client'

import React from 'react'; // Import React for useEffect and useState if needed later
import { Brain, Github, Target, TrendingUp, Zap, Shield, Users, ArrowRight, CheckCircle, MessageCircle, BookOpen, Calendar } from 'lucide-react';
import { SignInButton, SignUpButton } from '@clerk/nextjs';

export default function LandingPage() {
  // --- Updated Features with "AI Mentor" Vibe ---
  const features = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "30-Day Action Plans",
      description: "Stop spinning your wheels. Get a structured, AI-generated roadmap to master any skill in 30 days."
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "The Dojo: LeetCode SRS",
      description: "Master algorithms with Spaced Repetition. Never forget how to invert a binary tree again."
    },
    {
      icon: <Github className="w-6 h-6" />,
      title: "Commitment Tracking",
      description: "Log daily goals and review outcomes. Reflog holds you accountable, no excuses accepted."
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Break Your Bad Cycles",
      description: "Identifies cycles of procrastination, 'tutorial hell', and perfectionism blocking your path to mastery."
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Unfiltered AI Dialogue",
      description: "Ask tough questions. Get brutally honest, data-driven feedback designed for real growth."
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Life Decision Log",
      description: "Chronicle key decisions, analyze outcomes with your AI mentor, and build a playbook of lasting wisdom."
    }
  ];

  // Testimonials are already great, no changes needed
  const testimonials = [
    {
      quote: "Reflog doesn't coddle you. It pointed out my pattern of abandoning projects right before launch. Finally shipped!",
      author: "Alex Chen",
      role: "Full-stack Developer"
    },
    {
      quote: "Seeing the AI agents debate my situation gave me perspectives I hadn't considered. Truly insightful.",
      author: "Sarah Kim",
      role: "Software Engineer @ TechCorp"
    },
    {
      quote: "The daily check-ins combined with GitHub analysis are powerful. Reflog keeps me focused on what matters: shipping.",
      author: "Marcus Johnson",
      role: "Indie SaaS Founder"
    }
  ];

  return (
    // Main background: Black
    <div className="min-h-screen bg-[#000000] text-[#FBFAEE]">

      {/* Hero Section */}
      <div className="relative overflow-hidden isolate">
        {/* Modern Background Effect */}
        <svg
          viewBox="0 0 1024 1024"
          className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
          aria-hidden="true"
        >
          <circle cx={512} cy={512} r={512} fill="url(#gradient-hero)" fillOpacity="0.4" />
          <defs>
            <radialGradient id="gradient-hero">
              <stop stopColor="#933DC9" /> {/* Dark Orchid */}
              <stop offset={1} stopColor="#53118F" /> {/* American Violet */}
            </radialGradient>
          </defs>
        </svg>

        {/* Navigation */}
        <nav className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-2 rounded-lg shadow-md">
                <Brain className="w-6 h-6 text-[#FBFAEE]" />
              </div>
              <span className="text-2xl font-bold text-[#FBFAEE]">
                Reflog
              </span>
            </div>
            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              <SignInButton mode="modal">
                <button className="text-[#FBFAEE]/80 hover:text-[#FBFAEE] transition px-4 py-1.5 rounded-md text-sm font-medium hover:bg-[#242424]/50">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-5 py-1.5 rounded-md hover:brightness-110 transition shadow-md text-sm font-semibold">
                  Get Started Free
                </button>
              </SignUpButton>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Tagline Badge --- Changed --- */}
            <div className="inline-flex items-center space-x-2 bg-[#933DC9]/10 border border-[#933DC9]/30 rounded-full px-4 py-1.5 mb-6 text-sm">
              <Zap className="w-4 h-4 text-[#C488F8]" /> {/* Lighter Orchid */}
              <span className="font-medium text-[#C488F8]">AI Mentorship Driven by Your Data</span>
            </div>

            {/* Main Headline --- Changed --- */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-[#C488F8] to-[#933DC9] bg-clip-text text-transparent"> {/* Lighter Orchid to Orchid */}
                Stop Guessing.
              </span>
              <br />
              <span className="text-[#FBFAEE]">Start Growing.</span>
            </h1>

            {/* Sub-headline --- Changed --- */}
            <p className="text-lg lg:text-xl text-[#FBFAEE]/80 mb-10 max-w-3xl mx-auto leading-relaxed">
              Reflog is your personal AI mentor. It analyzes your Git history and daily progress to give the brutally honest, data-driven feedback you need to master your craft.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <SignUpButton mode="modal">
                <button className="group w-full sm:w-auto bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-7 py-3 rounded-lg text-base font-semibold hover:brightness-110 transition-all shadow-lg hover:shadow-[#933DC9]/40 flex items-center justify-center">
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </SignUpButton>
            </div>

            {/* Trust Badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#FBFAEE]/60">
              <div className="flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                14-day free trial
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                Connect GitHub securely
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12 lg:mb-16">
          {/* --- Changed --- */}
          <h2 className="text-3xl lg:text-4xl font-bold text-[#FBFAEE] mb-3">
            A Mentor That Understands Your Code
          </h2>
          <p className="text-lg text-[#FBFAEE]/70 max-w-2xl mx-auto">
            Reflog digs into *your* data to provide guidance you won't get anywhere else.
          </p>
        </div>

        {/* Features Grid (Uses the updated 'features' array from above) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-[#242424] border border-[#242424]/50 rounded-xl p-6 transition-all duration-300 hover:border-[#933DC9]/50 hover:shadow-lg hover:shadow-[#933DC9]/10 group"
            >
              {/* Feature Icon */}
              <div className="bg-gradient-to-br from-[#933DC9]/20 to-[#53118F]/20 w-10 h-10 rounded-lg flex items-center justify-center mb-4 border border-[#933DC9]/30 group-hover:scale-105 transition-transform duration-300">
                <div className="text-[#C488F8]"> {/* Lighter Orchid Icon */}
                  {React.cloneElement(feature.icon, { className: "w-5 h-5" })}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#FBFAEE] mb-2">{feature.title}</h3>
              <p className="text-sm text-[#FBFAEE]/70 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section - Simplified */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12 lg:mb-16">
          {/* --- Changed --- */}
          <h2 className="text-3xl lg:text-4xl font-bold text-[#FBFAEE] mb-3">
            Your Journey to Mastery
          </h2>
          <p className="text-lg text-[#FBFAEE]/70 max-w-xl mx-auto">
            Connect, reflect, commit, and ship. Your AI mentor guides you through the process.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          {[
            { step: "1", title: "Connect GitHub", description: "Securely link your account for analysis." },
            { step: "2", title: "Receive Guidance", description: "Understand AI-driven feedback on your patterns." }, // Changed
            { step: "3", title: "Set Daily Goals", description: "Commit to specific, shippable tasks." },
            { step: "4", title: "Track & Iterate", description: "Review outcomes, log decisions, repeat." }
          ].map((item) => (
            <div key={item.step} className="bg-[#242424]/50 border border-[#242424]/60 rounded-lg p-5">
              <div className="bg-gradient-to-r from-[#933DC9] to-[#53118F] w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-[#FBFAEE] font-bold text-lg shadow-md">
                {item.step}
              </div>
              <h3 className="text-base font-semibold text-[#FBFAEE] mb-1">{item.title}</h3>
              <p className="text-xs text-[#FBFAEE]/70">{item.description}</p>
            </div>
          ))}
        </div>
      </div>


      {/* Testimonials Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12 lg:mb-16">
          {/* --- Changed --- */}
          <h2 className="text-3xl lg:text-4xl font-bold text-[#FBFAEE] mb-3">
            Don't Just Take Our Word For It
          </h2>
          <p className="text-lg text-[#FBFAEE]/70 max-w-2xl mx-auto">
            Real feedback from developers building better habits with their AI mentor.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-[#242424] border border-[#242424]/50 rounded-xl p-6 transition-all hover:border-[#933DC9]/40 flex flex-col"
            >
              <blockquote className="text-[#FBFAEE]/80 mb-4 leading-relaxed italic text-sm flex-grow">
                "{testimonial.quote.replace('Sage', 'Reflog')}" {/* Replace name in quote */}
              </blockquote>
              <div className="mt-auto pt-4 border-t border-[#242424]/40">
                <p className="text-[#FBFAEE] font-semibold text-sm">{testimonial.author}</p>
                <p className="text-[#FBFAEE]/60 text-xs">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FBFAEE_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="relative z-10">
            {/* --- Changed --- */}
            <h2 className="text-3xl lg:text-4xl font-bold text-[#FBFAEE] mb-3">
              Ready to Meet Your Mentor?
            </h2>
            <p className="text-base lg:text-lg text-[#FBFAEE]/80 mb-8 max-w-xl mx-auto">
              Start your free trial. Connect GitHub, get your first analysis, and begin your journey to mastery.
            </p>
            <SignUpButton mode="modal">
              <button className="bg-[#FBFAEE] text-[#53118F] px-8 py-3 rounded-lg text-base font-bold hover:bg-[#FBFAEE]/90 transition shadow-lg transform hover:scale-105 duration-200">
                Start Free Trial Now
              </button>
            </SignUpButton>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-[#242424]/50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Footer Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-1.5 rounded-md">
              <Brain className="w-4 h-4 text-[#FBFAEE]" />
            </div>
            <span className="text-lg font-semibold text-[#FBFAEE]">Reflog</span>
          </div>
          {/* Copyright - You already had "AI Mentor" here, which is perfect! */}
          <div className="text-[#FBFAEE]/60 text-xs text-center sm:text-right">
            © {new Date().getFullYear()} Reflog AI Mentor. Reflect. Improve. Ship.
          </div>
        </div>
      </footer>
    </div>
  );
}