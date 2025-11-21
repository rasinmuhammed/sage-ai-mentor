import { useState, useEffect, useCallback, useRef } from 'react'
import { apiService } from '@/lib/api'

interface QueryOptions<T> {
  queryKey: string
  queryFn: () => Promise<{ data: T }>
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
}

export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
  refetchInterval,
  staleTime = 5 * 60 * 1000 // 5 minutes default
}: QueryOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const lastFetchTime = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async (force = false) => {
    // Check if data is stale
    const now = Date.now()
    if (!force && data && (now - lastFetchTime.current) < staleTime) {
      return // Data is fresh, skip fetch
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await queryFn()
      setData(result.data)
      lastFetchTime.current = now
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [queryFn, staleTime, data])

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [enabled, fetchData])

  // Set up refetch interval
  useEffect(() => {
    if (enabled && refetchInterval) {
      intervalRef.current = setInterval(() => {
        fetchData()
      }, refetchInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [enabled, refetchInterval, fetchData])

  const refetch = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch
  }
}