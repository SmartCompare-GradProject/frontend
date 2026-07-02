import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from '@app/core/services/auth-state.service';

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/register');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const authState = inject(AuthStateService);
  const isAdminRequest = req.url.includes('/admin/');
  const token = isAdminRequest
    ? authState.getAdminToken()
    : authState.getConsumerToken();

  const outbound = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(outbound).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token && !isAuthEndpoint(req.url)) {
        if (isAdminRequest || authState.isAdmin()) {
          authState.adminLogout();
        } else {
          authState.consumerLogout();
        }
      }

      return throwError(() => error);
    }),
  );
};
