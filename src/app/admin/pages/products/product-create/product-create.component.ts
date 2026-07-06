import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminProductService } from '@app/admin/services/admin-product.service';
import { AdminCategoryService } from '@app/admin/services/admin-category.service';
import { AdminCategoryDto } from '@app/admin/models/admin-category.model';
import { CreateProductRequest, DynamicFieldEntry } from '@app/admin/models/admin-product.model';
import { extractApiError } from '@app/admin/utils/api-error.util';
import { buildSpecsFromFields } from '@app/admin/utils/json-field.util';
import { IconComponent } from '@app/shared/components/icon/icon.component';

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './product-create.component.html',
})
export class ProductCreateComponent implements OnInit {
  private readonly productService = inject(AdminProductService);
  private readonly categoryService = inject(AdminCategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly categories = signal<AdminCategoryDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly name = signal('');
  protected readonly brand = signal('');
  protected readonly categorySlug = signal('');
  protected readonly releaseDate = signal('');
  protected readonly image = signal('');
  protected readonly sourceUrl = signal('');
  protected readonly hasVariants = signal(false);

  protected readonly dynamicFields = signal<DynamicFieldEntry[]>([]);
  protected readonly newFieldKey = signal('');
  protected readonly newFieldValue = signal('');

  protected readonly activeFields = computed(() =>
    this.dynamicFields().filter((field) => !field.markedForRemoval),
  );

  protected readonly specsPreview = computed(() =>
    buildSpecsFromFields(this.dynamicFields()),
  );

  protected readonly duplicateKeys = computed(() => {
    const keys = this.activeFields().map((field) => field.key.trim().toLowerCase()).filter(Boolean);
    return keys.length !== new Set(keys).size;
  });

  protected readonly canSave = computed(
    () =>
      this.name().trim().length > 0 &&
      this.brand().trim().length > 0 &&
      this.categorySlug().trim().length > 0 &&
      this.sourceUrl().trim().length > 0 &&
      !this.duplicateKeys() &&
      !this.saving(),
  );

  ngOnInit(): void {
    const presetSlug = this.route.snapshot.queryParamMap.get('categorySlug') ?? '';
    if (presetSlug) {
      this.categorySlug.set(presetSlug);
    }

    this.loadCategories();
  }

  protected updateFieldKey(index: number, key: string): void {
    this.dynamicFields.update((fields) =>
      fields.map((field, i) => (i === index ? { ...field, key } : field)),
    );
  }

  protected updateFieldValue(index: number, value: string): void {
    this.dynamicFields.update((fields) =>
      fields.map((field, i) => (i === index ? { ...field, value } : field)),
    );
  }

  protected removeField(index: number): void {
    this.dynamicFields.update((fields) => fields.filter((_, i) => i !== index));
  }

  protected addField(): void {
    const key = this.newFieldKey().trim();
    const value = this.newFieldValue().trim();

    if (!key) {
      this.error.set('New field key cannot be empty.');
      return;
    }

    const exists = this.activeFields().some(
      (field) => field.key.trim().toLowerCase() === key.toLowerCase(),
    );
    if (exists) {
      this.error.set(`Field "${key}" already exists.`);
      return;
    }

    this.dynamicFields.update((fields) => [...fields, { key, value, isNew: true }]);
    this.newFieldKey.set('');
    this.newFieldValue.set('');
    this.error.set('');
  }

  protected save(): void {
    if (!this.canSave()) {
      return;
    }

    this.saving.set(true);
    this.error.set('');

    this.productService.createProduct(this.buildCreatePayload()).subscribe({
      next: () => {
        this.saving.set(false);
        const categorySlug = this.categorySlug().trim();
        void this.router.navigate(['/admin/products'], {
          queryParams: { categorySlug },
          state: { productSaved: true, categorySlug },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(
          extractApiError(err, 'Failed to create product. Please try again.'),
        );
      },
    });
  }

  protected cancel(): void {
    void this.router.navigate(['/admin/products']);
  }

  private buildCreatePayload(): CreateProductRequest {
    const image = this.image().trim();

    return {
      name: this.name().trim(),
      brand: this.brand().trim(),
      categorySlug: this.categorySlug().trim(),
      releaseDate: this.formatReleaseDate(this.releaseDate()),
      image: image || null,
      sourceUrl: this.sourceUrl().trim(),
      hasVariants: this.hasVariants(),
      specs: this.specsPreview(),
    };
  }

  private formatReleaseDate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString().slice(0, 10);
  }

  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);

        if (!this.categorySlug() && categories[0]) {
          this.categorySlug.set(categories[0].slug);
        }

        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load categories. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
