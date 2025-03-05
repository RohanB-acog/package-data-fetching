### next-data-fetcher

A powerful and flexible data fetching library for Next.js applications, supporting both client and server components with built-in caching, pagination, and real-time updates.

[![npm version](https://img.shields.io/npm/v/next-data-fetcher)](https://www.npmjs.com/package/next-data-fetcher)  
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)


## Features

- 🔄 **Universal Data Fetching**: Works with both client and server components
- 🚀 **React Server Components Support**: Optimized for Next.js App Router
- 📊 **Multiple Data Sources**: JSON, CSV, TXT, and external APIs
- 📱 **Responsive UI Components**: Ready-to-use data display components
- 🔄 **Real-time Updates**: Built-in support for real-time data changes
- 📄 **Pagination**: Built-in pagination support
- 🧩 **Modular Architecture**: Easily extensible for custom data sources
- 🔒 **Type Safety**: Written in TypeScript with full type definitions


## Installation

```shellscript
npm install next-data-fetcher
# or
yarn add next-data-fetcher
# or
pnpm add next-data-fetcher
```

### Create a Middleware (Required)

To handle CORS and API requests properly, create a middleware.ts file in your root directory:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

> **Important Note**: The middleware.ts file must be created or you'll receive an error: "Error: The Middleware "/middleware" must export a `middleware` or a `default` function".


## Quick Start

### 1. Set up your data files

Create data files in your project (e.g., in `app/data/`):

```json
// app/data/users.json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane@example.com"
  }
]
```

### 2. Create API routes for data fetching

```typescript
// app/api/data/route.ts
import { type NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const component = searchParams.get("component");
  const dataSource = searchParams.get("dataSource") || "json";
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "0", 10);

  if (!component) {
    return NextResponse.json({ error: "Component parameter is required" }, { status: 400 });
  }

  try {
    // Read data from files based on component and dataSource
    const fileName = component.replace("Data", "").toLowerCase();
    const extension = dataSource === "json" ? "json" : dataSource === "csv" ? "csv" : "txt";
    const filePath = path.join(process.cwd(), "app/data", `${fileName}s.${extension}`);

    let data;
    if (dataSource === "json") {
      const fileContent = fs.readFileSync(filePath, "utf8");
      data = JSON.parse(fileContent);
    } else if (dataSource === "csv" || dataSource === "txt") {
      const fileContent = fs.readFileSync(filePath, "utf8");
      data = fileContent;
    }

    // Handle pagination
    let paginatedData = data;
    const totalItems = Array.isArray(data) ? data.length : 0;

    if (limit > 0 && Array.isArray(data)) {
      const startIndex = (page - 1) * limit;
      paginatedData = data.slice(startIndex, startIndex + limit);
    }

    // Return appropriate response
    if (dataSource === "json") {
      return NextResponse.json({
        data: paginatedData,
        pagination: limit > 0
          ? {
              page,
              limit,
              totalItems,
              totalPages: Math.ceil(totalItems / limit),
            }
          : null,
      });
    } else {
      return new NextResponse(data, {
        headers: {
          "Content-Type": dataSource === "csv" ? "text/csv" : "text/plain",
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch data" }, { status: 500 });
  }
}
```

### 3. Create a data fetcher

```typescript
// app/fetchers/UserDataFetcher.ts
import { BaseFetcher, type DataSourceType } from "next-data-fetcher";

export interface User {
  id: number;
  name: string;
  email: string;
  [key: string]: any; // Allow for dynamic fields
}

export class UserDataFetcher extends BaseFetcher<User> {
  constructor(dataSource: DataSourceType = "json") {
    super({
      componentId: "UserData",
      dataSource,
      endpoint: dataSource === "api" ? "https://jsonplaceholder.typicode.com/users" : undefined,
    });
  }

  parseData(data: any): User[] {
    if (Array.isArray(data)) {
      return data.map((user) => {
        // Create a base user object with required fields
        const baseUser: User = {
          id: typeof user.id === "number" ? user.id : Number.parseInt(user.id) || 0,
          name: user.name || "Unknown",
          email: user.email || "No email",
        };

        // Add any additional fields dynamically
        for (const key in user) {
          if (!baseUser.hasOwnProperty(key)) {
            baseUser[key] = user[key];
          }
        }

        return baseUser;
      });
    }

    return [];
  }
}
```

### 4. Create a display component

```typescriptreact
// app/components/UserList.tsx
import { DynamicListRenderer } from "next-data-fetcher";
import type { User } from "../fetchers/UserDataFetcher";

interface UserListProps {
  data?: User[];
}

export function UserList({ data = [] }: UserListProps) {
  return (
    <DynamicListRenderer
      data={data}
      title="User List"
      priorityFields={["name", "email"]}
      excludeFields={["_id"]}
      itemsPerPage={5}
    />
  );
}
```

### 5. Use in a server component

```typescriptreact
// app/components/ServerUserList.tsx
import { withServerFetching } from "next-data-fetcher";
import { UserList } from "./UserList";
import { UserDataFetcher } from "../fetchers/UserDataFetcher";
import { FetcherRegistry } from "next-data-fetcher";

// Register the fetcher (do this in a place that runs on the server)
const registry = FetcherRegistry.getInstance();
registry.register("UserData", new UserDataFetcher("json"));

// Create a server component using withServerFetching
const ServerUserList = withServerFetching(UserList, "UserData");

export default ServerUserList;
```

### 6. Use in a client component

```typescriptreact
// app/components/ClientUserList.tsx
"use client";

import { withClientFetching } from "next-data-fetcher";
import { UserList } from "./UserList";
import { useEffect } from "react";
import { UserDataFetcher } from "../fetchers/UserDataFetcher";
import { FetcherRegistry } from "next-data-fetcher";

// Create a client component using withClientFetching
const ClientUserList = withClientFetching(UserList, "UserData");

export function ClientUserListWrapper() {
  useEffect(() => {
    // Register the fetcher on the client
    const registry = FetcherRegistry.getInstance();
    registry.register("UserData", new UserDataFetcher("json"));
  }, []);

  return <ClientUserList />;
}
```

### 7. Use in your page

```typescriptreact
// app/page.tsx
import { Suspense } from "react";
import ServerUserList from "./components/ServerUserList";
import { ClientUserListWrapper } from "./components/ClientUserList";

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Next.js Data Fetcher Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Server-side Fetching</h2>
          <Suspense fallback={<div>Loading server data...</div>}>
            <ServerUserList />
          </Suspense>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Client-side Fetching</h2>
          <ClientUserListWrapper />
        </div>
      </div>
    </main>
  );
}
```

## Advanced Usage

### Toggle Between Server and Client Fetching

```typescriptreact
"use client";

import { useState, useEffect } from "react";
import { Toggle, FetcherRegistry, DataSourceType } from "next-data-fetcher";
import { UserDataFetcher } from "../fetchers/UserDataFetcher";
import { Suspense } from "react";
import ServerUserList from "./ServerUserList";
import { ClientUserListWrapper } from "./ClientUserList";

export default function ToggleExample() {
  const [isServer, setIsServer] = useState(true);
  const [dataSource, setDataSource] = useState<DataSourceType>("json");
  
  useEffect(() => {
    const registry = FetcherRegistry.getInstance();
    registry.register("UserData", new UserDataFetcher(dataSource));
  }, [dataSource]);
  
  return (
    <div className="container mx-auto p-4">
      <Toggle
        onToggleMode={(server) => setIsServer(server)}
        onChangeDataSource={(source) => setDataSource(source)}
        isServer={isServer}
        dataSource={dataSource}
      />
      
      <div className="mt-6">
        {isServer ? (
          <Suspense fallback={<div>Loading server data...</div>}>
            <ServerUserList />
          </Suspense>
        ) : (
          <ClientUserListWrapper />
        )}
      </div>
    </div>
  );
}
```

### Real-time Updates

To enable real-time updates, you need to set up an SSE (Server-Sent Events) endpoint:

```typescript
// app/api/sse/route.ts
import { type NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const clientId = uuidv4();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialData = `data: ${JSON.stringify({ type: "connected", clientId })}

`;
      controller.enqueue(new TextEncoder().encode(initialData));
      
      // Set up keep-alive interval
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: keep-alive

`));
        } catch (error) {
          clearInterval(keepAliveInterval);
        }
      }, 30000);
      
      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval);
        console.log(`Client ${clientId} disconnected`);
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

