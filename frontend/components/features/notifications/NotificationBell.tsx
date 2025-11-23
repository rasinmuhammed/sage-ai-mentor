'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Bell, X, Check, Trash2, Loader2, AlertCircle, Target, BookOpen, TrendingUp, Zap, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Notification {
  id: number
  title: string
  message: string
  notification_type: string
  priority: string
  read: boolean
  action_url: string | null
  metadata: any
  created_at: string
  read_at: string | null
}

interface NotificationBellProps {
  githubUsername: string
}

export default function NotificationBell({ githubUsername }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    loadNotifications()
    
    // Poll for new notifications every 2 minutes
    const interval = setInterval(loadNotifications, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [githubUsername])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const loadNotifications = async () => {
    try {
      const [notificationsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/notifications/${githubUsername}?limit=20`),
        axios.get(`${API_URL}/notifications/${githubUsername}/stats`)
      ])
      
      setNotifications(notificationsRes.data)
      setUnreadCount(statsRes.data.unread)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      await axios.patch(`${API_URL}/notifications/${githubUsername}/${notificationId}/read`)
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API_URL}/notifications/${githubUsername}/mark-all-read`)
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      await axios.delete(`${API_URL}/notifications/${githubUsername}/${notificationId}`)
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (!notifications.find(n => n.id === notificationId)?.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    if (notification.action_url) {
      setIsOpen(false)
      router.push(notification.action_url)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'commitment_reminder':
        return <Calendar className="w-5 h-5" />
      case 'goal_milestone':
        return <Target className="w-5 h-5" />
      case 'decision_reflection':
        return <BookOpen className="w-5 h-5" />
      case 'pattern_alert':
        return <AlertCircle className="w-5 h-5" />
      case 'achievement':
        return <Zap className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-900/40 border-red-500/50 hover:bg-red-900/60'
      case 'high':
        return 'bg-orange-900/40 border-orange-500/50 hover:bg-orange-900/60'
      case 'normal':
        return 'bg-[#933DC9]/20 border-[#933DC9]/40 hover:bg-[#933DC9]/30'
      case 'low':
        return 'bg-gray-700/40 border-gray-600/50 hover:bg-gray-700/60'
      default:
        return 'bg-[#242424]/60 border-[#242424]/80 hover:bg-[#242424]/80'
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'commitment_reminder':
        return 'text-orange-400'
      case 'goal_milestone':
        return 'text-[#C488F8]'
      case 'decision_reflection':
        return 'text-blue-400'
      case 'pattern_alert':
        return 'text-yellow-400'
      case 'achievement':
        return 'text-green-400'
      default:
        return 'text-[#FBFAEE]/70'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#FBFAEE]/70 hover:text-[#FBFAEE] hover:bg-[#242424]/50 rounded-xl transition"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-600 to-orange-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[32rem] bg-[#242424] border border-[#242424]/60 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#242424]/60 bg-[#000000]/20">
            <div>
              <h3 className="text-lg font-bold text-[#FBFAEE]">Notifications</h3>
              <p className="text-xs text-[#FBFAEE]/60">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#C488F8] hover:text-[#933DC9] font-medium flex items-center"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[28rem]">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#933DC9]" />
                <p className="text-sm text-[#FBFAEE]/60">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto mb-3 text-[#FBFAEE]/30" />
                <p className="text-sm text-[#FBFAEE]/60">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#242424]/40">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 transition-all cursor-pointer relative border-l-4 ${
                      !notification.read
                        ? 'bg-[#933DC9]/10 border-l-[#933DC9]'
                        : 'bg-transparent border-l-transparent'
                    } hover:bg-[#000000]/30`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className={`${getIconColor(notification.notification_type)} flex-shrink-0 mt-0.5`}>
                        {getNotificationIcon(notification.notification_type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold ${!notification.read ? 'text-[#FBFAEE]' : 'text-[#FBFAEE]/80'} mb-1`}>
                          {notification.title}
                        </h4>
                        <p className="text-xs text-[#FBFAEE]/70 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#FBFAEE]/50">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {notification.priority === 'urgent' && (
                            <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30">
                              Urgent
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => deleteNotification(notification.id, e)}
                        className="flex-shrink-0 text-[#FBFAEE]/40 hover:text-red-400 transition p-1 hover:bg-red-900/20 rounded"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-[#242424]/60 bg-[#000000]/20">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/notifications')
                }}
                className="w-full text-sm text-[#C488F8] hover:text-[#933DC9] font-medium text-center transition"
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}