import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http'; // NEW
import { ProductListingService, ProductDetails, AiSummary } from '@app/core/services/product-listing.service';
import { AuthStateService } from '@app/core/services/auth-state.service';
import { NavbarComponent } from '@app/shared/components/navbar/navbar.component';
import { LandingFooterComponent } from '@app/shared/components/landing-footer/landing-footer.component';
import { MarkdownContentComponent } from '@app/shared/components/markdown-content/markdown-content.component';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, LandingFooterComponent, MarkdownContentComponent],
  templateUrl: './product-details.component.html',
  styles: []
})
export class ProductDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productListingService = inject(ProductListingService);
  private readonly authState = inject(AuthStateService);

  readonly product = signal<ProductDetails | null>(null);
  readonly aiSummary = signal<AiSummary | null>(null);
  readonly hasError = signal(false);
  readonly isLoading = signal(true);
  readonly isLoadingAiSummary = signal(false);
  readonly aiSummaryError = signal<string | null>(null);

  readonly hasAiSummaryError = computed(() => this.aiSummaryError() !== null);

  readonly showVendorAvailability = computed(() =>
    (this.product()?.vendors ?? []).some((vendor) => !!vendor.availability),
  );

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.fetchData(+id);
      }
    });
  }

  fetchData(id: number) {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.aiSummary.set(null);
    this.isLoadingAiSummary.set(true);
    this.aiSummaryError.set(null);

    this.productListingService.getProductById(id).subscribe({
      next: (data) => {
        this.product.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load product:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });

    this.productListingService.getAiSummaryForProduct(id).subscribe({
      next: (data) => {
        this.aiSummary.set(data);
        this.aiSummaryError.set(null);
        this.isLoadingAiSummary.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.aiSummary.set(null);
        this.aiSummaryError.set(this.resolveAiSummaryError(err.status));
        this.isLoadingAiSummary.set(false);
      },
    });
  }

  private resolveAiSummaryError(status: number): string {
    const isLoggedIn = this.authState.isConsumerLoggedIn();

    if (!isLoggedIn) {
      return 'Log in to unlock personalized AI insights.';
    }

    if (status === 400) {
      return 'Please set your device preferences in your profile to generate AI insights.';
    }

    if (status === 401 || status === 429 || status === 500 || status >= 500) {
      return '🧠 AI Insights are currently experiencing high demand. Please try again in a moment.';
    }

    return '🧠 AI Insights are currently experiencing high demand. Please try again in a moment.';
  }

  compareProduct(id: number) {
    this.productListingService.setSelection(id);
    this.router.navigate(['/compare']);
  }
}