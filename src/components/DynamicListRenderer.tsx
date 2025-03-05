"use client"

import { useState, useEffect, useRef } from "react"
import { Pagination } from "./Pagination"
import { DynamicDataDisplay } from "./DynamicDataDisplay"

export interface DynamicListRendererProps<T> {
  data: T[]
  title: string
  priorityFields?: string[]
  excludeFields?: string[]
  itemsPerPage?: number
  virtualized?: boolean
  className?: string
  listClassName?: string
  itemClassName?: string
}

export function DynamicListRenderer<T extends Record<string, any>>({
  data,
  title,
  priorityFields = [],
  excludeFields = [],
  itemsPerPage: defaultItemsPerPage = 10,
  virtualized = false,
  className = "",
  listClassName = "",
  itemClassName = "",
}: DynamicListRendererProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage)
  const [visibleItems, setVisibleItems] = useState<T[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage))

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of list when page changes
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    // Reset to first page when changing items per page
    setCurrentPage(1)
  }

  // Update visible items when page or itemsPerPage changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setVisibleItems(data.slice(startIndex, endIndex))
  }, [currentPage, itemsPerPage, data])

  // Virtualized list implementation
  const renderVirtualizedList = () => {
    return (
      <div ref={containerRef} className={`virtualized-list-container overflow-auto max-h-[500px] ${listClassName}`}>
        {visibleItems.map((item, index) => (
          <div
            key={index}
            className={`list-item p-4 border rounded-md mb-2 hover:shadow-md transition-shadow ${itemClassName}`}
          >
            <DynamicDataDisplay data={item} priorityFields={priorityFields} excludeFields={excludeFields} />
          </div>
        ))}
      </div>
    )
  }

  // Standard list implementation
  const renderStandardList = () => {
    return (
      <div className={`list-container ${listClassName}`}>
        <ul className="list">
          {visibleItems.map((item, index) => (
            <li
              key={index}
              className={`list-item p-4 border rounded-md mb-2 hover:shadow-md transition-shadow ${itemClassName}`}
            >
              <DynamicDataDisplay data={item} priorityFields={priorityFields} excludeFields={excludeFields} />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className={`dynamic-list-renderer ${className}`}>
      <h2 className="text-xl font-bold mb-4">{title}</h2>

      {data.length === 0 ? (
        <p className="text-gray-500">No data available</p>
      ) : (
        <>
          {virtualized ? renderVirtualizedList() : renderStandardList()}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            totalItems={data.length}
          />
        </>
      )}
    </div>
  )
}

