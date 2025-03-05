import { FetcherRegistry } from "./FetcherRegistry"
import { realtimeManager, type DataChangeEvent } from "./realtime"

export type DataSourceType = "json" | "csv" | "txt" | "api"

export interface PaginationOptions {
  page: number
  limit: number
  enabled: boolean
}

export interface FetcherOptions {
  dataSource?: DataSourceType
  componentId: string
  endpoint?: string
  pagination?: PaginationOptions
}

export abstract class BaseFetcher<T> {
  protected options: FetcherOptions
  protected baseServerUrl: string =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000"

  // Add a static cache for server-side data
  private static serverCache = new Map<string, any[]>()

  // Add a cache for client-side data
  private clientCache = new Map<
    string,
    {
      data: T[]
      timestamp: number
      totalItems?: number
      totalPages?: number
    }
  >()

  // Cache expiration time in milliseconds (5 minutes)
  private cacheExpirationTime = 5 * 60 * 1000

  // Realtime subscription cleanup function
  private unsubscribe: (() => void) | null = null

  constructor(options: FetcherOptions) {
    this.options = {
      ...options,
      pagination: options.pagination || {
        page: 1,
        limit: 0, // 0 means no pagination
        enabled: false,
      },
    }

    // Subscribe to realtime updates for this component
    this.setupRealtimeSubscription()
  }

  // Set up realtime subscription
  private setupRealtimeSubscription() {
    // Clean up any existing subscription
    if (this.unsubscribe) {
      this.unsubscribe()
    }

    // Subscribe to data changes for this component
    this.unsubscribe = realtimeManager.subscribe(this.options.componentId, this.handleDataChange.bind(this))
  }

  // Handle data change events
  private handleDataChange(event: DataChangeEvent) {
    console.log(`Received data change for ${this.options.componentId}:`, event)

    // Clear cache on any data change
    this.invalidateCache()
  }

  // Invalidate the cache
  public invalidateCache() {
    // Clear client cache for this component
    const cacheKeys = Array.from(this.clientCache.keys())
    for (const key of cacheKeys) {
      if (key.includes(this.options.componentId)) {
        this.clientCache.delete(key)
      }
    }

    // Clear server cache if we're on the server
    if (typeof window === "undefined") {
      const serverCacheKeys = Array.from(BaseFetcher.serverCache.keys())
      for (const key of serverCacheKeys) {
        if (key.includes(this.options.componentId)) {
          BaseFetcher.serverCache.delete(key)
        }
      }
    }
  }

  abstract parseData(data: any): T[]

  private getUrl(isServer: boolean): string {
    const registry = FetcherRegistry.getInstance()

    // If using a specific endpoint (like external API)
    if (this.options.endpoint && this.options.dataSource === "api") {
      return this.options.endpoint
    }

    // Use the registry to get the correct URL format
    let url = registry.getDataUrl(this.options.componentId, this.options.dataSource, isServer)

    // Add pagination parameters if enabled
    if (this.options.pagination?.enabled && this.options.pagination.limit > 0) {
      url += `&page=${this.options.pagination.page}&limit=${this.options.pagination.limit}`
    }

    return url
  }

