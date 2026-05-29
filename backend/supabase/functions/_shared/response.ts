import { HTTP_STATUS } from './constants/http-status.ts';
import type { ApiError, ApiMeta, ApiResponse } from './schemas/api-response.ts';

export function jsonResponse<T>(body: ApiResponse<T>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function okResponse<T>(data: T, meta?: ApiMeta, status: number = HTTP_STATUS.OK): Response {
  return jsonResponse<T>({ success: true, data, meta }, status);
}

export function errorResponse(error: ApiError, status: number, meta?: ApiMeta): Response {
  return jsonResponse<never>({ success: false, error, meta }, status);
}
