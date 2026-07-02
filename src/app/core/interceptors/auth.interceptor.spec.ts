import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthStateService } from '@app/core/services/auth-state.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authState: {
    getConsumerToken: ReturnType<typeof vi.fn>;
    getAdminToken: ReturnType<typeof vi.fn>;
    consumerLogout: ReturnType<typeof vi.fn>;
    adminLogout: ReturnType<typeof vi.fn>;
    isAdmin: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authState = {
      getConsumerToken: vi.fn(),
      getAdminToken: vi.fn(),
      consumerLogout: vi.fn(),
      adminLogout: vi.fn(),
      isAdmin: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: AuthStateService, useValue: authState },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Happy Paths — Authorization header', () => {
    it('should attach a Bearer token to outbound consumer requests when a token exists', () => {
      authState.getConsumerToken.mockReturnValue('consumer-jwt-token');

      http.get('/api/v1/products').subscribe();

      const req = httpMock.expectOne('/api/v1/products');
      expect(req.request.headers.get('Authorization')).toBe('Bearer consumer-jwt-token');
      req.flush({});
    });

    it('should attach an admin token for /admin/ requests', () => {
      authState.getAdminToken.mockReturnValue('admin-jwt-token');

      http.get('/api/v1/admin/products').subscribe();

      const req = httpMock.expectOne('/api/v1/admin/products');
      expect(req.request.headers.get('Authorization')).toBe('Bearer admin-jwt-token');
      req.flush({});
    });

    it('should not attach Authorization when no token is present', () => {
      authState.getConsumerToken.mockReturnValue(null);

      http.get('/api/v1/products').subscribe();

      const req = httpMock.expectOne('/api/v1/products');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });
  });

  describe('Sad Paths — 401 auto-logout', () => {
    it('should call consumerLogout on 401 for authenticated consumer requests', () => {
      authState.getConsumerToken.mockReturnValue('expired-token');

      http.get('/api/v1/preferences').subscribe({
        error: () => undefined,
      });

      const req = httpMock.expectOne('/api/v1/preferences');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(authState.consumerLogout).toHaveBeenCalledTimes(1);
      expect(authState.adminLogout).not.toHaveBeenCalled();
    });

    it('should call adminLogout on 401 for admin requests', () => {
      authState.getAdminToken.mockReturnValue('expired-admin-token');
      authState.isAdmin.mockReturnValue(true);

      http.get('/api/v1/admin/users').subscribe({
        error: () => undefined,
      });

      const req = httpMock.expectOne('/api/v1/admin/users');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(authState.adminLogout).toHaveBeenCalledTimes(1);
    });

    it('should not logout on 401 for auth login/register endpoints', () => {
      authState.getConsumerToken.mockReturnValue('bad-token');

      http.post('/api/v1/auth/login', {}).subscribe({
        error: () => undefined,
      });

      const req = httpMock.expectOne('/api/v1/auth/login');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(authState.consumerLogout).not.toHaveBeenCalled();
      expect(authState.adminLogout).not.toHaveBeenCalled();
    });

    it('should not logout on 401 when no token was sent', () => {
      authState.getConsumerToken.mockReturnValue(null);

      http.get('/api/v1/products').subscribe({
        error: () => undefined,
      });

      const req = httpMock.expectOne('/api/v1/products');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(authState.consumerLogout).not.toHaveBeenCalled();
      expect(authState.adminLogout).not.toHaveBeenCalled();
    });
  });
});
