import type React from "react"

interface ListRendererProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  title: string
  className?: string
  listClassName?: string
  itemClassName?: string
}

export function ListRenderer<T>({
  data,
  renderItem,
  title,
  className = "list-container",
  listClassName = "list",
  itemClassName = "list-item",
}: ListRendererProps<T>) {
  return (
    <div className={className}>
      <h2>{title}</h2>
      {data.length === 0 ? (
        <p>No data available</p>
      ) : (
        <ul className={listClassName}>
          {data.map((item, index) => (
            <li key={index} className={itemClassName}>
              {renderItem(item, index)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

