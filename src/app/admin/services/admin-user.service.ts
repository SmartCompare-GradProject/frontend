import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '@app/core/models/api-response.model';
import { PagedResponse } from '@app/core/models/product-api.model';
import { AdminUserListItemDto } from '@app/admin/models/admin-user.model';
import { AdminUserMockService } from '@app/admin/services/mocks/admin-user.mock.service';

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly http = inject(HttpClient);
  private readonly mock = inject(AdminUserMockService);
  private readonly apiUrl = `${environment.apiUrl}/api/v1`;

  listUsers(page = 0, size = 20): Observable<PagedResponse<AdminUserListItemDto>> {
    if (environment.useMockAdminApi) {
      return this.mock.listUsers(page, size);
    }

    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    return this.http
      .get<ApiResponse<PagedResponse<AdminUserListItemDto>>>(`${this.apiUrl}/admin/users`, {
        params,
      })
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

  deleteUser(id: number): Observable<void> {
    if (environment.useMockAdminApi) {
      return this.mock.deleteUser(id);
    }

    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/admin/users/${id}`)
      .pipe(map(() => void 0));
  }
}
