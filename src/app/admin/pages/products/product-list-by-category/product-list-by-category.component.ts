import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminProductService } from '@app/admin/services/admin-product.service';
import { AdminCategoryService } from '@app/admin/services/admin-category.service';
import { AdminProductListItemDto } from '@app/admin/models/admin-product.model';
import { AdminCategoryDto } from '@app/admin/models/admin-category.model';
import {
  Product,
  ProductListingService,
} from '@app/core/services/product-listing.service';
import { IconComponent } from '@app/shared/components/icon/icon.component';

@Component({
  selector: 'app-product-list-by-category',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './product-list-by-category.component.html',
})
export class ProductListByCategoryComponent implements OnInit {
  private readonly productService = inject(AdminProductService);
  private readonly categoryService = inject(AdminCategoryService);
  private readonly productListingService = inject(ProductListingService);
  private readonly route = inject(ActivatedRoute);

  protected readonly pageSize = 20;

  protected readonly categories = signal<AdminCategoryDto[]>([]);
  protected readonly products = signal<AdminProductListItemDto[]>([]);
  protected readonly selectedCategorySlug = signal('');
  protected searchQuery = '';
  protected readonly appliedSearchQuery = signal('');
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly successMessage = signal('');
  protected readonly deleteError = signal('');
  protected readonly deletingProductId = signal<number | null>(null);

  protected readonly selectedCategoryName = computed(() => {
    const slug = this.selectedCategorySlug();
    return this.categories().find((c) => c.slug === slug)?.name ?? slug;
  });

  protected readonly searchPlaceholder = computed(
    () => `Search ${this.selectedCategoryName()}...`,
  );

  protected readonly isSearchActive = computed(() => this.appliedSearchQuery().length > 0);

  protected readonly canGoPrevious = computed(() => this.currentPage() > 0);
  protected readonly canGoNext = computed(() => {
    const total = this.totalPages();
    return total > 0 && this.currentPage() < total - 1;
  });

  ngOnInit(): void {
    const state = history.state as { productSaved?: boolean; categorySlug?: string };
    if (state?.productSaved) {
      this.successMessage.set('Product saved successfully.');
    }

    this.loadCategories(this.resolvePreferredCategorySlug(state?.categorySlug));
  }

  private resolvePreferredCategorySlug(stateSlug?: string): string {
    return (
      stateSlug?.trim() ||
      this.route.snapshot.queryParamMap.get('categorySlug')?.trim() ||
      ''
    );
  }

  protected selectCategory(slug: string): void {
    if (slug === this.selectedCategorySlug()) {
      return;
    }

    this.selectedCategorySlug.set(slug);
    this.searchQuery = '';
    this.appliedSearchQuery.set('');
    this.currentPage.set(0);
    this.loadProducts();
  }

  protected executeSearch(): void {
    this.appliedSearchQuery.set(this.searchQuery.trim());
    this.currentPage.set(0);
    this.loadProducts();
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.executeSearch();
    }
  }

  protected goToPreviousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.currentPage.update((page) => page - 1);
    this.loadProducts();
  }

  protected goToNextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.currentPage.update((page) => page + 1);
    this.loadProducts();
  }

  protected parseSpecsPreview(specs: string): string {
    try {
      const parsed = JSON.parse(specs) as Record<string, unknown>;
      const keys = Object.keys(parsed).slice(0, 2);
      return keys.map((k) => `${k}: ${parsed[k]}`).join(' · ');
    } catch {
      return '—';
    }
  }

  protected deleteProduct(product: AdminProductListItemDto): void {
    if (this.deletingProductId() !== null) {
      return;
    }

    const confirmed = confirm(`Delete product "${product.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.deleteError.set('');
    this.deletingProductId.set(product.id);

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.deletingProductId.set(null);
        this.loadProducts();
      },
      error: (err: HttpErrorResponse) => {
        this.deletingProductId.set(null);
        this.deleteError.set(
          err.status === 403
            ? 'This product cannot be deleted.'
            : 'Failed to delete product. Please try again.',
        );
      },
    });
  }

  private loadCategories(preferredSlug = ''): void {
    this.loading.set(true);
    this.error.set('');

    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);

        const matchedSlug = categories.find((category) => category.slug === preferredSlug)?.slug;
        const selectedSlug = matchedSlug ?? categories[0]?.slug ?? '';
        this.selectedCategorySlug.set(selectedSlug);

        if (selectedSlug) {
          this.loadProducts();
        } else {
          this.products.set([]);
          this.totalElements.set(0);
          this.totalPages.set(0);
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set('Failed to load categories. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private loadProducts(): void {
    const slug = this.selectedCategorySlug();
    if (!slug) {
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const query = this.appliedSearchQuery();
    if (query) {
      this.productListingService
        .getProducts({
          type: slug,
          q: query,
          page: this.currentPage(),
          size: this.pageSize,
        })
        .subscribe({
          next: (page) => {
            this.products.set(
              page.products.map((product) => this.mapSearchProductToAdminItem(product)),
            );
            this.currentPage.set(page.page);
            this.totalPages.set(page.totalPages);
            this.totalElements.set(page.totalElements);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Failed to search products. Please try again.');
            this.products.set([]);
            this.loading.set(false);
          },
        });
      return;
    }

    this.productService.listProducts(slug, this.currentPage(), this.pageSize).subscribe({
      next: (page) => {
        this.products.set(page.content);
        this.currentPage.set(page.page);
        this.totalPages.set(page.totalPages);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load products. Please try again.');
        this.products.set([]);
        this.loading.set(false);
      },
    });
  }

  private mapSearchProductToAdminItem(product: Product): AdminProductListItemDto {
    const preview = product.mainSpecs?.join(' · ') ?? '—';

    return {
      id: product.id,
      name: product.title,
      brand: product.subtitle,
      categorySlug: product.type ?? this.selectedCategorySlug(),
      categoryName: this.selectedCategoryName(),
      image: product.imageUrl,
      hasVariants: false,
      specs: JSON.stringify({ preview }),
      releaseDate: null,
      sourceUrl: null,
    };
  }
}
