import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { toast } from '@/components/ErrorBoundary'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Request Interceptor
api.interceptors.request.use((config) => {
  // Add Auth Token if using Clerk manually or generic tokens
  // const token = localStorage.getItem('auth_token')
  // if (token) config.headers.Authorization = `Bearer ${token}`

  // Add Groq API Key from localStorage
  if (typeof window !== 'undefined') {
    const groqKey = localStorage.getItem('groq_api_key')
    if (groqKey) {
      config.headers['X-Groq-Key'] = groqKey
    }
  }
  return config
})

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const message = error.response?.data?.detail || 'An error occurred'
    toast.error('Error', message)
    return Promise.reject(error)
  }
)

export const apiService = {
  // Generic helpers
  get: async <T>(url: string, params?: any, useCache = false) => {
    if (useCache) {
      const key = `${url}-${JSON.stringify(params)}`
      const cached = cache.get(key)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) return { data: cached.data }
    }
    const res = await api.get<T>(url, { params })
    if (useCache) cache.set(`${url}-${JSON.stringify(params)}`, { data: res.data, timestamp: Date.now() })
    return res
  },

  post: <T>(url: string, data?: any) => api.post<T>(url, data),
  patch: <T>(url: string, data?: any) => api.patch<T>(url, data),
  delete: <T>(url: string) => api.delete<T>(url),

  // Domain specific
  goals: {
    list: (username: string, status?: string) =>
      api.get(`/goals/${username}`, { params: { status } }),
    dashboard: (username: string) =>
      api.get(`/goals/${username}/dashboard`),
    create: (username: string, data: any) =>
      api.post(`/goals/${username}`, data),
    logProgress: (username: string, goalId: number, data: any) =>
      api.post(`/goals/${username}/${goalId}/progress`, data),
  },

  commitments: {
    today: (username: string) => api.get(`/commitments/${username}/today`),
    stats: (username: string, days = 30) => api.get(`/commitments/${username}/stats?days=${days}`),
  },

  user: {
    dashboard: (username: string) => api.get(`/dashboard/${username}`),
  }
}

export default api