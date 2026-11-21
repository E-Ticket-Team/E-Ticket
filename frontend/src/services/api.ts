import type {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  HealthResponse,
} from '../types/api';

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
export const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
export const API_V1 = `${BASE_URL}/api/v1`;

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  statusCode: number;
  errorType: string;
  details: string[];

  constructor(statusCode: number, errorType: string, message: string | string[]) {
    const details = Array.isArray(message) ? message : [message];
    super(details.join(' • '));
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
  }
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit & { skipUnauthorizedCallback?: boolean },
): Promise<T> {
  const { skipUnauthorizedCallback, ...fetchOptions } = options ?? {};

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(fetchOptions.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      if (response.status === 401 && !skipUnauthorizedCallback && unauthorizedHandler) {
        unauthorizedHandler();
      }
      throw new ApiError(response.status, response.statusText, 'Request failed');
    }
    return undefined as T;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(
      response.status,
      'Invalid Response',
      `Unexpected non-JSON response (${response.status})`,
    );
  }

  if (!response.ok) {
    if (response.status === 401 && !skipUnauthorizedCallback && unauthorizedHandler) {
      unauthorizedHandler();
    }
    const errPayload = parsed as Partial<ApiErrorEnvelope>;
    throw new ApiError(
      errPayload.statusCode ?? response.status,
      errPayload.error ?? response.statusText,
      errPayload.message ?? 'An unexpected error occurred',
    );
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'success' in parsed &&
    (parsed as ApiSuccessEnvelope<T>).success === true &&
    'data' in parsed
  ) {
    return (parsed as ApiSuccessEnvelope<T>).data;
  }

  return parsed as T;
}

export const healthApi = {
  getHealth(): Promise<HealthResponse> {
    return apiRequest<HealthResponse>(`${BASE_URL}/health`, {
      skipUnauthorizedCallback: true,
    });
  },
};
