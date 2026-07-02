import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '@app/shared/components/navbar/navbar.component';
import { LandingFooterComponent } from '@app/shared/components/landing-footer/landing-footer.component';
import {
  ProductListingService,
  Product,
  FilterMetadata,
  ProductSearchFilters,
  PRODUCT_LISTING_PAGE_SIZE,
  mapListingSortToApi,
} from '@app/core/services/product-listing.service';
import { ProductCardComponent } from '@app/shared/components/product-card/product-card.component';
import { AuthStateService } from '@app/core/services/auth-state.service';
import { CATEGORY_LABELS, PRODUCT_CATEGORY_OPTIONS } from '@app/core/config/product-categories.config';
import { switchMap, tap, catchError, finalize, distinctUntilChanged, map } from 'rxjs/operators';
import { of } from 'rxjs';

const SORT_OPTIONS = [
  { label: 'Best Match', value: 'recommended' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
] as const;

@Component({
  selector: 'app-product-listing',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NavbarComponent, LandingFooterComponent, ProductCardComponent],
  templateUrl: './product-listing.component.html'
})
export class ProductListingComponent implements OnInit {
  private readonly productListingService = inject(ProductListingService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  
  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly skeletonSlots = [1, 2, 3, 4, 5, 6, 7, 8];
  readonly pageTitle = signal('Products');
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  readonly selectedIds = this.productListingService.selectedIds;
  readonly sortOptions = SORT_OPTIONS;
  readonly categoryOptions = PRODUCT_CATEGORY_OPTIONS;

  readonly showBadgeLegend = computed(
    () =>
      this.authState.isConsumerLoggedIn() &&
      !this.isLoading() &&
      this.products().some((product) => product.showMatchBadge),
  );

  readonly canGoPrevious = computed(() => this.currentPage() > 0);
  readonly canGoNext = computed(() => this.currentPage() < this.totalPages() - 1);

  readonly availableFilters = signal<FilterMetadata>({
    brands: [], minPrice: 0, maxPrice: 100_000, specs: {}
  });

  readonly currentMinPrice = signal(0);
  readonly currentMaxPrice = signal(100_000);

  activeFilters = {
    type: 'phone',
    q: '',
    brands: [] as string[],
    minPrice: 0,
    maxPrice: 100_000,
    page: 0,
    sort: 'recommended',
  };

  specFilters: Record<string, string[]> = {};

  private readonly expandedMobileFilters = signal<Set<string>>(new Set());

  private lastFetchedType = '';

  ngOnInit() {
    this.route.queryParams.pipe(
      map((params) => this.serializeQueryParams(params)),
      distinctUntilChanged(),
      map((serialized) => JSON.parse(serialized) as Record<string, string>),
      tap((params) => {
        this.isLoading.set(true);
        this.activeFilters.type = params['type'] || 'phone';
        this.activeFilters.q = params['q'] || '';
        this.activeFilters.brands = params['brands'] ? params['brands'].split(',') : [];
        this.activeFilters.minPrice = this.parseMinPriceParam(params['minPrice']);
        this.activeFilters.maxPrice = this.parseMaxPriceParam(params['maxPrice']);
        this.activeFilters.page = this.parsePageParam(params['page']);
        this.activeFilters.sort = this.parseSortParam(params['sort']);
        this.currentMinPrice.set(this.activeFilters.minPrice);
        this.currentMaxPrice.set(this.activeFilters.maxPrice);

        this.syncSpecFiltersFromParams(params);

        const categoryLabel = CATEGORY_LABELS[this.activeFilters.type] ?? this.activeFilters.type;
        this.pageTitle.set(
          this.activeFilters.q
            ? `Results for "${this.activeFilters.q}"`
            : categoryLabel,
        );

        if (this.activeFilters.type !== this.lastFetchedType) {
          this.productListingService.getFilterMetadata(this.activeFilters.type).subscribe({
            next: (meta) => {
              this.availableFilters.set(meta);
              this.activeFilters.minPrice = this.clampMinPrice(
                params['minPrice'] != null && params['minPrice'] !== ''
                  ? this.parseMinPriceParam(params['minPrice'])
                  : meta.minPrice,
                meta.minPrice,
                meta.maxPrice,
              );
              this.activeFilters.maxPrice = this.clampMaxPrice(
                params['maxPrice'] != null && params['maxPrice'] !== ''
                  ? this.parseMaxPriceParam(params['maxPrice'])
                  : meta.maxPrice,
                meta.minPrice,
                meta.maxPrice,
              );
              this.currentMinPrice.set(this.activeFilters.minPrice);
              this.currentMaxPrice.set(this.activeFilters.maxPrice);
              this.syncSpecFiltersFromParams(params, meta.specs);
            },
          });
          this.lastFetchedType = this.activeFilters.type;
        }
      }),
      switchMap(() => this.loadProducts()),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (data) => {
        this.products.set(data.products);
        this.currentPage.set(data.page);
        this.totalPages.set(data.totalPages);
        this.totalElements.set(data.totalElements);
        this.isLoading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.currentPage.set(0);
        this.totalPages.set(0);
        this.totalElements.set(0);
        this.isLoading.set(false);
      },
    });
  }