  async fetchJsonData(isServer: boolean): Promise<{ data: T[]; totalItems?: number; totalPages?: number }> {
    // Generate cache key based on component, data source, and pagination
    const paginationString = this.options.pagination?.enabled
      ? `_page${this.options.pagination.page}_limit${this.options.pagination.limit}`
      : ""
    const cacheKey = `json_${this.options.componentId}${paginationString}`

    // Check server cache first if on server
    if (isServer) {
      if (BaseFetcher.serverCache.has(cacheKey)) {
        console.log(`Using cached data for ${this.options.componentId} from server cache`)
        return { data: BaseFetcher.serverCache.get(cacheKey) as T[] }
      }
    } else {
      // Check client cache if on client
      const cachedData = this.clientCache.get(cacheKey)
      if (cachedData && Date.now() - cachedData.timestamp < this.cacheExpirationTime) {
        console.log(`Using cached data for ${this.options.componentId} from client cache`)
        return {
          data: cachedData.data,
          totalItems: cachedData.totalItems,
          totalPages: cachedData.totalPages,
        }
      }
    }

    const url = this.getUrl(isServer)
    try {
      const response = await fetch(url, {
        // Add cache: 'no-store' to prevent caching issues when switching sources
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`)
      }

      const responseData = await response.json()

      // Handle both simple array responses and paginated responses
      let parsedData: T[]
      let totalItems: number | undefined
      let totalPages: number | undefined

      if (responseData.data && Array.isArray(responseData.data)) {
        // Handle paginated response
        parsedData = this.parseData(responseData.data)
        totalItems = responseData.pagination?.totalItems
        totalPages = responseData.pagination?.totalPages
      } else if (Array.isArray(responseData)) {
        // Handle simple array response
        parsedData = this.parseData(responseData)
      } else {
        // Handle unexpected response format
        console.warn("Unexpected response format:", responseData)
        parsedData = []
      }

      // Cache server-side results
      if (isServer) {
        BaseFetcher.serverCache.set(cacheKey, parsedData)
      } else {
        // Cache client-side results with timestamp
        this.clientCache.set(cacheKey, {
          data: parsedData,
          timestamp: Date.now(),
          totalItems,
          totalPages,
        })
      }

      return { data: parsedData, totalItems, totalPages }
    } catch (error) {
      console.error("Error fetching JSON data:", error)
      throw error
    }
  }

  async fetchCsvData(isServer: boolean): Promise<{ data: T[] }> {
    // Generate cache key
    const cacheKey = `csv_${this.options.componentId}`

    // Check server cache first if on server
    if (isServer) {
      if (BaseFetcher.serverCache.has(cacheKey)) {
        console.log(`Using cached data for ${this.options.componentId} from server cache`)
        return { data: BaseFetcher.serverCache.get(cacheKey) as T[] }
      }
    } else {
      // Check client cache if on client
      const cachedData = this.clientCache.get(cacheKey)
      if (cachedData && Date.now() - cachedData.timestamp < this.cacheExpirationTime) {
        console.log(`Using cached data for ${this.options.componentId} from client cache`)
        return { data: cachedData.data }
      }
    }

    const url = this.getUrl(isServer)
    try {
      const response = await fetch(url, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch CSV data: ${response.statusText}`)
      }

      const text = await response.text()
      const rows = text.split("\n")
      const headers = rows[0].split(",")

      const jsonData = rows
        .slice(1)
        .filter((row) => row.trim() !== "")
        .map((row) => {
          const values = row.split(",")
          return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim()
            return obj
          }, {} as any)
        })

      const parsedData = this.parseData(jsonData)

      // Cache results
      if (isServer) {
        BaseFetcher.serverCache.set(cacheKey, parsedData)
      } else {
        this.clientCache.set(cacheKey, {
          data: parsedData,
          timestamp: Date.now(),
        })
      }

