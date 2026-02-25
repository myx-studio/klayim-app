export interface Timestamps {
  createdAt: string;
  updatedAt?: string;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}
