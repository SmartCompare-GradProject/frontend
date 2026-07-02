import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ToastService } from '@app/core/services/toast.service';
import type { ProductCardDto } from '@app/core/models';
import type {
  ProductCardApi,
  ProductDetailApi,
  PagedResponse,
  FilterPayloadApi,
  AiSummaryPayloadApi,
} from '@app/core/models/product-api.model';
import {
  normalizeCategorySlug,
  mapProductCardsToProducts,
  mapProductDetailToProductDetails,
  mapFilterPayloadToMetadata,
  mapAiSummaryPayload,
} from '@app/core/mappers/product.mapper';

export interface Product extends ProductCardDto {
  id: number;
  matchScore?: number;
  type?: string;
  mainSpecs?: string[];
}

export interface SpecItem {
  label: string;
  value: string;
  isEstimated?: boolean;
}

export interface SpecGroup {
  name: string;
  icon: string;
  items: SpecItem[];
}

export interface VendorInfo {
  name: string;
  price: string;
  priceValue?: number | null;
  url: string;
  availability?: string | null;
  letter: string;
}

export interface ProductDetails extends Product {
  reviews: number;
  specGroups: SpecGroup[];
  vendors: VendorInfo[];
}

export interface AiSummary {
  summaryText: string;
  requiresLogin?: boolean;
  requiresPreferences?: boolean;
}

export interface ProductListingPage {
  products: Product[];
  page: number;
  totalPages: number;
  totalElements: number;
}

export interface ProductSearchFilters {
  type: string;
  q?: string;
  brands?: string;
  maxPrice?: number;
  minPrice?: number;
  sort?: string;
  page?: number;
  size?: number;
  [specKey: string]: string | number | undefined;
}

/** Hard cap on products fetched per request — prevents massive payloads freezing the UI. */
export const PRODUCT_LISTING_PAGE_SIZE = 12;

/** Maps UI sort values to backend query params (`price_asc` / `price_desc` only). */
export function mapListingSortToApi(sort?: string): string | undefined {
  const normalized = (sort ?? '').trim().toLowerCase();

  if (normalized === 'price_asc' || normalized === 'price_desc') {
    return normalized;
  }

  // Best Match / recommended → omit `sort` so preference-based ranking can apply
  // when no other explicit filters are present (per API contract).
  return undefined;
}

export interface FilterMetadata {
  brands: string[];
  minPrice: number;
  maxPrice: number;
  specs: { [key: string]: string[] };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  errorCode: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProductListingService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly apiUrl = environment.apiBaseUrl;

  selectedIds = signal<number[]>([]);

  private static readonly MAX_COMPARE = 4;

  constructor() {
    this.registerComparisonSelectionReset();
  }

