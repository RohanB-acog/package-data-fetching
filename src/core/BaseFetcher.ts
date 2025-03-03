import { FetcherRegistry } from "./FetcherRegistry"

export type DataSourceType = "json" | "csv" | "txt" | "api"

export interface FetcherOptions {
  dataSource?: DataSourceType
  componentId: string
  endpoint?: string
}

export abstract class BaseFetcher<T> {
  protected options: FetcherOptions

  constructor(options: FetcherOptions) {
    this.options = options
  }

  abstract parseData(data: any): T[]

  private getUrl(isServer: boolean, componentId: string): string {
    const registry = FetcherRegistry.getInstance()
    
    // If using a specific endpoint (like external API)
    if (this.options.endpoint && this.options.dataSource === "api") {
      return this.options.endpoint
    }
    
    // Get the base URL from registry
    const baseUrl = registry.getBaseUrl()
    const apiPath = registry.getApiBasePath()
    
    // For server-side requests, always use the absolute URL with the configured base URL
    if (isServer) {
      return `${baseUrl}${apiPath}?component=${componentId}&dataSource=${this.options.dataSource}`
    }
    
    // For client-side, we can use a relative URL which will use current origin
    return `${apiPath}?component=${componentId}&dataSource=${this.options.dataSource}`
  }

  async fetchJsonData(isServer: boolean, componentId: string): Promise<T[]> {
    const url = this.getUrl(isServer, componentId)
    
    try {
      console.log(`Fetching JSON data from: ${url}`)
      const response = await fetch(url, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`)
      }

      const data = await response.json()
      return this.parseData(data)
    } catch (error) {
      console.error(`Error fetching JSON data from ${url}:`, error)
      throw error
    }
  }

  async fetchCsvData(isServer: boolean, componentId: string): Promise<T[]> {
    const url = this.getUrl(isServer, componentId)
    
    try {
      console.log(`Fetching CSV data from: ${url}`)
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

      return this.parseData(jsonData)
    } catch (error) {
      console.error(`Error fetching CSV data from ${url}:`, error)
      throw error
    }
  }

  async fetchTxtData(isServer: boolean, componentId: string): Promise<T[]> {
    const url = this.getUrl(isServer, componentId)
    
    try {
      console.log(`Fetching TXT data from: ${url}`)
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

      return this.parseData(jsonData)
    } catch (error) {
      console.error(`Error fetching TXT data from ${url}:`, error)
      throw error
    }
  }

  async fetchApiData(isServer: boolean, componentId: string): Promise<T[]> {
    // For external API calls (like RapidAPI or MockAPI)
    const url = this.options.endpoint || ""

    if (!url || url === "") {
      console.warn(`No endpoint provided for API data source in component ${componentId}`)
      return []
    }

    try {
      console.log(`Fetching API data from: ${url}`)
      let headers: Record<string, string> = {}

      // Only add API keys if they're defined
      if (process.env.NEXT_PUBLIC_RAPIDAPI_KEY && process.env.NEXT_PUBLIC_RAPIDAPI_HOST) {
        headers = {
          "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
          "x-rapidapi-host": process.env.NEXT_PUBLIC_RAPIDAPI_HOST,
        }
      }

      const response = await fetch(url, {
        headers,
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch API data: ${response.statusText}`)
      }

      const data = await response.json()
      return this.parseData(data)
    } catch (error) {
      console.error(`Error fetching API data from ${url}:`, error)
      // Return empty array instead of throwing to prevent component crashes
      return []
    }
  }

  async fetchData(isServer = false, componentId = this.options.componentId): Promise<T[]> {
    const dataSource = this.options.dataSource || "json"

    switch (dataSource) {
      case "json":
        return this.fetchJsonData(isServer, componentId)
      case "csv":
        return this.fetchCsvData(isServer, componentId)
      case "txt":
        return this.fetchTxtData(isServer, componentId)
      case "api":
        return this.fetchApiData(isServer, componentId)
      default:
        throw new Error(`Unsupported data source: ${dataSource}`)
    }
  }
}