      return { data: parsedData }
    } catch (error) {
      console.error("Error fetching CSV data:", error)
      throw error
    }
  }

  async fetchTxtData(isServer: boolean): Promise<{ data: T[] }> {
    // Generate cache key
    const cacheKey = `txt_${this.options.componentId}`

    // Check cache first
    if (isServer) {
      if (BaseFetcher.serverCache.has(cacheKey)) {
        console.log(`Using cached data for ${this.options.componentId} from server cache`)
        return { data: BaseFetcher.serverCache.get(cacheKey) as T[] }
      }
    } else {
      const cachedData = this.clientCache.get(cacheKey)
      if (cachedData && Date.now() - cachedData.timestamp < this.cacheExpirationTime) {
        console.log(`Using cached data for ${this.options.componentId} from client cache`)
        return { data: cachedData.data }
      }
    }

    const url = this.getUrl(isServer)
    try {
      const response = await fetch(url, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch TXT data: ${response.statusText}`)
      }

      const text = await response.text()
      const lines = text.split("\n")

      // Simple format: assume each line is a JSON object
      const jsonData = lines
        .filter((line) => line.trim() !== "")
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch (e) {
            // Simple key-value format
            const pairs = line.split(",")
            return pairs.reduce((obj, pair) => {
              const [key, value] = pair.split(":").map((s) => s.trim())
              if (key && value) {
                obj[key] = value
              }
              return obj
            }, {} as any)
          }
        })

      const parsedData = this.parseData(jsonData)

      // Cache results
      if (isServer) {
        BaseFetcher.serverCache.set(cacheKey, parsedData)
      } else {
        this.clientCache.set(cacheKey, {
          data: parsedData,
          timestamp: Date.now(),
        })
      }

      return { data: parsedData }
    } catch (error) {
      console.error("Error fetching TXT data:", error)
      throw error
    }
  }

  // Update the fetchApiData method to include retry logic and better error handling
  async fetchApiData(isServer: boolean): Promise<{ data: T[] }> {
    // Generate cache key
    const cacheKey = `api_${this.options.componentId}`

    // Check cache first
    if (isServer) {
      if (BaseFetcher.serverCache.has(cacheKey)) {
        console.log(`Using cached data for ${this.options.componentId} from server cache`)
        return { data: BaseFetcher.serverCache.get(cacheKey) as T[] }
      }
    } else {
      const cachedData = this.clientCache.get(cacheKey)
      if (cachedData && Date.now() - cachedData.timestamp < this.cacheExpirationTime) {
        console.log(`Using cached data for ${this.options.componentId} from client cache`)
        return { data: cachedData.data }
      }
    }

    // For external API calls (like RapidAPI or MockAPI)
    const url = this.options.endpoint || ""

    if (!url || url === "") {
      console.warn(`No endpoint provided for API data source in component ${this.options.componentId}`)
      return { data: [] }
    }

    // Maximum number of retry attempts
    const MAX_RETRIES = 3
    let retries = 0
    let lastError: any = null

    while (retries < MAX_RETRIES) {
      try {
        let headers: Record<string, string> = {}

        // Only add API keys if they're defined
        if (process.env.NEXT_PUBLIC_RAPIDAPI_KEY && process.env.NEXT_PUBLIC_RAPIDAPI_HOST) {
          headers = {
            "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
            "x-rapidapi-host": process.env.NEXT_PUBLIC_RAPIDAPI_HOST,
          }
        }

        console.log(`Fetching API data from ${url}, attempt ${retries + 1}`)

        const response = await fetch(url, {
          headers,
          cache: "no-store",
        })

        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After") || "5"
          const waitTime = Number.parseInt(retryAfter, 10) * 1000 || 2 ** retries * 1000
          console.warn(`Rate limited. Retrying after ${waitTime}ms...`)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
          retries++
          continue
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch API data: ${response.statusText}`)
        }

        const data = await response.json()
        const parsedData = this.parseData(data)

        // Cache results
        if (isServer) {
          BaseFetcher.serverCache.set(cacheKey, parsedData)
        } else {
          this.clientCache.set(cacheKey, {
            data: parsedData,
            timestamp: Date.now(),
          })
        }

        return { data: parsedData }
      } catch (error) {
        lastError = error
        console.error(`Error fetching API data from ${url} (attempt ${retries + 1}):`, error)

        // Exponential backoff
        const waitTime = 2 ** retries * 1000
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        retries++
      }
    }

    console.error(`Failed to fetch API data after ${MAX_RETRIES} attempts. Using fallback data.`)

    // Try to use fallback data from local files
    try {
      // If we're on the client, try to get data from the local API endpoint
      if (!isServer) {
        const componentId = this.options.componentId
        const fallbackUrl = `/api/fallback?component=${componentId}`
        console.log(`Trying fallback data from: ${fallbackUrl}`)

        const response = await fetch(fallbackUrl)
        if (response.ok) {
          const data = await response.json()
          const parsedData = this.parseData(data)
          return { data: parsedData }
        }
      }
    } catch (fallbackError) {
      console.error("Error fetching fallback data:", fallbackError)
    }

    // If all else fails, return mock data based on the component type
    return { data: this.getMockData() }
  }

  // Add a new method to provide mock data as a last resort
  getMockData(): T[] {
    // Determine what kind of mock data to return based on the component ID
    const componentId = this.options.componentId

    if (componentId.includes("User")) {
      return [
        { id: 1, name: "Mock User 1", email: "user1@example.com" },
        { id: 2, name: "Mock User 2", email: "user2@example.com" },
        { id: 3, name: "Mock User 3", email: "user3@example.com" },
      ] as unknown as T[]
    } else if (componentId.includes("Product")) {
      return [
        { id: 1, name: "Mock Product 1", price: 99.99, description: "A mock product" },
        { id: 2, name: "Mock Product 2", price: 199.99, description: "Another mock product" },
        { id: 3, name: "Mock Product 3", price: 299.99, description: "Yet another mock product" },
      ] as unknown as T[]
    }

    // Default empty array if component type is unknown
    return [] as T[]
  }

  // Update pagination settings
  setPagination(page: number, limit: number, enabled = true) {
    if (this.options.pagination) {
      this.options.pagination.page = page
      this.options.pagination.limit = limit
      this.options.pagination.enabled = enabled
    } else {
      this.options.pagination = { page, limit, enabled }
    }
  }

  // Publish a data change event
  publishDataChange(action: "create" | "update" | "delete" | "refresh", data?: any, id?: string | number) {
    realtimeManager.publish({
      componentId: this.options.componentId,
      action,
      data,
      id,
    })
  }

  async fetchData(isServer = false): Promise<{ data: T[]; totalItems?: number; totalPages?: number }> {
    console.log(`Fetching data for ${this.options.componentId} with isServer=${isServer}`)
    const dataSource = this.options.dataSource || "json"

    switch (dataSource) {
      case "json":
        return this.fetchJsonData(isServer)
      case "csv":
        return this.fetchCsvData(isServer)
      case "txt":
        return this.fetchTxtData(isServer)
      case "api":
        return this.fetchApiData(isServer)
      default:
        throw new Error(`Unsupported data source: ${dataSource}`)
    }
  }
}

