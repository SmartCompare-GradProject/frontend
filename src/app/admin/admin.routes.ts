import { Routes } from '@angular/router';
import { adminAuthGuard } from './guards/admin-auth.guard';
import { AdminShellComponent } from './layout/admin-shell.component';
import { AdminDashboardComponent } from './pages/dashboard/admin-dashboard.component';
import { ProductListByCategoryComponent } from './pages/products/product-list-by-category/product-list-by-category.component';
import { ProductCreateComponent } from './pages/products/product-create/product-create.component';
import { ProductEditComponent } from './pages/products/product-edit/product-edit.component';
import { CategoryListComponent } from './pages/categories/category-list/category-list.component';
import { UserListComponent } from './pages/users/user-list/user-list.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [adminAuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
      },
      {
        path: 'products',
        component: ProductListByCategoryComponent,
      },
      {
        path: 'products/new',
        component: ProductCreateComponent,
      },
      {
        path: 'categories',
        component: CategoryListComponent,
      },
      {
        path: 'products/:id/edit',
        component: ProductEditComponent,
      },
      {
        path: 'users',
        component: UserListComponent,
      },
    ],
  },
];
