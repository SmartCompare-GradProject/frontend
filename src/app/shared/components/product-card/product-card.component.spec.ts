import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductCardComponent } from './product-card.component';

describe('ProductCardComponent', () => {
  let fixture: ComponentFixture<ProductCardComponent>;

  const setRequiredInputs = (overrides: Partial<Record<string, unknown>> = {}) => {
    fixture.componentRef.setInput('title', overrides['title'] ?? 'iPhone 15');
    fixture.componentRef.setInput('subtitle', overrides['subtitle'] ?? 'Apple');
    fixture.componentRef.setInput('price', overrides['price'] ?? '45,000 EGP');
    fixture.componentRef.setInput('imageUrl', overrides['imageUrl'] ?? '/phone.png');

    if ('priceValue' in overrides) {
      fixture.componentRef.setInput('priceValue', overrides['priceValue']);
    }
    if ('showMatchBadge' in overrides) {
      fixture.componentRef.setInput('showMatchBadge', overrides['showMatchBadge']);
    }
    if ('mainSpecs' in overrides) {
      fixture.componentRef.setInput('mainSpecs', overrides['mainSpecs']);
    }
    if ('matchScore' in overrides) {
      fixture.componentRef.setInput('matchScore', overrides['matchScore']);
    }
    if ('isSelected' in overrides) {
      fixture.componentRef.setInput('isSelected', overrides['isSelected']);
    }

    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
  });

  describe('Happy Paths — badge rendering', () => {
    it('should render RAM and storage spec badges from mainSpecs', () => {
      setRequiredInputs({ mainSpecs: ['8GB RAM', '256GB Storage'] });

      const badges = fixture.nativeElement.querySelectorAll('.mt-2 span');
      expect(badges.length).toBe(2);
      expect(badges[0].textContent).toContain('8GB RAM');
      expect(badges[1].textContent).toContain('256GB Storage');
    });

    it('should render the AI Match badge when showMatchBadge is true', () => {
      setRequiredInputs({ showMatchBadge: true });

      const badge = fixture.nativeElement.textContent;
      expect(badge).toContain('AI Match');
    });

    it('should render a percentage when matchScore is provided', () => {
      setRequiredInputs({ showMatchBadge: true, matchScore: 87 });

      expect(fixture.nativeElement.textContent).toContain('87% AI Match');
    });

    it('should render numeric priceValue when provided', () => {
      setRequiredInputs({ priceValue: 45000 });

      expect(fixture.nativeElement.textContent).toContain('45,000');
      expect(fixture.nativeElement.textContent).toContain('EGP');
    });
  });

  describe('Sad Paths — badge edge cases', () => {
    it('should not render spec badges when mainSpecs is empty', () => {
      setRequiredInputs({ mainSpecs: [] });

      const specContainer = fixture.nativeElement.querySelector('.mt-2.flex.flex-wrap');
      expect(specContainer).toBeNull();
    });

    it('should not render AI Match badge when showMatchBadge is false', () => {
      setRequiredInputs({ showMatchBadge: false });

      expect(fixture.nativeElement.textContent).not.toContain('AI Match');
    });

    it('should fall back to the price string when priceValue is null', () => {
      setRequiredInputs({ price: 'Check Price', priceValue: null });

      expect(fixture.nativeElement.textContent).toContain('Check Price');
    });
  });
});
