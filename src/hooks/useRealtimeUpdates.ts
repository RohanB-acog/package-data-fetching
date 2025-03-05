"use client"

import { useEffect, useRef, useState } from "react"
import { realtimeManager } from "../core/realtime"

// Hook to subscribe to realtime updates
export function useRealtimeUpdates(componentId: string, onUpdate: () => void) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const MAX_RECONNECT_ATTEMPTS = 5

  useEffect(() => {
    // Subscribe to local events (for same-client updates)
    const unsubscribe = realtimeManager.subscribe(componentId, () => {
      onUpdate()
    })

    // Function to create and set up the EventSource
    const setupEventSource = () => {
      // Don't try to reconnect if we've exceeded the maximum attempts
      if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.warn(`Exceeded maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}). Giving up.`)
        return
      }

      // Clean up any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      try {
        // Create a new EventSource with a timestamp to prevent caching
        const timestamp = new Date().getTime()
        const eventSource = new EventSource(`/api/sse?t=${timestamp}`)
        eventSourceRef.current = eventSource

        // Handle successful connection
        eventSource.onopen = () => {
          console.log("SSE connection established")
          setConnectionAttempts(0) // Reset connection attempts on successful connection
        }

        // Handle messages
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // Handle connected message
            if (data.type === "connected") {
              console.log("Connected to SSE stream with client ID:", data.clientId)
              return
            }

            // Handle data change events
            if (data.componentId === componentId) {
              console.log("Received SSE update for component:", componentId)
              onUpdate()
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error)
          }
        }

        // Handle errors with improved error handling
        eventSource.onerror = (event) => {
          // Don't log the full event object as it's not very helpful
          console.warn("SSE connection error. Attempting to reconnect...")

          // Close the current connection
          eventSource.close()
          eventSourceRef.current = null

          // Increment connection attempts
          setConnectionAttempts((prev) => prev + 1)

          // Use exponential backoff for reconnection
          const backoffTime = Math.min(1000 * Math.pow(2, connectionAttempts), 30000) // Max 30 seconds

          console.log(`Reconnecting in ${backoffTime / 1000} seconds...`)

          // Schedule reconnection
          reconnectTimeoutRef.current = setTimeout(() => {
            setupEventSource()
          }, backoffTime)
        }
      } catch (error) {
        console.error("Error setting up SSE connection:", error)
      }
    }

    // Connect to SSE for cross-client updates
    if (typeof window !== "undefined") {
      setupEventSource()
    }

    // Cleanup function
    return () => {
      unsubscribe()

      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [componentId, onUpdate, connectionAttempts])
}

