import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { ProductListingService } from './product-listing.service';
import { ToastService } from './toast.service';

describe('ProductListingService', () => {
  let service: ProductListingService;
  let toast: ToastService;
  let routerEvents$: Subject<NavigationEnd>;

  beforeEach(() => {
    routerEvents$ = new Subject<NavigationEnd>();

    TestBed.configureTestingModule({
      providers: [
        ProductListingService,
        ToastService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            events: routerEvents$.asObservable(),
            navigate: vi.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(ProductListingService);
    toast = TestBed.inject(ToastService);
    service.clearComparison();
  });

  describe('Happy Paths — selectedIds comparison logic', () => {
    it('should start with an empty selection', () => {
      expect(service.selectedIds()).toEqual([]);
    });

    it('should add a product id when toggling a new item', () => {
      service.toggleComparison(101);

      expect(service.selectedIds()).toEqual([101]);
    });

    it('should remove a product id when toggling an already selected item', () => {
      service.toggleComparison(101);
      service.toggleComparison(102);
      service.toggleComparison(101);

      expect(service.selectedIds()).toEqual([102]);
    });

    it('should replace the selection when setSelection is called', () => {
      service.toggleComparison(1);
      service.toggleComparison(2);
      service.setSelection(99);

      expect(service.selectedIds()).toEqual([99]);
    });

    it('should clear all selected ids', () => {
      service.toggleComparison(1);
      service.toggleComparison(2);
      service.clearComparison();

      expect(service.selectedIds()).toEqual([]);
    });

    it('should preserve comparison selection on product-related routes', () => {
      service.toggleComparison(42);
      routerEvents$.next(new NavigationEnd(1, '/products/42', '/products/42'));

      expect(service.selectedIds()).toEqual([42]);
    });
  });

  describe('Sad Paths — MAX_COMPARE limit', () => {
    it('should not add a fifth product and should show a warning toast', () => {
      const toastSpy = vi.spyOn(toast, 'showWarning');

      service.toggleComparison(1);
      service.toggleComparison(2);
      service.toggleComparison(3);
      service.toggleComparison(4);
      service.toggleComparison(5);

      expect(service.selectedIds()).toEqual([1, 2, 3, 4]);
      expect(toastSpy).toHaveBeenCalledWith('You can only compare up to 4 products at a time.');
    });
  });

  describe('Sad Paths — route-based selection reset (in-memory lifecycle)', () => {
    it('should clear comparison when navigating away from catalog routes', () => {
      service.toggleComparison(10);
      routerEvents$.next(new NavigationEnd(1, '/login', '/login'));

      expect(service.selectedIds()).toEqual([]);
    });

    it('should clear comparison when navigating to onboarding', () => {
      service.toggleComparison(10);
      routerEvents$.next(new NavigationEnd(1, '/onboarding/1', '/onboarding/1'));

      expect(service.selectedIds()).toEqual([]);
    });
  });
});
