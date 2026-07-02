import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { ProductDetailsComponent } from './product-details.component';
import {
  ProductListingService,
  ProductDetails,
} from '@app/core/services/product-listing.service';
import { AuthStateService } from '@app/core/services/auth-state.service';
import { Component, input } from '@angular/core';

@Component({ selector: 'app-navbar', standalone: true, template: '' })
class NavbarStubComponent {}

@Component({ selector: 'app-landing-footer', standalone: true, template: '' })
class LandingFooterStubComponent {}

@Component({
  selector: 'app-markdown-content',
  standalone: true,
  template: '<div class="markdown-stub">{{ content() }}</div>',
})
class MarkdownStubComponent {
  readonly content = input.required<string>();
}

describe('ProductDetailsComponent', () => {
  let fixture: ComponentFixture<ProductDetailsComponent>;
  let component: ProductDetailsComponent;
  let listingService: {
    getProductById: ReturnType<typeof vi.fn>;
    getAiSummaryForProduct: ReturnType<typeof vi.fn>;
    setSelection: ReturnType<typeof vi.fn>;
  };
  let authState: { isConsumerLoggedIn: ReturnType<typeof vi.fn> };

  const mockProduct: ProductDetails = {
    id: 1,
    title: 'Test Phone',
    subtitle: 'Brand',
    price: '10,000 EGP',
    priceValue: 10000,
    imageUrl: '/img.png',
    imageAlt: 'phone',
    rating: '4.5',
    showMatchBadge: false,
    reviews: 0,
    specGroups: [],
    vendors: [],
  };

  beforeEach(async () => {
    listingService = {
      getProductById: vi.fn().mockReturnValue(of(mockProduct)),
      getAiSummaryForProduct: vi.fn().mockReturnValue(of({ summaryText: 'Great battery life.' })),
      setSelection: vi.fn(),
    };

    authState = {
      isConsumerLoggedIn: vi.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: '1' })) },
        },
        { provide: ProductListingService, useValue: listingService },
        { provide: AuthStateService, useValue: authState },
      ],
    })
      .overrideComponent(ProductDetailsComponent, {
        set: {
          imports: [
            CommonModule,
            RouterLink,
            NavbarStubComponent,
            LandingFooterStubComponent,
            MarkdownStubComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProductDetailsComponent);
    component = fixture.componentInstance;
  });

  const resolveError = (status: number): string =>
    (component as unknown as { resolveAiSummaryError(status: number): string }).resolveAiSummaryError(
      status,
    );

  describe('Happy Paths — AI summary loading', () => {
    it('should show loading state then render AI summary markdown', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.isLoadingAiSummary()).toBe(false);
      expect(component.aiSummary()?.summaryText).toBe('Great battery life.');
      expect(component.hasAiSummaryError()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain('Great battery life.');
    });

    it('should initialize AI summary loading state when a fetch begins', () => {
      component.isLoadingAiSummary.set(true);
      expect(component.isLoadingAiSummary()).toBe(true);
      expect(component.hasAiSummaryError()).toBe(false);
    });
  });

  describe('Sad Paths — AI summary error handling', () => {
    it('should map guest users to the login prompt regardless of status code', () => {
      authState.isConsumerLoggedIn.mockReturnValue(false);

      expect(resolveError(400)).toBe('Log in to unlock personalized AI insights.');
      expect(resolveError(500)).toBe('Log in to unlock personalized AI insights.');
    });

    it('should map logged-in 400 errors to the missing-preferences message', () => {
      authState.isConsumerLoggedIn.mockReturnValue(true);

      expect(resolveError(400)).toBe(
        'Please set your device preferences in your profile to generate AI insights.',
      );
    });

    it('should map logged-in server errors to the high-demand message', () => {
      authState.isConsumerLoggedIn.mockReturnValue(true);

      expect(resolveError(429)).toContain('high demand');
      expect(resolveError(500)).toContain('high demand');
      expect(resolveError(503)).toContain('high demand');
    });

    it('should render the dynamic error string in the template on API failure', async () => {
      authState.isConsumerLoggedIn.mockReturnValue(true);
      listingService.getAiSummaryForProduct.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })),
      );

      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.aiSummary()).toBeNull();
      expect(component.aiSummaryError()).toBe(
        'Please set your device preferences in your profile to generate AI insights.',
      );
      expect(fixture.nativeElement.textContent).toContain(
        'Please set your device preferences in your profile to generate AI insights.',
      );
    });

    it('should render guest login prompt when summary fails and user is not logged in', async () => {
      authState.isConsumerLoggedIn.mockReturnValue(false);
      listingService.getAiSummaryForProduct.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' })),
      );

      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'Log in to unlock personalized AI insights.',
      );
    });
  });
});