Then use the real-time features in your components:

```typescriptreact
"use client";

import { useState } from "react";
import { Toggle, useRealtimeUpdates } from "next-data-fetcher";
import { ClientUserListWrapper } from "./ClientUserList";

export default function RealtimeExample() {
  const [isRealtime, setIsRealtime] = useState(false);
  
  // Subscribe to real-time updates
  useRealtimeUpdates("UserData", () => {
    console.log("Data updated!");
    // Refresh your UI or fetch new data
  });
  
  return (
    <div>
      <Toggle
        onToggleRealtime={() => setIsRealtime(!isRealtime)}
        isRealtime={isRealtime}
        // ... other props
      />
      
      <ClientUserListWrapper />
    </div>
  );
}
```

## API Reference

### Core Components

#### `BaseFetcher<T>`

Abstract base class for data fetchers.

```typescript
class BaseFetcher<T> {
  constructor(options: FetcherOptions);
  abstract parseData(data: any): T[];
  async fetchData(isServer?: boolean): Promise<{ data: T[]; totalItems?: number; totalPages?: number }>;
  setPagination(page: number, limit: number, enabled?: boolean): void;
  invalidateCache(): void;
  publishDataChange(action: "create" | "update" | "delete" | "refresh", data?: any, id?: string | number): void;
}
```

