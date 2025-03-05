// Utility functions for the package

/**
 * Creates a simple API route handler for Next.js that reads data from files
 * @param dataDir Directory where data files are stored
 * @returns A handler function for Next.js API routes
 */
export function createDataApiHandler(dataDir = "app/data") {
    return async (req: Request) => {
      const url = new URL(req.url)
      const component = url.searchParams.get("component")
      const dataSource = url.searchParams.get("dataSource") || "json"
      const page = Number.parseInt(url.searchParams.get("page") || "1", 10)
      const limit = Number.parseInt(url.searchParams.get("limit") || "0", 10)
  
      if (!component) {
        return new Response(JSON.stringify({ error: "Component parameter is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }
  
      try {
        // This is a placeholder - in a real implementation, you would use fs to read files
        // Since this is meant to be used in a Next.js API route, we can't include fs directly
        // The implementation would depend on the user's file structure
  
        // Example implementation:
        /*
        import fs from 'fs'
        import path from 'path'
        
        const extension = dataSource === "json" ? "json" : dataSource === "csv" ? "csv" : "txt"
        const fileName = component.replace("Data", "").toLowerCase()
        const filePath = path.join(process.cwd(), dataDir, `${fileName}s.${extension}`)
        
        let data
        if (dataSource === "json") {
          const fileContent = fs.readFileSync(filePath, "utf8")
          data = JSON.parse(fileContent)
        } else if (dataSource === "csv" || dataSource === "txt") {
          const fileContent = fs.readFileSync(filePath, "utf8")
          data = fileContent
        }
        */
  
        // For the package, we'll return a placeholder response
        const mockData = [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
          { id: 3, name: "Item 3" },
        ]
  
        // Handle pagination
        let paginatedData = mockData
        const totalItems = mockData.length
  
        if (limit > 0) {
          const startIndex = (page - 1) * limit
          paginatedData = mockData.slice(startIndex, startIndex + limit)
        }
  
        if (dataSource === "json") {
          return new Response(
            JSON.stringify({
              data: paginatedData,
              pagination:
                limit > 0
                  ? {
                      page,
                      limit,
                      totalItems,
                      totalPages: Math.ceil(totalItems / limit),
                    }
                  : null,
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          )
        } else {
          return new Response("Mock data for non-JSON format", {
            headers: { "Content-Type": dataSource === "csv" ? "text/csv" : "text/plain" },
          })
        }
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || "Failed to fetch data" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }
    }
  }
  
  /**
   * Creates a simple SSE handler for Next.js
   * @returns A handler function for Next.js API routes
   */
  export function createSseHandler() {
    return async (req: Request) => {
      const clientId = Math.random().toString(36).substring(2, 15)
  
      // Create a new ReadableStream for SSE
      const stream = new ReadableStream({
        start(controller) {
          // Send initial connection message
          const initialData = `data: ${JSON.stringify({ type: "connected", clientId })}\n\n`
          controller.enqueue(new TextEncoder().encode(initialData))
  
          // Set up keep-alive interval to prevent connection timeouts
          const keepAliveInterval = setInterval(() => {
            try {
              controller.enqueue(new TextEncoder().encode(`: keep-alive\n\n`))
            } catch (error) {
              // If we can't send, the connection is probably closed
              clearInterval(keepAliveInterval)
            }
          }, 30000) // 30 seconds
  
          // Handle client disconnect
          req.signal.addEventListener("abort", () => {
            clearInterval(keepAliveInterval)
            console.log(`Client ${clientId} disconnected`)
          })
        },
      })
  
      // Return the stream with appropriate headers for SSE
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-store, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no", // Disable buffering for Nginx
        },
      })
    }
  }
  
  