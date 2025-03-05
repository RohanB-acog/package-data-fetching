import type React from "react"
import { FetcherRegistry } from "../core/FetcherRegistry"

export interface WithServerFetchingOptions {
  defaultItemsPerPage?: number
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
}

export function withServerFetching<T, P extends { data?: T[] }>(
  WrappedComponent: React.ComponentType<P>,
  componentId: string,
  options: WithServerFetchingOptions = {},
) {
  // Use a more descriptive component name for better debugging
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component"

  const {
    defaultItemsPerPage = 10,
    loadingComponent = <div>Loading data...</div>,
    errorComponent = (error: string) => <div>Error: {error}</div>,
  } = options

  async function ServerComponent(props: Omit<P, "data">) {
    console.log(`Server-side fetching for: ${componentId}`)

    try {
      const registry = FetcherRegistry.getInstance()
      const fetcher = registry.getFetcher(componentId)

      if (!fetcher) {
        throw new Error(`No fetcher registered for component: ${componentId}`)
      }

      // Set pagination for server-side (default values)
      fetcher.setPagination(1, defaultItemsPerPage, true)

      // Fetch data from the server
      const result = await fetcher.fetchData(true)

      // Add pagination props to the wrapped component
      const enhancedProps = {
        ...(props as P),
        data: result.data,
        pagination: {
          currentPage: 1,
          totalPages: result.totalPages || Math.ceil(result.data.length / defaultItemsPerPage),
          totalItems: result.totalItems || result.data.length,
          itemsPerPage: defaultItemsPerPage,
        },
      }

      return <WrappedComponent {...enhancedProps} />
    } catch (error: any) {
      console.error("Server fetching error:", error)
      return (
        <>
          {typeof errorComponent === "function"
            ? errorComponent(error.message || "Unknown error occurred")
            : errorComponent}
        </>
      )
    }
  }

  // Set a display name for better debugging
  ServerComponent.displayName = `withServerFetching(${displayName})`

  return ServerComponent
}

