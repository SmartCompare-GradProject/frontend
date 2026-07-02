import { Component, input, Output, EventEmitter } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  // --- Existing Signals ---
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly price = input.required<string>();
  readonly priceValue = input<number | null | undefined>(null);
  readonly imageUrl = input.required<string>();
  readonly imageAlt = input<string>('');
  readonly showMatchBadge = input<boolean>(false);
  readonly mainSpecs = input<string[]>([]);
  
  // New Input for the % Score
  readonly matchScore = input<number | undefined>(undefined);

  // --- Selection Logic ---
  readonly isSelected = input<boolean>(false);
  @Output() toggleSelect = new EventEmitter<void>();

  onToggle() {
    this.toggleSelect.emit();
  }
}