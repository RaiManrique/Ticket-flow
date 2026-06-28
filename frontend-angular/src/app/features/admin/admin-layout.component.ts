import { Component, inject } from '@angular/core';
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
  roleLabel = roleLabel;
  profilePhoto = profilePhoto;

  logout(): void {
    this.auth.logout();
  }
}