  private registerComparisonSelectionReset(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (!this.shouldPreserveComparisonSelection(event.urlAfterRedirects)) {
          this.clearComparison();
        }
      });
  }

  /** Keep compare picks only while browsing products or viewing the compare page. */
  private shouldPreserveComparisonSelection(url: string): boolean {
    const path = url.split('?')[0].split('#')[0];

    if (path === '/' || path === '/products' || path === '/compare') {
      return true;
    }

    return /^\/products\/\d+$/.test(path);
  }

  toggleComparison(id: number) {
    this.selectedIds.update((current) => {
      if (current.includes(id)) {
        return current.filter((itemId) => itemId !== id);
      }

      if (current.length >= ProductListingService.MAX_COMPARE) {
        this.toast.showWarning('You can only compare up to 4 products at a time.');
        return current;
      }

      return [...current, id];
    });
  }

  setSelection(id: number) {
    this.selectedIds.set([id]);
  }

  clearComparison() {
    this.selectedIds.set([]);
  }

  getTrendingProducts(): Observable<Product[]> {
    return this.http
      .get<ApiResponse<ProductCardApi[]>>(`${this.apiUrl}/products/trending`)
      .pipe(
        map((response) => mapProductCardsToProducts(response.data ?? [])),
        catchError(() => of([])),
      );
  }

  getFilterMetadata(type: string): Observable<FilterMetadata> {
    const category = normalizeCategorySlug(type);

    return this.http
      .get<ApiResponse<FilterPayloadApi>>(`${this.apiUrl}/filters`, {
        params: new HttpParams().set('type', category),
      })
      .pipe(
        map((response) =>
          response.data
            ? mapFilterPayloadToMetadata(response.data)
            : { brands: [], minPrice: 0, maxPrice: 5000, specs: {} },
        ),
      );
  }

  getProducts(filters: ProductSearchFilters): Observable<ProductListingPage> {
    const category = normalizeCategorySlug(filters.type);
    const page = Math.max(0, filters.page ?? 0);
    const size = Math.min(
      Math.max(1, filters.size ?? PRODUCT_LISTING_PAGE_SIZE),
      PRODUCT_LISTING_PAGE_SIZE,
    );

    let params = new HttpParams()
      .set('category', category)
      .set('page', String(page))
      .set('size', String(size));

    if (filters.q) params = params.set('q', filters.q);
    if (filters.brands) {
      for (const brand of filters.brands.split(',').map((b) => b.trim()).filter(Boolean)) {
        params = params.append('brands', brand);
      }
    }

    if (filters.minPrice != null && Number.isFinite(filters.minPrice)) {
      params = params.set('minPrice', String(Math.round(filters.minPrice)));
    }

    if (filters.maxPrice != null && Number.isFinite(filters.maxPrice)) {
      params = params.set('maxPrice', String(Math.round(filters.maxPrice)));
    }

    const reservedFilterKeys = new Set([
      'type',
      'q',
      'brands',
      'minPrice',
      'maxPrice',
      'sort',
      'page',
      'size',
    ]);

    for (const [key, value] of Object.entries(filters)) {
      if (reservedFilterKeys.has(key)) {
        continue;
      }

      if (typeof value === 'string' && value.trim()) {
        params = params.set(key, value);
      }
    }

    const apiSort = mapListingSortToApi(filters.sort);
    if (apiSort) {
      params = params.set('sort', apiSort);
    }

    return this.http
      .get<ApiResponse<PagedResponse<ProductCardApi>>>(`${this.apiUrl}/products`, { params })
      .pipe(
        map((response) => {
          const data = response.data;
          return {
            products: mapProductCardsToProducts(data?.content ?? []),
            page: data?.page ?? 0,
            totalPages: data?.totalPages ?? 0,
            totalElements: data?.totalElements ?? 0,
          };
        }),
        catchError(() =>
          of({ products: [], page: 0, totalPages: 0, totalElements: 0 }),
        ),
      );
  }

  getProductById(id: number): Observable<ProductDetails> {
    return this.http.get<ApiResponse<ProductDetailApi>>(`${this.apiUrl}/products/${id}`).pipe(
      map((response) => {
        if (!response.data) throw new Error('Not found');
        return mapProductDetailToProductDetails(response.data);
      }),
    );
  }

  getProductsByIds(ids: number[]): Observable<ProductDetails[]> {
    const uniqueIds = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];

    if (uniqueIds.length === 0) {
      return of([]);
    }

    // No batch endpoint in the API — fetch each product via GET /products/{id}
    return forkJoin(
      uniqueIds.map((id) =>
        this.getProductById(id).pipe(
          catchError(() => of(null)),
        ),
      ),
    ).pipe(
      map((products) => products.filter((product): product is ProductDetails => product !== null)),
    );
  }

  getAiSummaryForProduct(id: number): Observable<AiSummary> {
    return this.http
      .get<ApiResponse<AiSummaryPayloadApi>>(`${this.apiUrl}/products/${id}/ai-summary`)
      .pipe(
        map((response) =>
          response.data
            ? mapAiSummaryPayload(response.data)
            : { summaryText: 'AI summary unavailable.' },
        ),
      );
  }

  getAiComparisonSummary(ids: number[]): Observable<AiSummary> {
    const params = new HttpParams().set('ids', ids.join(','));
    return this.http
      .get<ApiResponse<AiSummaryPayloadApi>>(`${this.apiUrl}/products/compare/ai-summary`, {
        params,
      })
      .pipe(
        map((response) =>
          response.data
            ? mapAiSummaryPayload(response.data)
            : { summaryText: 'AI comparison unavailable.' },
        ),
      );
  }
}
