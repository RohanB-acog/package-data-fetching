import React from "react"
import { FetcherRegistry } from "../core/FetcherRegistry"

export function withServerFetching<T, P extends { data?: T[] }>(
  WrappedComponent: React.ComponentType<P>,
  componentId: string,
) {
  return function WithServerFetching(props: Omit<P, "data">) {
    const [data, setData] = React.useState<T[]>([])
    const [loading, setLoading] = React.useState<boolean>(true)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
      const fetchData = async () => {
        setLoading(true)
        setError(null)

        try {
          // Get the registry instance
          const registry = FetcherRegistry.getInstance()
          
          // Get API base URL from environment (or server URL for absolute path construction)
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
          
          // Set base path directly if available
          if (apiBaseUrl) {
            registry.setApiBasePath('/api/data')
            registry.setBaseUrl(apiBaseUrl)
          }
          
          const fetcher = registry.getFetcher(componentId)

          if (!fetcher) {
            throw new Error(`No fetcher registered for component: ${componentId}`)
          }

          // Explicitly pass server flag to true and the component ID
          const result = await fetcher.fetchData(true, componentId)
          setData(result)
        } catch (err: any) {
          console.error("Server fetching error:", err)
          setError(err.message || "Failed to fetch")
        } finally {
          setLoading(false)
        }
      }

      fetchData()
    }, [componentId])

    if (loading) return <div>Loading data...</div>
    if (error) return <div>Error: {error}</div>

    return <WrappedComponent {...(props as P)} data={data} />
  }
}