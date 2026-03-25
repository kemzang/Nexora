export * from './database'
export * from './auth'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface SelectOption {
  value: string
  label: string
}

export interface ChartData {
  name: string
  value: number
  color?: string
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: string
  read: boolean
}
