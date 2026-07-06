import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AdminCategoryService } from '@app/admin/services/admin-category.service';
import { AdminCategoryDto } from '@app/admin/models/admin-category.model';
import { extractApiError } from '@app/admin/utils/api-error.util';
import { nameToSlug } from '@app/admin/utils/slug.util';
import { ToastService } from '@app/core/services/toast.service';
import { IconComponent } from '@app/shared/components/icon/icon.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './category-list.component.html',
})
export class CategoryListComponent implements OnInit {
  private readonly categoryService = inject(AdminCategoryService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly categories = signal<AdminCategoryDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly deletingCategoryId = signal<number | null>(null);
  protected readonly loadError = signal('');
  protected readonly formError = signal('');
  protected readonly deleteError = signal('');
  protected readonly showCreateForm = signal(true);
  protected slugManuallyEdited = false;

  protected readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    slug: [
      '',
      [
        Validators.required,
        Validators.maxLength(255),
        Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      ],
    ],
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  protected toggleCreateForm(): void {
    this.showCreateForm.update((open) => !open);
  }

  protected onNameBlur(): void {
    if (this.slugManuallyEdited) {
      return;
    }

    const name = this.createForm.controls.name.value;
    const generatedSlug = nameToSlug(name);

    if (generatedSlug) {
      this.createForm.controls.slug.setValue(generatedSlug);
    }
  }

  protected onSlugInput(): void {
    this.slugManuallyEdited = true;
  }

  protected resetCreateForm(): void {
    this.createForm.reset({ name: '', slug: '' });
    this.slugManuallyEdited = false;
    this.formError.set('');
  }

  protected submitCreate(): void {
    if (this.submitting()) {
      return;
    }

    this.formError.set('');

    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const { name, slug } = this.createForm.getRawValue();
    this.submitting.set(true);

    this.categoryService.createCategory({ name: name.trim(), slug: slug.trim() }).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.categories.update((items) => [...items, created]);
        this.resetCreateForm();
        this.toast.show('Category created successfully.', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.formError.set(
          extractApiError(err, 'Failed to create category. Please try again.'),
        );
      },
    });
  }

  protected deleteCategory(category: AdminCategoryDto): void {
    if (this.deletingCategoryId() !== null) {
      return;
    }

    const confirmed = confirm(
      `Delete category "${category.name}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    this.deleteError.set('');
    this.deletingCategoryId.set(category.id);

    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.deletingCategoryId.set(null);
        this.categories.update((items) => items.filter((item) => item.id !== category.id));
        this.toast.show('Category deleted successfully.', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.deletingCategoryId.set(null);
        if (err.status === 409) {
          this.deleteError.set(
            'This category cannot be deleted because it has associated products.',
          );
          return;
        }

        this.deleteError.set(
          extractApiError(err, 'Failed to delete category. Please try again.'),
        );
      },
    });
  }

  protected fieldError(field: 'name' | 'slug'): string {
    const control = this.createForm.controls[field];

    if (!control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return field === 'name' ? 'Category name is required.' : 'Category slug is required.';
    }

    if (control.errors['pattern']) {
      return 'Use lowercase letters, numbers, and hyphens only (e.g. mobile-phones).';
    }

    if (control.errors['maxlength']) {
      return `${field === 'name' ? 'Name' : 'Slug'} must be 255 characters or fewer.`;
    }

    return '';
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Failed to load categories. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
