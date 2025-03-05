"use client"

import { useState } from "react"

export interface DynamicDataDisplayProps {
  data: Record<string, any>
  excludeFields?: string[]
  priorityFields?: string[]
  className?: string
}

export function DynamicDataDisplay({
  data,
  excludeFields = [],
  priorityFields = [],
  className = "",
}: DynamicDataDisplayProps) {
  const [expanded, setExpanded] = useState(false)

  if (!data || typeof data !== "object") {
    return <div>No data available</div>
  }

  // Get all fields, excluding those in excludeFields
  const allFields = Object.keys(data).filter((key) => !excludeFields.includes(key))

  // Separate fields into priority and non-priority
  const priorityFieldsToShow = allFields.filter((field) => priorityFields.includes(field))
  const otherFields = allFields.filter((field) => !priorityFields.includes(field))

  // Format value based on type
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A"
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return value.length > 0 ? `[Array(${value.length})]` : "[]"
      }
      return "[Object]"
    }
    return String(value)
  }

  return (
    <div className={`dynamic-data-display ${className}`}>
      {/* Always show priority fields */}
      {priorityFieldsToShow.map((field) => (
        <div key={field} className="field-row mb-1">
          <span className="field-name font-medium">{field}:</span>{" "}
          <span className="field-value">{formatValue(data[field])}</span>
        </div>
      ))}

      {/* Show a subset of other fields by default */}
      {otherFields.slice(0, expanded ? otherFields.length : 2).map((field) => (
        <div key={field} className="field-row mb-1">
          <span className="field-name font-medium">{field}:</span>{" "}
          <span className="field-value">{formatValue(data[field])}</span>
        </div>
      ))}

      {/* Show expand/collapse button if there are more fields */}
      {otherFields.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm flex items-center mt-1 text-blue-500 hover:underline"
        >
          {expanded ? (
            <>
              <span className="mr-1">▼</span> Show less
            </>
          ) : (
            <>
              <span className="mr-1">▶</span> Show {otherFields.length - 2} more fields
            </>
          )}
        </button>
      )}
    </div>
  )
}

