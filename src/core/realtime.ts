import { EventEmitter } from "events"

// Define event types
export type DataChangeEvent = {
  componentId: string
  action: "create" | "update" | "delete" | "refresh"
  data?: any
  id?: string | number
}

// Create a singleton event emitter for real-time updates
class RealtimeManager {
  private static instance: RealtimeManager
  private emitter: EventEmitter
  private sseClients: Set<{
    id: string
    send: (data: string) => void
  }>
  private isServerSide: boolean

  private constructor() {
    this.emitter = new EventEmitter()
    // Set high max listeners to avoid warnings
    this.emitter.setMaxListeners(100)
    this.sseClients = new Set()
    this.isServerSide = typeof window === "undefined"
  }

  public static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager()
    }
    return RealtimeManager.instance
  }

  // Subscribe to data changes for a specific component
  public subscribe(componentId: string, callback: (event: DataChangeEvent) => void): () => void {
    const eventName = `data-change:${componentId}`
    this.emitter.on(eventName, callback)

    // Return unsubscribe function
    return () => {
      this.emitter.off(eventName, callback)
    }
  }

  // Publish data changes
  public publish(event: DataChangeEvent): void {
    const eventName = `data-change:${event.componentId}`
    this.emitter.emit(eventName, event)

    // If on server, also send to all SSE clients
    if (this.isServerSide) {
      this.broadcastToSSEClients(event)
    }
  }

  // Register a new SSE client
  public registerSSEClient(id: string, send: (data: string) => void): void {
    this.sseClients.add({ id, send })
  }

  // Unregister an SSE client
  public unregisterSSEClient(id: string): void {
    for (const client of this.sseClients) {
      if (client.id === id) {
        this.sseClients.delete(client)
        break
      }
    }
  }

  // Broadcast to all SSE clients
  private broadcastToSSEClients(event: DataChangeEvent): void {
    const data = JSON.stringify(event)
    for (const client of this.sseClients) {
      try {
        client.send(data)
      } catch (error) {
        console.error(`Error sending to SSE client ${client.id}:`, error)
        this.sseClients.delete(client)
      }
    }
  }
}

export const realtimeManager = RealtimeManager.getInstance()

