import { Component, inject } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { catchError, of } from 'rxjs'; // <-- NEW IMPORTS
import { IconComponent } from '@app/shared/components/icon/icon.component';
import { NavbarComponent } from '@app/shared/components/navbar/navbar.component';
import { LandingFooterComponent } from '@app/shared/components/landing-footer/landing-footer.component';
import { FeatureCardComponent } from '@app/shared/components/feature-card/feature-card.component';
import { ProductCardComponent } from '@app/shared/components/product-card/product-card.component';
import type { TrustItem } from '@app/shared/components/trust-section/trust-section.component';
import { TrustSectionComponent } from '@app/shared/components/trust-section/trust-section.component';
import { ProductListingService } from '@app/core/services/product-listing.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    RouterLink,
    IconComponent,
    NavbarComponent,
    LandingFooterComponent,
    FeatureCardComponent,
    ProductCardComponent,
    TrustSectionComponent,
  ],
  templateUrl: './landing-page.html',
})
export class LandingPage {
  private readonly productListingService = inject(ProductListingService);
  private readonly router = inject(Router);

  selectedIds = this.productListingService.selectedIds;
  
  // NEW: Catch errors so the skeleton loader doesn't spin forever
  trendingProducts$ = this.productListingService.getTrendingProducts().pipe(
    catchError((err) => {
      console.error('Failed to load trending products', err);
      return of([]); // Return an empty array on failure
    })
  );

  toggleCompare(id: number) {
    this.productListingService.toggleComparison(id);
  }

  goToComparison() {
    this.router.navigate(['/compare']);
  }

  onSearch(query: string) {
    if (query.trim()) {
      this.router.navigate(['/products'], { queryParams: { q: query } });
    } else {
      this.router.navigate(['/products']);
    }
  }

  protected readonly features = [
    {
      icon: 'psychology',
      title: 'AI Personalization',
      description: 'Get tailored recommendations based on your specific usage patterns and budget.',
    },
    {
      icon: 'table_view',
      title: 'Deep Spec Comparison',
      description: 'Generate comprehensive side-by-side technical tables instantly.',
    },
  ] as const;

  protected readonly trustItems: TrustItem[] = [
    { title: 'Transparent Estimates', description: 'We clearly label AI-predicted specs.' },
    { title: 'No Sponsored bias', description: 'Our comparison algorithm ranks purely on value.' },
  ];
}