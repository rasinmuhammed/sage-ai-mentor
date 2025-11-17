import axios, { AxiosError } from 'axios'
import { useState, useCallback } from 'react'
import { toast } from '@/components/ErrorBoundary'

export function useApi<T>(
  url: string,
  options?: any
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get<T>(url, options)
      setData(response.data)
      return response.data
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to fetch data'
      setError(message)
      toast.error('Error', message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [url, options])

  return { data, loading, error, fetch }
}

export function useApiMutation<T>(url: string, method: 'post' | 'patch' | 'put' = 'post') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (payload?: any) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios[method]<T>(url, payload)
      toast.success('Success', 'Operation completed')
      return response.data
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Operation failed'
      setError(message)
      toast.error('Error', message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [url, method])

  return { mutate, loading, error }
}