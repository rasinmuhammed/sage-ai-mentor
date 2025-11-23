'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Bell, Check, Trash2, Filter, Loader2, AlertCircle, RefreshCw, Target, BookOpen, Calendar, Zap, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import MarkdownRenderer from '../../shared/MarkdownRenderer'

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

interface NotificationsProps {
  githubUsername: string
}

export default function Notifications({ githubUsername }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterRead, setFilterRead] = useState<string>('all')
  const [stats, setStats] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    loadNotifications()
  }, [githubUsername])

  useEffect(() => {
    applyFilters()
  }, [notifications, filterType, filterRead])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const [notificationsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/notifications/${githubUsername}?limit=100`),
        axios.get(`${API_URL}/notifications/${githubUsername}/stats`)
      ])
      
      setNotifications(notificationsRes.data)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...notifications]
    
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.notification_type === filterType)
    }
    
    if (filterRead === 'unread') {
      filtered = filtered.filter(n => !n.read)
    } else if (filterRead === 'read') {
      filtered = filtered.filter(n => n.read)
    }
    
    setFilteredNotifications(filtered)
  }

  const markAsRead = async (notificationId: number) => {
    try {
      await axios.patch(`${API_URL}/notifications/${githubUsername}/${notificationId}/read`)
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API_URL}/notifications/${githubUsername}/mark-all-read`)
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      loadNotifications() // Refresh stats
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: number) => {
    try {
      await axios.delete(`${API_URL}/notifications/${githubUsername}/${notificationId}`)
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  const getNotificationIcon = (type: string) => {
    const icons = {
      commitment_reminder: <Calendar className="w-5 h-5" />,
      goal_milestone: <Target className="w-5 h-5" />,
      decision_reflection: <BookOpen className="w-5 h-5" />,
      pattern_alert: <AlertCircle className="w-5 h-5" />,
      achievement: <Zap className="w-5 h-5" />
    }
    return icons[type as keyof typeof icons] || <Bell className="w-5 h-5" />
  }

  const getIconColor = (type: string) => {
    const colors = {
      commitment_reminder: 'text-orange-400',
      goal_milestone: 'text-[#C488F8]',
      decision_reflection: 'text-blue-400',
      pattern_alert: 'text-yellow-400',
      achievement: 'text-green-400'
    }
    return colors[type as keyof typeof colors] || 'text-[#FBFAEE]/70'
  }

  const getPriorityBadge = (priority: string) => {
    if (priority === 'urgent') {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/40 text-red-300 border border-red-500/40">Urgent</span>
    }
    if (priority === 'high') {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-900/40 text-orange-300 border border-orange-500/40">High</span>
    }
    return null
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (loading && !stats) {
    return (
      <div className="text-center py-16 text-[#FBFAEE]/70">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#933DC9]" />
        <p>Loading notifications...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-[#FBFAEE]">
      {/* Header & Stats */}
      <div className="bg-[#242424] border border-[#242424]/50 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-[#933DC9] to-[#53118F] p-4 rounded-2xl shadow-lg mr-4">
              <Bell className="w-8 h-8 text-[#FBFAEE]" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-[#FBFAEE]">Notifications</h2>
              <p className="text-[#FBFAEE]/70">Stay updated with your progress and reminders</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {stats?.unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] rounded-lg font-semibold hover:brightness-110 transition text-sm"
              >
                <Check className="w-4 h-4" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={loadNotifications}
              className="p-2 bg-[#000000]/40 hover:bg-[#000000]/60 rounded-lg transition border border-[#242424]/50"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-[#FBFAEE]/70" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#000000]/40 rounded-xl p-4 border border-[#242424]/40">
              <div className="text-3xl font-bold text-[#C488F8] mb-1">{stats.total}</div>
              <div className="text-xs text-[#FBFAEE]/70">Total</div>
            </div>
            <div className="bg-[#000000]/40 rounded-xl p-4 border border-[#242424]/40">
              <div className="text-3xl font-bold text-orange-400 mb-1">{stats.unread}</div>
              <div className="text-xs text-[#FBFAEE]/70">Unread</div>
            </div>
            <div className="bg-[#000000]/40 rounded-xl p-4 border border-[#242424]/40">
              <div className="text-3xl font-bold text-[#FBFAEE] mb-1">{stats.recent_count}</div>
              <div className="text-xs text-[#FBFAEE]/70">Last 24h</div>
            </div>
            <div className="bg-[#000000]/40 rounded-xl p-4 border border-[#242424]/40">
              <div className="text-3xl font-bold text-green-400 mb-1">
                {Object.keys(stats.by_type || {}).length}
              </div>
              <div className="text-xs text-[#FBFAEE]/70">Types</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#242424]/50 pt-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-[#FBFAEE]/60" />
            <span className="text-sm text-[#FBFAEE]/70 font-medium">Filters:</span>
          </div>
          
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE]/90 rounded-lg text-sm focus:ring-2 focus:ring-[#933DC9] appearance-none"
          >
            <option value="all">All Types</option>
            <option value="commitment_reminder">Commitments</option>
            <option value="goal_milestone">Goals</option>
            <option value="decision_reflection">Decisions</option>
            <option value="pattern_alert">Patterns</option>
            <option value="achievement">Achievements</option>
          </select>

          {/* Read Status Filter */}
          <select
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value)}
            className="px-4 py-2 bg-[#000000]/50 border border-[#242424]/60 text-[#FBFAEE]/90 rounded-lg text-sm focus:ring-2 focus:ring-[#933DC9] appearance-none"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          <div className="ml-auto text-sm text-[#FBFAEE]/60">
            Showing {filteredNotifications.length} of {notifications.length}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-[#242424] border border-[#242424]/50 rounded-2xl">
            <Bell className="w-16 h-16 mx-auto mb-4 text-[#FBFAEE]/30" />
            <h3 className="text-xl font-semibold text-[#FBFAEE]/90 mb-2">No notifications</h3>
            <p className="text-[#FBFAEE]/60">
              {filterType !== 'all' || filterRead !== 'all'
                ? 'Try adjusting your filters'
                : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`bg-[#242424] border rounded-2xl p-5 transition-all cursor-pointer ${
                !notification.read
                  ? 'border-[#933DC9]/50 shadow-lg hover:shadow-xl'
                  : 'border-[#242424]/50 hover:border-[#242424]/80'
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className={`${getIconColor(notification.notification_type)} flex-shrink-0`}>
                  {getNotificationIcon(notification.notification_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`text-lg font-semibold ${!notification.read ? 'text-[#FBFAEE]' : 'text-[#FBFAEE]/80'}`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center space-x-2 ml-4">
                      {getPriorityBadge(notification.priority)}
                      {!notification.read && (
                        <span className="w-2 h-2 bg-[#933DC9] rounded-full animate-pulse"></span>
                      )}
                    </div>
                  </div>
                  <p className="text-[#FBFAEE]/70 text-sm mb-3">{notification.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#FBFAEE]/50">
                      {formatDateTime(notification.created_at)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[#FBFAEE]/50 capitalize">
                        {notification.notification_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        markAsRead(notification.id)
                      }}
                      className="p-2 text-[#FBFAEE]/60 hover:text-[#FBFAEE] hover:bg-[#000000]/30 rounded-lg transition"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notification.id)
                    }}
                    className="p-2 text-[#FBFAEE]/60 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}