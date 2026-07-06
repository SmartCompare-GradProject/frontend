import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStateService } from '@app/core/services/auth-state.service';
import { IconComponent } from '@app/shared/components/icon/icon.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './admin-shell.component.html',
})
export class AdminShellComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly mobileNavOpen = signal(false);

  protected readonly navLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/categories', label: 'Categories', icon: 'category' },
    { path: '/admin/products', label: 'Products', icon: 'inventory_2' },
    { path: '/admin/users', label: 'Users', icon: 'group' },
  ] as const;

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  protected logout(): void {
    this.closeMobileNav();
    this.authState.adminLogout();
  }
}
