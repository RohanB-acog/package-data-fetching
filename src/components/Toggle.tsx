"use client"
import type { DataSourceType } from "../core/BaseFetcher"

export interface ToggleProps {
  onToggleMode: (isServer: boolean) => void
  onChangeDataSource: (dataSource: DataSourceType) => void
  onRefresh?: () => void
  isServer: boolean
  dataSource: DataSourceType
  isRealtime?: boolean
  onToggleRealtime?: () => void
  className?: string
}

export function Toggle({
  onToggleMode,
  onChangeDataSource,
  onRefresh,
  isServer,
  dataSource,
  isRealtime = false,
  onToggleRealtime,
  className = "",
}: ToggleProps) {
  return (
    <div
      className={`toggle-container flex flex-col md:flex-row justify-between gap-4 p-4 bg-gray-100 rounded-lg ${className}`}
    >
      <div className="mode-toggle">
        <h3 className="font-medium mb-2">Fetch Mode:</h3>
        <div className="toggle-buttons flex gap-2">
          <button
            className={`px-3 py-1 rounded-md ${isServer ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => onToggleMode(true)}
          >
            Server-side
          </button>
          <button
            className={`px-3 py-1 rounded-md ${!isServer ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => onToggleMode(false)}
          >
            Client-side
          </button>
        </div>
      </div>

      <div className="data-source-toggle">
        <h3 className="font-medium mb-2">Data Source:</h3>
        <select
          value={dataSource}
          onChange={(e) => onChangeDataSource(e.target.value as DataSourceType)}
          className="px-3 py-1 rounded-md bg-white border"
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="txt">TXT</option>
          <option value="api">API</option>
        </select>
      </div>

      {onToggleRealtime && (
        <div className="realtime-toggle">
          <h3 className="font-medium mb-2">Real-time Updates:</h3>
          <div className="toggle-buttons flex gap-2">
            <button
              className={`px-3 py-1 rounded-md ${isRealtime ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              onClick={onToggleRealtime}
            >
              {isRealtime ? "Enabled" : "Disabled"}
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-3 py-1 rounded-md bg-gray-200 flex items-center gap-1"
                aria-label="Refresh data"
              >
                <span className="refresh-icon">↻</span>
                Refresh
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

