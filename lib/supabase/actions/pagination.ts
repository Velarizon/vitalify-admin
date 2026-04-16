'use server'

export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
}

export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}

export function normalizePagination(params?: PaginationParams) {
  const page = Math.max(1, params?.page ?? 1)
  const pageSize = Math.min(100, Math.max(10, params?.pageSize ?? 25))
  const search = params?.search?.trim() ?? ''

  return {
    page,
    pageSize,
    search,
    from: (page - 1) * pageSize,
    to: page * pageSize - 1,
  }
}

export function escapeForLike(value: string) {
  return value.replaceAll('%', '\\%').replaceAll(',', '\\,')
}
