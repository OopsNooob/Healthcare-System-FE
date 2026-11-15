export interface PaginationMetaInput {
  page?: number;
  limit?: number;
  sortOrder?: 1 | -1;
  sortBy?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
  total?: number;
}

const KNOWN_LIST_KEYS = [
  'items',
  'results',
  'notifications',
  'patients',
  'admins',
  'users',
  'doctors',
  'consultations',
  'appointments',
  'slots',
  'availabilitySlots',
  'orders',
  'plans',
  'subscriptions',
  'programs',
  'enrollments',
  'tasks',
  'alerts',
  'reports',
  'reviews',
  'violations',
  'keywords',
  'documents',
  'chunks',
  'feedbacks',
  'conversations',
  'messages',
  'metrics',
  'applications',
  'data',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function extractArrayFromRecord<T>(record: Record<string, unknown>): T[] | null {
  for (const key of KNOWN_LIST_KEYS) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return null;
}

/**
 * Normalizes paginated or raw-array GET list responses into a unified PaginatedResult<T>.
 * Handles raw arrays, { items, total, page, limit, totalPages }, { data, pagination },
 * { statusCode, message, data: { <entityKey>: T[], pagination } }, etc.
 */
export function normalizePaginatedList<T = Record<string, unknown>>(
  raw: unknown,
  fallbackPage = 1,
  fallbackLimit = 20,
): PaginatedResult<T> {
  const safeLimit = Math.max(1, fallbackLimit);
  const safeFallbackPage = Math.max(1, fallbackPage);

  if (Array.isArray(raw)) {
    const total = raw.length;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return {
      items: raw as T[],
      total,
      page: safeFallbackPage,
      limit: safeLimit,
      totalPages,
      hasNextPage: false,
      hasPrevPage: safeFallbackPage > 1,
    };
  }

  if (!isRecord(raw)) {
    return {
      items: [],
      total: 0,
      page: safeFallbackPage,
      limit: safeLimit,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }

  // Unwrap API envelope { statusCode, message, data } when data holds array or nested list object
  const envelopeData = isRecord(raw.data) ? raw.data : undefined;

  let items: T[] = [];
  if (Array.isArray(raw.items)) {
    items = raw.items as T[];
  } else if (Array.isArray(raw.data)) {
    items = raw.data as T[];
  } else if (envelopeData) {
    items = extractArrayFromRecord<T>(envelopeData) ?? [];
  } else {
    items = extractArrayFromRecord<T>(raw) ?? [];
  }

  const metaSource =
    (isRecord(raw.pagination) && raw.pagination) ||
    (envelopeData && isRecord(envelopeData.pagination) && envelopeData.pagination) ||
    (isRecord(raw.meta) && raw.meta) ||
    (envelopeData && isRecord(envelopeData.meta) && envelopeData.meta) ||
    envelopeData ||
    raw;

  const limit =
    Math.max(
      1,
      toFiniteNumber(metaSource.limit) ??
        toFiniteNumber(raw.limit) ??
        safeLimit,
    );
  const page =
    Math.max(
      1,
      toFiniteNumber(metaSource.page) ??
        toFiniteNumber(raw.page) ??
        safeFallbackPage,
    );
  const total =
    Math.max(
      items.length,
      toFiniteNumber(metaSource.total) ??
        toFiniteNumber(raw.total) ??
        toFiniteNumber(metaSource.totalItems) ??
        items.length,
    );
  const rawTotalPages =
    toFiniteNumber(metaSource.totalPages) ??
    toFiniteNumber(metaSource.pages) ??
    toFiniteNumber(raw.totalPages) ??
    toFiniteNumber(raw.pages);

  const totalPages = Math.max(1, rawTotalPages ?? Math.ceil(total / limit));

  const explicitHasNext =
    typeof metaSource.hasNextPage === 'boolean'
      ? metaSource.hasNextPage
      : typeof metaSource.hasMore === 'boolean'
        ? metaSource.hasMore
        : typeof raw.hasNextPage === 'boolean'
          ? raw.hasNextPage
          : undefined;

  const explicitHasPrev =
    typeof metaSource.hasPrevPage === 'boolean'
      ? metaSource.hasPrevPage
      : typeof raw.hasPrevPage === 'boolean'
        ? raw.hasPrevPage
        : undefined;

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: explicitHasNext ?? page < totalPages,
    hasPrevPage: explicitHasPrev ?? page > 1,
  };
}

/**
 * Normalizes cursor-paginated or raw-array GET list responses (e.g., care-alerts, notifications, chat).
 */
export function normalizeCursorList<T = Record<string, unknown>>(
  raw: unknown,
): CursorPaginatedResult<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw as T[],
      nextCursor: null,
      hasNextPage: false,
      total: raw.length,
    };
  }

  if (!isRecord(raw)) {
    return {
      items: [],
      nextCursor: null,
      hasNextPage: false,
      total: 0,
    };
  }

  const envelopeData = isRecord(raw.data) ? raw.data : undefined;

  let items: T[] = [];
  if (Array.isArray(raw.items)) {
    items = raw.items as T[];
  } else if (Array.isArray(raw.data)) {
    items = raw.data as T[];
  } else if (envelopeData) {
    items = extractArrayFromRecord<T>(envelopeData) ?? [];
  } else {
    items = extractArrayFromRecord<T>(raw) ?? [];
  }

  const metaSource =
    (isRecord(raw.meta) && raw.meta) ||
    (isRecord(raw.pagination) && raw.pagination) ||
    (envelopeData && isRecord(envelopeData.meta) && envelopeData.meta) ||
    envelopeData ||
    raw;

  const nextCursorRaw =
    metaSource.nextCursor ?? raw.nextCursor ?? metaSource.cursor ?? null;
  const nextCursor =
    typeof nextCursorRaw === 'string' && nextCursorRaw.trim() !== ''
      ? nextCursorRaw
      : null;

  const explicitHasNext =
    typeof metaSource.hasNextPage === 'boolean'
      ? metaSource.hasNextPage
      : typeof metaSource.hasMore === 'boolean'
        ? metaSource.hasMore
        : typeof raw.hasNextPage === 'boolean'
          ? raw.hasNextPage
          : typeof raw.hasMore === 'boolean'
            ? raw.hasMore
            : undefined;

  const total =
    toFiniteNumber(metaSource.total) ?? toFiniteNumber(raw.total);

  return {
    items,
    nextCursor,
    hasNextPage: explicitHasNext ?? nextCursor !== null,
    ...(total !== undefined ? { total } : {}),
  };
}

export function buildPaginationParams(
  input: PaginationMetaInput = {},
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (input.page !== undefined) params.page = input.page;
  if (input.limit !== undefined) params.limit = input.limit;
  if (input.sortOrder !== undefined) params.sortOrder = input.sortOrder;
  if (input.sortBy !== undefined && input.sortBy.trim() !== '') {
    params.sortBy = input.sortBy;
  }
  return params;
}

export function generateIdempotencyKey(prefix?: string): string {
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return prefix ? `${prefix}-${uuid}` : uuid;
}
