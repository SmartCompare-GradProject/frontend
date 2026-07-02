import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ProductListingComponent } from './product-listing.component';
import {
  ProductListingService,
  ProductSearchFilters,
  PRODUCT_LISTING_PAGE_SIZE,
} from '@app/core/services/product-listing.service';
import { AuthStateService } from '@app/core/services/auth-state.service';
import { Component, input, Output, EventEmitter } from '@angular/core';

@Component({ selector: 'app-navbar', standalone: true, template: '' })
class NavbarStubComponent {}

@Component({ selector: 'app-landing-footer', standalone: true, template: '' })
class LandingFooterStubComponent {}

@Component({
  selector: 'app-product-card',
  standalone: true,
  template: '<div class="product-card-stub">{{ title() }}</div>',
})
class ProductCardStubComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly price = input.required<string>();
  readonly imageUrl = input.required<string>();
  readonly priceValue = input<number | null | undefined>();
  readonly showMatchBadge = input<boolean>(false);
  readonly mainSpecs = input<string[]>([]);
  readonly isSelected = input<boolean>(false);
  @Output() toggleSelect = new EventEmitter<void>();
}

describe('ProductListingComponent', () => {
  let fixture: ComponentFixture<ProductListingComponent>;
  let component: ProductListingComponent;
  let listingService: {
    selectedIds: ProductListingService['selectedIds'];
    getProducts: ReturnType<typeof vi.fn>;
    getFilterMetadata: ReturnType<typeof vi.fn>;
    toggleComparison: ReturnType<typeof vi.fn>;
  };

  const buildFilters = (): ProductSearchFilters =>
    (component as unknown as { buildSearchFilters(): ProductSearchFilters }).buildSearchFilters();

  const mockListingProduct = {
    id: 1,
    title: 'Phone',
    subtitle: 'Brand',
    price: '1,000 EGP',
    imageUrl: '/p.png',
    imageAlt: 'phone',
    rating: '4.0',
    showMatchBadge: false,
  };

  beforeEach(async () => {
    listingService = {
      selectedIds: { signal: () => [] } as unknown as ProductListingService['selectedIds'],
      getProducts: vi.fn().mockReturnValue(
        of({ products: [], page: 0, totalPages: 3, totalElements: 30 }),
      ),
      getFilterMetadata: vi.fn().mockReturnValue(
        of({
          brands: ['Apple', 'Samsung'],
          minPrice: 0,
          maxPrice: 100_000,
          specs: { ram: ['8GB', '12GB'], storage: ['128GB'], processor: ['Snapdragon'] },
        }),
      ),
      toggleComparison: vi.fn(),
    };

    listingService.selectedIds = signal<number[]>([]);

    await TestBed.configureTestingModule({
      imports: [ProductListingComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ type: 'phone' }) },
        },
        { provide: ProductListingService, useValue: listingService },
        {
          provide: AuthStateService,
          useValue: { isConsumerLoggedIn: vi.fn().mockReturnValue(false) },
        },
      ],
    })
      .overrideComponent(ProductListingComponent, {
        set: {
          imports: [
            CommonModule,
            FormsModule,
            RouterLink,
            NavbarStubComponent,
            LandingFooterStubComponent,
            ProductCardStubComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProductListingComponent);
    component = fixture.componentInstance;
    component.availableFilters.set({
      brands: ['Apple'],
      minPrice: 0,
      maxPrice: 100_000,
      specs: { ram: ['8GB'], storage: ['128GB'], processor: ['Snapdragon 8'] },
    });
  });

  describe('Happy Paths — buildSearchFilters', () => {
    it('should include base filters and page size defaults', () => {
      component.activeFilters = {
        type: 'phone',
        q: 'iphone',
        brands: ['Apple'],
        minPrice: 0,
        maxPrice: 100_000,
        page: 1,
        sort: 'recommended',
      };
      component.specFilters = {};

      const filters = buildFilters();

      expect(filters.type).toBe('phone');
      expect(filters.q).toBe('iphone');
      expect(filters.brands).toBe('Apple');
      expect(filters.page).toBe(1);
      expect(filters.size).toBe(PRODUCT_LISTING_PAGE_SIZE);
    });

    it('should iterate all active spec filter keys into the payload', () => {
      component.activeFilters = {
        type: 'phone',
        q: '',
        brands: [],
        minPrice: 0,
        maxPrice: 100_000,
        page: 0,
        sort: 'recommended',
      };
      component.specFilters = {
        ram: ['8GB', '12GB'],
        storage: ['256GB'],
        processor: ['Snapdragon 8 Gen 3'],
      };

      const filters = buildFilters();

      expect(filters['ram']).toBe('8GB,12GB');
      expect(filters['storage']).toBe('256GB');
      expect(filters['processor']).toBe('Snapdragon 8 Gen 3');
    });

    it('should omit empty spec filter keys', () => {
      component.specFilters = { ram: [], storage: ['128GB'] };

      const filters = buildFilters();

      expect(filters['ram']).toBeUndefined();
      expect(filters['storage']).toBe('128GB');
    });
  });

  describe('Happy Paths — pagination UI', () => {
    beforeEach(() => {
      vi.spyOn(component, 'ngOnInit').mockImplementation(() => undefined);
    });

    it('should expose next/previous navigation state from page signals', () => {
      component.currentPage.set(0);
      component.totalPages.set(3);

      expect(component.canGoPrevious()).toBe(false);
      expect(component.canGoNext()).toBe(true);

      component.currentPage.set(2);
      expect(component.canGoPrevious()).toBe(true);
      expect(component.canGoNext()).toBe(false);
    });

    it('should keep pagination controls hidden when totalPages is one', () => {
      component.totalPages.set(1);
      expect(component.canGoNext()).toBe(false);
      expect(component.canGoPrevious()).toBe(false);
    });

    it('should not display page count or total product count text in the template', () => {
      component.products.set([mockListingProduct]);
      component.isLoading.set(false);
      component.totalPages.set(5);
      component.totalElements.set(999);
      component.currentPage.set(2);

      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toMatch(/Page\s+\d+\s+of\s+\d+/i);
      expect(text).not.toMatch(/999\s+products/i);
    });
  });

  describe('Sad Paths — pagination edge cases', () => {
    beforeEach(() => {
      vi.spyOn(component, 'ngOnInit').mockImplementation(() => undefined);
    });

    it('should hide pagination controls when only one page exists', () => {
      component.products.set([mockListingProduct]);
      component.isLoading.set(false);
      component.totalPages.set(1);

      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('Previous');
      expect(fixture.nativeElement.textContent).not.toContain('Next');
    });

    it('should block previous navigation on the first page', () => {
      component.currentPage.set(0);
      component.totalPages.set(3);

      expect(component.canGoPrevious()).toBe(false);
    });
  });
});
