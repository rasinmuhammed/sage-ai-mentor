'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Bell, X, AlertTriangle, Clock } from 'lucide-react'

const API_URL = 'http://localhost:8000'

interface ReminderData {
  needs_reminder: boolean
  type?: 'urgent' | 'gentle'
  message?: string
  commitment?: string
  checkin_id?: number
  reason?: string
  check_back_at?: string
}

interface NotificationBannerProps {
  githubUsername: string
  onReviewClick: () => void
}

export default function NotificationBanner({ 
  githubUsername, 
  onReviewClick 
}: NotificationBannerProps) {
  const [reminder, setReminder] = useState<ReminderData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkReminder()
    
    // Check every 5 minutes
    const interval = setInterval(checkReminder, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [githubUsername])

  const checkReminder = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/commitments/${githubUsername}/reminder-needed`
      )
      
      if (response.data.needs_reminder && !dismissed) {
        setReminder(response.data)
        
        // Request browser notification permission
        if (Notification.permission === 'default') {
          Notification.requestPermission()
        }
        
        // Show browser notification if permitted
        if (Notification.permission === 'granted') {
          new Notification('Sage Reminder', {
            body: response.data.message,
            icon: '/sage-icon.png', // Add your icon
            badge: '/sage-badge.png',
            tag: 'commitment-reminder',
            requireInteraction: response.data.type === 'urgent'
          })
        }
      } else {
        setReminder(null)
      }
      
      setChecking(false)
    } catch (error) {
      console.error('Failed to check reminder:', error)
      setChecking(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setReminder(null)
    
    // Re-enable after 1 hour
    setTimeout(() => {
      setDismissed(false)
      checkReminder()
    }, 60 * 60 * 1000)
  }

  if (!reminder?.needs_reminder || dismissed) {
    return null
  }

  const isUrgent = reminder.type === 'urgent'

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in slide-in-from-top duration-500 ${
      isUrgent ? 'animate-bounce' : ''
    }`}>
      <div className={`bg-gradient-to-r ${
        isUrgent 
          ? 'from-red-600 to-orange-600' 
          : 'from-yellow-600 to-orange-600'
      } rounded-2xl shadow-2xl border-2 ${
        isUrgent ? 'border-red-400' : 'border-yellow-400'
      }`}>
        <div className="p-4">
          <div className="flex items-start space-x-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              {isUrgent ? (
                <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
              ) : (
                <Bell className="w-8 h-8 text-white" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white mb-1">
                {reminder.message}
              </h3>
              {reminder.commitment && (
                <p className="text-white/90 text-sm mb-3 line-clamp-2">
                  Your commitment: "{reminder.commitment}"
                </p>
              )}
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={onReviewClick}
                  className="bg-white text-orange-600 px-6 py-2 rounded-xl font-semibold hover:bg-gray-100 transition shadow-lg"
                >
                  Review Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-white/80 hover:text-white text-sm font-medium"
                >
                  Remind me later
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-white/60 hover:text-white transition p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Bar for Urgency */}
        {isUrgent && (
          <div className="h-1 bg-white/20 overflow-hidden">
            <div className="h-full bg-white animate-pulse w-full"></div>
          </div>
        )}
      </div>
    </div>
  )
}