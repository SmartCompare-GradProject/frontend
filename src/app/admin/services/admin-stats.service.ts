import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { AdminDashboardStats } from '@app/admin/models/admin-stats.model';
import { AdminCategoryService } from '@app/admin/services/admin-category.service';
import { AdminProductService } from '@app/admin/services/admin-product.service';
import { AdminUserService } from '@app/admin/services/admin-user.service';

@Injectable({ providedIn: 'root' })
export class AdminStatsService {
  private readonly categoryService = inject(AdminCategoryService);
  private readonly productService = inject(AdminProductService);
  private readonly userService = inject(AdminUserService);

  getDashboardStats(): Observable<AdminDashboardStats> {
    return this.categoryService.getCategories().pipe(
      switchMap((categories) => {
        const productCountRequests = categories.map((category) =>
          this.productService.listProducts(category.slug, 0, 1).pipe(
            map((page) => page.totalElements),
          ),
        );

        return forkJoin({
          categories: of(categories),
          productCounts:
            productCountRequests.length > 0 ? forkJoin(productCountRequests) : of([] as number[]),
          users: this.userService.listUsers(0, 1),
        });
      }),
      map(({ categories, productCounts, users }) => ({
        totalProducts: productCounts.reduce((sum, count) => sum + count, 0),
        totalUsers: users.totalElements,
        totalCategories: categories.length,
        categoryNames: categories.map((category) => category.name),
      })),    );
  }
}
