import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '@app/core/models/api-response.model';
import { PagedResponse } from '@app/core/models/product-api.model';
import {
  AdminProductListItemDto,
  CreateProductRequest,
  UpdateProductRequest,
} from '@app/admin/models/admin-product.model';
import { AdminProductMockService } from '@app/admin/services/mocks/admin-product.mock.service';

@Injectable({ providedIn: 'root' })
export class AdminProductService {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(AdminProductMockService);
  private readonly apiUrl = `${environment.apiUrl}/api/v1`;

  listProducts(
    categorySlug: string,
    page = 0,
    size = 20,
  ): Observable<PagedResponse<AdminProductListItemDto>> {
    if (environment.useMockAdminApi) {
      return this.mock.listProducts(categorySlug, page, size);
    }

    const params = new HttpParams()
      .set('categorySlug', categorySlug)
      .set('page', String(page))
      .set('size', String(size));

    return this.http
      .get<ApiResponse<PagedResponse<AdminProductListItemDto>>>(
        `${this.apiUrl}/admin/products`,
        { params },
      )
      .pipe(
        map(
          (response) =>
            response.data ?? {
              content: [],
              page,
              size,
              totalElements: 0,
              totalPages: 0,
              first: true,
              last: true,
            },
        ),
      );
  }

  getProduct(id: number): Observable<AdminProductListItemDto> {
    if (environment.useMockAdminApi) {
      return this.mock.getProduct(id);
    }

    return this.http
      .get<ApiResponse<AdminProductListItemDto>>(`${this.apiUrl}/admin/products/${id}`)
      .pipe(map((response) => response.data));
  }

  createProduct(body: CreateProductRequest): Observable<AdminProductListItemDto> {
    if (environment.useMockAdminApi) {
      return this.mock.createProduct(body);
    }

    return this.http
      .post<ApiResponse<AdminProductListItemDto>>(`${this.apiUrl}/admin/products`, body)
      .pipe(map((response) => response.data));
  }

  updateProduct(
    id: number,
    body: UpdateProductRequest,
  ): Observable<AdminProductListItemDto> {
    if (environment.useMockAdminApi) {
      return this.mock.updateProduct(id, body);
    }

    const { categorySlug: _categorySlug, ...apiBody } = body;

    return this.http
      .put<ApiResponse<AdminProductListItemDto>>(`${this.apiUrl}/admin/products/${id}`, apiBody)
      .pipe(
        tap((response) => console.log('Save Successful!', response)),
        map((response) => response.data),
      );
  }

  deleteProduct(id: number): Observable<void> {
    if (environment.useMockAdminApi) {
      return this.mock.deleteProduct(id);
    }

    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/admin/products/${id}`)
      .pipe(map(() => void 0));
  }
}
