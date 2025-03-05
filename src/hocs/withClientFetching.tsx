"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { FetcherRegistry } from "../core/FetcherRegistry"
import type { DataSourceType } from "../core/BaseFetcher"
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates"

export interface WithClientFetchingOptions {
  dataSource?: DataSourceType
  enableRealtime?: boolean
  defaultItemsPerPage?: number
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
}

export function withClientFetching<T, P extends { data?: T[] }>(
  WrappedComponent: React.ComponentType<P>,
  componentId: string,
  options: WithClientFetchingOptions = {},
) {
  // Use a more descriptive component name for better debugging
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component"

  const {
    dataSource = "json",
    enableRealtime = false,
    defaultItemsPerPage = 10,
    loadingComponent = <div>Loading data...</div>,
    errorComponent = (error: string, retry: () => void) => (
      <div className="error-container p-4 border border-red-300 rounded-md bg-red-50">
        <div className="text-red-500 mb-2">Error: {error}</div>
        <button onClick={retry} className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm">
          Retry
        </button>
      </div>
    ),
  } = options

  function ClientComponent(props: Omit<P, "data">) {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState<number>(0)
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [itemsPerPage, setItemsPerPage] = useState<number>(defaultItemsPerPage)
    const [totalItems, setTotalItems] = useState<number | undefined>(undefined)
    const [totalPages, setTotalPages] = useState<number | undefined>(undefined)

    // Use a ref to store the fetcher instance
    const fetcherRef = useRef<any>(null)

    // Add a cache key to prevent unnecessary refetches
    const cacheKey = `client_${componentId}_${dataSource}_page${currentPage}_limit${itemsPerPage}`

    // Subscribe to realtime updates if enabled
    useRealtimeUpdates(componentId, () => {
      // Invalidate cache and refetch data
      if (fetcherRef.current) {
        fetcherRef.current.invalidateCache()
      }
      setRetryCount((prev) => prev + 1)
    })

    // Function to handle retry
    const handleRetry = useCallback(() => {
      setLoading(true)
      setError(null)
      setRetryCount((prev) => prev + 1)
    }, [])

    // Function to handle page change
    const handlePageChange = useCallback((page: number) => {
      setCurrentPage(page)
    }, [])

    // Function to handle items per page change
    const handleItemsPerPageChange = useCallback((items: number) => {
      setItemsPerPage(items)
      setCurrentPage(1) // Reset to first page when changing items per page
    }, [])

    // Fetch data with pagination
    useEffect(() => {
      let isMounted = true

      const fetchData = async () => {
        if (!isMounted) return

        setLoading(true)
        setError(null)

        try {
          const registry = FetcherRegistry.getInstance()
          const fetcher = registry.getFetcher(componentId)

          if (!fetcher) {
            throw new Error(`No fetcher registered for component: ${componentId}`)
          }

          // Store fetcher in ref for later use
          fetcherRef.current = fetcher

          // Set pagination options
          fetcher.setPagination(currentPage, itemsPerPage, true)

          console.log(`Client-side fetching for: ${componentId} (page ${currentPage}, limit ${itemsPerPage})`)
          // Fetch data from the client
          const result = await fetcher.fetchData(false)

          if (isMounted) {
            if (result.data.length === 0 && currentPage > 1) {
              // If we got no data and we're not on the first page, go back to first page
              setCurrentPage(1)
            } else {
              setData(result.data)

              // Update pagination info if available
              if (result.totalItems !== undefined) {
                setTotalItems(result.totalItems)
              }
              if (result.totalPages !== undefined) {
                setTotalPages(result.totalPages)
              } else if (result.totalItems !== undefined) {
                // Calculate total pages if not provided
                setTotalPages(Math.ceil(result.totalItems / itemsPerPage))
              }

              if (result.data.length === 0) {
                setError("No data available. The API might be rate limited.")
              }
            }
          }
        } catch (err: any) {
          if (isMounted) {
            console.error("Client fetching error:", err)
            let errorMessage = err.message || "Unknown error occurred"

            // Provide more user-friendly error messages
            if (errorMessage.includes("Too Many Requests") || errorMessage.includes("429")) {
              errorMessage = "The API is rate limited. Please try again later."
            } else if (errorMessage.includes("Failed to fetch")) {
              errorMessage = "Network error. Please check your connection."
            }

            setError(errorMessage)
          }
        } finally {
          if (isMounted) {
            setLoading(false)
          }
        }
      }

      fetchData()

      // Cleanup function to prevent state updates after unmount
      return () => {
        isMounted = false
      }
    }, [componentId, currentPage, itemsPerPage])

    // Render loading state
    if (loading) {
      return <>{loadingComponent}</>
    }

    // Render error state
    if (error) {
      return <>{typeof errorComponent === "function" ? errorComponent(error, handleRetry) : errorComponent}</>
    }

    // Add pagination props to the wrapped component
    const enhancedProps = {
      ...(props as P),
      data,
      pagination: {
        currentPage,
        totalPages: totalPages || Math.ceil(data.length / itemsPerPage),
        totalItems: totalItems || data.length,
        itemsPerPage,
        onPageChange: handlePageChange,
        onItemsPerPageChange: handleItemsPerPageChange,
      },
    }

    return <WrappedComponent {...enhancedProps} />
  }

  // Set a display name for better debugging
  ClientComponent.displayName = `withClientFetching(${displayName})`

  return ClientComponent
}

