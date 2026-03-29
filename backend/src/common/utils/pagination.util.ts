export interface ResolvedPagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export function resolvePagination(
  params: PaginationInput,
  options: {
    defaultPage?: number;
    defaultPageSize?: number;
    maxPageSize?: number;
  } = {},
): ResolvedPagination {
  const defaultPage = options.defaultPage ?? 1;
  const defaultPageSize = options.defaultPageSize ?? 20;
  const maxPageSize = options.maxPageSize ?? 500;

  const page = Math.max(defaultPage, params.page ?? defaultPage);
  const requestedPageSize = params.pageSize ?? defaultPageSize;
  const pageSize = Math.min(Math.max(1, requestedPageSize), maxPageSize);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  pagination: Pick<ResolvedPagination, 'page' | 'pageSize'>,
) {
  return {
    items,
    meta: {
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: total > 0 ? Math.ceil(total / pagination.pageSize) : 0,
    },
  };
}
