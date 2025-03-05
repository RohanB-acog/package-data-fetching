"use client"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  itemsPerPage: number
  onItemsPerPageChange?: (itemsPerPage: number) => void
  totalItems?: number
  showItemsPerPage?: boolean
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  showItemsPerPage = true,
  className = "",
}: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are fewer than maxPagesToShow
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Always show first page
      pageNumbers.push(1)

      // Calculate start and end of page range around current page
      let start = Math.max(2, currentPage - 1)
      let end = Math.min(totalPages - 1, currentPage + 1)

      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        end = Math.min(totalPages - 1, 4)
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3)
      }

      // Add ellipsis if needed before middle pages
      if (start > 2) {
        pageNumbers.push("...")
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i)
      }

      // Add ellipsis if needed after middle pages
      if (end < totalPages - 1) {
        pageNumbers.push("...")
      }

      // Always show last page
      pageNumbers.push(totalPages)
    }

    return pageNumbers
  }

  return (
    <div
      className={`pagination-container flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 w-full ${className}`}
    >
      <div className="flex items-center text-sm text-gray-500">
        {totalItems !== undefined && (
          <span>
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
          aria-label="First page"
        >
          {"<<"}
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Previous page"
        >
          {"<"}
        </button>

        {getPageNumbers().map((page, index) =>
          typeof page === "number" ? (
            <button
              key={index}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 rounded-md ${
                currentPage === page ? "bg-blue-500 text-white" : "hover:bg-gray-100"
              }`}
            >
              {page}
            </button>
          ) : (
            <span key={index} className="px-3 py-2">
              {page}
            </span>
          ),
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Next page"
        >
          {">"}
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Last page"
        >
          {">>"}
        </button>
      </div>

      {showItemsPerPage && onItemsPerPageChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Items per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="p-1 border rounded-md text-sm bg-white"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      )}
    </div>
  )
}