  private loadProducts() {
    this.isLoading.set(true);

    return this.productListingService.getProducts(this.buildSearchFilters()).pipe(
      catchError(() => of({ products: [], page: 0, totalPages: 0, totalElements: 0 })),
      finalize(() => this.isLoading.set(false)),
    );
  }

  private buildSearchFilters(): ProductSearchFilters {
    const filters: ProductSearchFilters = {
      type: this.activeFilters.type,
      q: this.activeFilters.q || undefined,
      brands: this.activeFilters.brands.length ? this.activeFilters.brands.join(',') : undefined,
      minPrice: this.getMinPriceForApi(),
      maxPrice: this.getMaxPriceForApi(),
      sort: this.activeFilters.sort,
      page: this.activeFilters.page,
      size: PRODUCT_LISTING_PAGE_SIZE,
    };

    for (const [key, values] of Object.entries(this.specFilters)) {
      if (values.length) {
        filters[key] = values.join(',');
      }
    }

    return filters;
  }

  /** Only send minPrice when above the catalog minimum (active filter). */
  private getMinPriceForApi(): number | undefined {
    const value = Math.round(this.activeFilters.minPrice);
    if (!Number.isFinite(value)) {
      return undefined;
    }

    const catalogMin = this.priceRangeMin();
    if (value <= catalogMin) {
      return undefined;
    }

    return value;
  }

  /** Only send maxPrice when below the catalog maximum (active filter). */
  private getMaxPriceForApi(): number | undefined {
    const value = Math.round(this.activeFilters.maxPrice);
    if (!Number.isFinite(value)) {
      return undefined;
    }

    const catalogMax = this.priceRangeMax();
    if (value >= catalogMax) {
      return undefined;
    }

    return value;
  }

  isPriceFilterActive(): boolean {
    return this.getMinPriceForApi() != null || this.getMaxPriceForApi() != null;
  }

