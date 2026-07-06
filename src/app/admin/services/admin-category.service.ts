import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '@app/core/models/api-response.model';
import {
  AdminCategoryDto,
  CreateCategoryRequest,
} from '@app/admin/models/admin-category.model';

@Injectable({ providedIn: 'root' })
export class AdminCategoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1`;

  getCategories(): Observable<AdminCategoryDto[]> {
    return this.http
      .get<ApiResponse<AdminCategoryDto[]>>(`${this.apiUrl}/admin/categories`)
      .pipe(map((response) => response.data ?? []));
  }

  createCategory(body: CreateCategoryRequest): Observable<AdminCategoryDto> {
    return this.http
      .post<ApiResponse<AdminCategoryDto>>(`${this.apiUrl}/admin/categories`, body)
      .pipe(map((response) => response.data));
  }

  deleteCategory(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/admin/categories/${id}`)
      .pipe(map(() => void 0));
  }
}
