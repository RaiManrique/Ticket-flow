import { Component, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { profilePhoto } from '../../core/utils/images.util';
import { roleLabel } from '../../core/utils/format.util';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  host: { class: 'admin-body' },
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  readonly user = this.auth.getUser()!;
  readonly isAdmin = this.user.rol === 'admin';

  @HostBinding('class.admin-body--organizer') get organizerTheme(): boolean {
    return !this.isAdmin;
  }
  roleLabel = roleLabel;
  profilePhoto = profilePhoto;

  photo(): string {
    return profilePhoto(this.user);
  }

  initials(): string {
    return (this.user.username || 'A').slice(0, 2).toUpperCase();
  }

  logout(): void {
    this.auth.logout();
  }
}