#### `FetcherRegistry`

Singleton registry for managing fetchers.

```typescript
class FetcherRegistry {
  static getInstance(): FetcherRegistry;
  register(componentId: string, fetcher: BaseFetcher<any>): void;
  getFetcher(componentId: string): BaseFetcher<any> | undefined;
  getDataUrl(componentId: string, dataSource?: DataSourceType): string;
}
```

### Higher-Order Components (HOCs)

#### `withServerFetching`

HOC for server-side data fetching.

```typescript
function withServerFetching<T, P extends { data?: T[] }>(
  WrappedComponent: React.ComponentType<P>,
  componentId: string,
  options?: { defaultItemsPerPage?: number }
): React.ComponentType<Omit<P, "data">>;
```

#### `withClientFetching`

HOC for client-side data fetching.

```typescript
function withClientFetching<T, P extends { data?: T[] }>(
  WrappedComponent: React.ComponentType<P>,
  componentId: string,
  options?: WithClientFetchingOptions
): React.ComponentType<Omit<P, "data">>;
```

### UI Components

#### `DynamicListRenderer`

Renders a list of data with pagination.

```typescript
function DynamicListRenderer<T extends Record<string, any>>({
  data,
  title,
  priorityFields,
  excludeFields,
  itemsPerPage,
  virtualized,
  className,
  listClassName,
  itemClassName,
}: DynamicListRendererProps<T>): JSX.Element;
```

#### `DynamicDataDisplay`

Displays a single data item with expandable fields.

```typescript
function DynamicDataDisplay({
  data,
  excludeFields,
  priorityFields,
  className,
}: DynamicDataDisplayProps): JSX.Element;
```

#### `Pagination`

Pagination component with page navigation.

```typescript
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  showItemsPerPage,
  className,
}: PaginationProps): JSX.Element;
```

#### `Toggle`

Toggle component for switching between modes.

```typescript
function Toggle({
  onToggleMode,
  onChangeDataSource,
  onRefresh,
  isServer,
  dataSource,
  isRealtime,
  onToggleRealtime,
  className,
}: ToggleProps): JSX.Element;
```

### Hooks

#### `useRealtimeUpdates`

Hook for subscribing to real-time updates.

```typescript
function useRealtimeUpdates(componentId: string, onUpdate: () => void): void;
```

## Best Practices

### Server Components

1. **Always wrap server components with Suspense**:

```typescriptreact
<Suspense fallback={<div>Loading...</div>}>
  <ServerComponent />
</Suspense>
```


2. **Register fetchers early in the component tree**:

```typescriptreact
// In a layout or at the top of your component tree
const registry = FetcherRegistry.getInstance();
registry.register("UserData", new UserDataFetcher());
```


3. **Use the cache function for data fetching**:
The package uses React's `cache` function internally to memoize data fetching in server components.


### Client Components

1. **Register fetchers in useEffect**:

```typescriptreact
useEffect(() => {
  const registry = FetcherRegistry.getInstance();
  registry.register("UserData", new UserDataFetcher());
}, []);
```


2. **Handle loading and error states**:
The `withClientFetching` HOC provides built-in loading and error states.
3. **Use keys for forcing re-renders**:

```typescriptreact
<ClientUserList key={`client-user-${dataSource}`} />
```




## Environment Variables

Set these environment variables for optimal functionality:

```plaintext
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_RAPIDAPI_KEY=your-rapidapi-key (optional)
NEXT_PUBLIC_RAPIDAPI_HOST=your-rapidapi-host (optional)
```

## Troubleshooting

### Common Issues

#### "A component was suspended by an uncached promise"

This error occurs when using server components without proper Suspense boundaries.

**Solution**:

1. Wrap server components with Suspense
2. Make sure you're using the latest version of next-data-fetcher
3. Don't dynamically import server components in client components


#### "No fetcher registered for component"

This error occurs when trying to use a component before registering its fetcher.

**Solution**:

1. Make sure you register fetchers before using components
2. Check component IDs for typos
3. Verify that registration code is running on both client and server as needed


#### Data not updating in real-time

**Solution**:

1. Ensure SSE endpoint is set up correctly
2. Check that you're using `useRealtimeUpdates` hook
3. Verify that `publishDataChange` is called when data changes


## License

MIT © [Your Name]

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.