import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '@app/core/models/api-response.model';

export function extractApiError(err: HttpErrorResponse, fallback: string): string {
  const body = err.error as ApiResponse<unknown> | undefined;
  const message = body?.message?.trim();

  if (message) {
    return message;
  }

  if (err.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  return fallback;
}
