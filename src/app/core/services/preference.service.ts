import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '@app/core/models/api-response.model';
import type {
  PreferenceOptionsResponse,
  SetUserPreferenceRequest,
  UserPreferenceResponse,
} from '@app/core/models/preference-api.model';

@Injectable({
  providedIn: 'root',
})
export class PreferenceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1`;

  getOptions(): Observable<PreferenceOptionsResponse> {
    return this.http
      .get<ApiResponse<PreferenceOptionsResponse>>(`${this.apiUrl}/preferences/options`)
      .pipe(map((response) => response.data));
  }

  getPreferences(): Observable<UserPreferenceResponse[]> {
    return this.http
      .get<ApiResponse<UserPreferenceResponse[]>>(`${this.apiUrl}/preferences`)
      .pipe(map((response) => response.data ?? []));
  }

  savePreferences(payload: SetUserPreferenceRequest[]): Observable<UserPreferenceResponse[]> {
    return this.http
      .post<ApiResponse<UserPreferenceResponse[]>>(`${this.apiUrl}/preferences`, payload)
      .pipe(
        tap((response) => console.log('Save Successful!', response)),
        map((response) => response.data ?? []),
      );
  }

  editPreference(
    productCategoryId: number,
    preferencesJson: string,
  ): Observable<UserPreferenceResponse> {
    return this.http
      .put<ApiResponse<UserPreferenceResponse>>(
        `${this.apiUrl}/preferences/${productCategoryId}`,
        preferencesJson,
        { headers: { 'Content-Type': 'application/json' } },
      )
      .pipe(
        tap((response) => console.log('Save Successful!', response)),
        map((response) => response.data),
      );
  }
}