  private serializeQueryParams(params: Record<string, string | undefined>): string {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') {
        normalized[key] = String(value);
      }
    }

    const sortedKeys = Object.keys(normalized).sort();
    const sorted: Record<string, string> = {};
    for (const key of sortedKeys) {
      sorted[key] = normalized[key];
    }

    return JSON.stringify(sorted);
  }

  specFilterKeys(): string[] {
    return Object.keys(this.availableFilters().specs);
  }

  formatSpecLabel(key: string): string {
    if (key.toLowerCase() === 'ram') {
      return 'RAM';
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  isMobileFilterExpanded(key: string): boolean {
    return this.expandedMobileFilters().has(key);
  }

  toggleMobileFilter(key: string): void {
    this.expandedMobileFilters.update((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  private collapseMobileFilters(): void {
    this.expandedMobileFilters.set(new Set());
  }

  isSpecValueSelected(specKey: string, value: string): boolean {
    return (this.specFilters[specKey] ?? []).includes(value);
  }

  onSearch() {
    this.activeFilters.page = 0;
    this.updateUrl();
  }

  onSortChange() {
    this.activeFilters.page = 0;
    this.updateUrl();
  }

  onTypeChange() {
    this.activeFilters.brands = [];
    this.activeFilters.page = 0;
    this.specFilters = {};
    this.collapseMobileFilters();
    this.updateUrl();
  }

  goToPreviousPage() {
    if (!this.canGoPrevious()) {
      return;
    }
    this.activeFilters.page = this.currentPage() - 1;
    this.updateUrl();
  }

  goToNextPage() {
    if (!this.canGoNext()) {
      return;
    }
    this.activeFilters.page = this.currentPage() + 1;
    this.updateUrl();
  }

  toggleArrayFilter(category: 'brands', value: string) {
    const list = this.activeFilters[category];
    this.activeFilters[category] = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
    this.activeFilters.page = 0;
    this.updateUrl();
  }

  toggleSpecFilter(specKey: string, value: string) {
    const current = this.specFilters[specKey] ?? [];
    this.specFilters[specKey] = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    this.activeFilters.page = 0;
    this.updateUrl();
  }

  applyPriceFilter(): void {
    const catalogMin = this.priceRangeMin();
    const catalogMax = this.priceRangeMax();

    let min = this.clampMinPrice(Number(this.currentMinPrice()), catalogMin, catalogMax);
    let max = this.clampMaxPrice(Number(this.currentMaxPrice()), catalogMin, catalogMax);

    if (min > max) {
      [min, max] = [max, min];
    }

    this.activeFilters.minPrice = min;
    this.activeFilters.maxPrice = max;
    this.currentMinPrice.set(min);
    this.currentMaxPrice.set(max);
    this.activeFilters.page = 0;
    this.updateUrl();
  }

  priceRangeMin(): number {
    return this.toApiPrice(this.availableFilters().minPrice) ?? 0;
  }

  priceRangeMax(): number {
    return this.toApiPrice(this.availableFilters().maxPrice) ?? 100_000;
  }

  priceInputStep(): number {
    const range = this.priceRangeMax() - this.priceRangeMin();
    if (range <= 1_000) {
      return 1;
    }
    if (range <= 10_000) {
      return 10;
    }
    return 100;
  }

  clearFilters() {
    this.activeFilters.q = '';
    this.activeFilters.brands = [];
    this.activeFilters.minPrice = this.priceRangeMin();
    this.activeFilters.maxPrice = this.priceRangeMax();
    this.currentMinPrice.set(this.activeFilters.minPrice);
    this.currentMaxPrice.set(this.activeFilters.maxPrice);
    this.activeFilters.page = 0;
    this.activeFilters.sort = 'recommended';
    this.specFilters = {};
    this.updateUrl();
  }

  private parsePageParam(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  }

  private parseSortParam(value: unknown): string {
    const sort = String(value ?? '').trim().toLowerCase();
    if (sort === 'price_asc' || sort === 'price_desc') {
      return sort;
    }
    if (sort === 'recommended' || sort === 'best match') {
      return 'recommended';
    }
    return 'recommended';
  }

  /** Strips commas and coerces URL / input values to a finite integer. */
  private parseMinPriceParam(value: unknown): number {
    if (value == null || value === '') {
      return this.priceRangeMin();
    }

    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? Math.round(parsed) : this.priceRangeMin();
  }

  /** Strips commas and coerces URL / input values to a finite integer. */
  private parseMaxPriceParam(value: unknown): number {
    if (value == null || value === '') {
      return this.priceRangeMax();
    }

    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? Math.round(parsed) : this.priceRangeMax();
  }

  /** Ensures only a raw integer is sent to the products API. */
  private toApiPrice(value: unknown): number | undefined {
    const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    return Math.round(parsed);
  }

  private clampMinPrice(value: number, min: number, max: number): number {
    const safeMin = this.toApiPrice(min) ?? 0;
    const safeMax = this.toApiPrice(max) ?? value;
    return Math.min(Math.max(Math.round(value), safeMin), safeMax);
  }

  private clampMaxPrice(value: number, min: number, max: number): number {
    const safeMin = this.toApiPrice(min) ?? 0;
    const safeMax = this.toApiPrice(max) ?? value;
    return Math.min(Math.max(Math.round(value), safeMin), safeMax);
  }

  private updateUrl() {
    const minPrice = this.getMinPriceForApi();
    const maxPrice = this.getMaxPriceForApi();
    const apiSort = mapListingSortToApi(this.activeFilters.sort);
    const queryParams: Record<string, string | number | null> = {
      type: this.activeFilters.type,
      q: this.activeFilters.q || null,
      brands: this.activeFilters.brands.length ? this.activeFilters.brands.join(',') : null,
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
      page: this.activeFilters.page > 0 ? this.activeFilters.page : null,
      sort: apiSort ?? null,
    };

    for (const [key, values] of Object.entries(this.specFilters)) {
      queryParams[key] = values.length ? values.join(',') : null;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  private syncSpecFiltersFromParams(
    params: Record<string, string | undefined>,
    specs: Record<string, string[]> = this.availableFilters().specs,
  ): void {
    const next: Record<string, string[]> = {};

    for (const key of Object.keys(specs)) {
      const raw = params[key];
      next[key] = raw ? raw.split(',').filter(Boolean) : [];
    }

    this.specFilters = next;
  }

  toggleCompare(id: number) { this.productListingService.toggleComparison(id); }
  goToComparison() { this.router.navigate(['/compare']); }
}
