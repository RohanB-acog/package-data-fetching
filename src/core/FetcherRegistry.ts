import type { BaseFetcher, DataSourceType } from "./BaseFetcher"

export class FetcherRegistry {
  private static instance: FetcherRegistry
  private fetchers: Map<string, BaseFetcher<any>>
  private apiBasePath = "/api/data"
  private baseUrl: string =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000"

  private constructor() {
    this.fetchers = new Map()
  }

  public static getInstance(): FetcherRegistry {
    if (!FetcherRegistry.instance) {
      FetcherRegistry.instance = new FetcherRegistry()
    }
    return FetcherRegistry.instance
  }

  public register(componentId: string, fetcher: BaseFetcher<any>): void {
    this.fetchers.set(componentId, fetcher)
  }

  public getFetcher(componentId: string): BaseFetcher<any> | undefined {
    return this.fetchers.get(componentId)
  }

  public setApiBasePath(path: string): void {
    this.apiBasePath = path
  }

  public getApiBasePath(): string {
    return this.apiBasePath
  }

  public setBaseUrl(url: string): void {
    // Ensure the URL doesn't end with a slash
    this.baseUrl = url.endsWith("/") ? url.slice(0, -1) : url
  }

  public getBaseUrl(): string {
    return this.baseUrl
  }

  // Method to handle URL construction
  public getDataUrl(componentId: string, dataSource: DataSourceType = "json", isServer = false): string {
    // For server-side fetching, use the full URL
    if (isServer) {
      return `${this.baseUrl}${this.apiBasePath}?component=${componentId}&dataSource=${dataSource}`
    }

    // For client-side, relative URL is fine
    return `${this.apiBasePath}?component=${componentId}&dataSource=${dataSource}`
  }
}

