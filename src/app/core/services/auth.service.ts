import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '@app/core/models/api-response.model';
import { LoginResponse } from '@app/core/models/auth-session.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1`;

  register(email: string, password: string): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.apiUrl}/auth/register`, { email, password })
      .pipe(map((res) => res.data));
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(map((res) => res.data));
  }
}
