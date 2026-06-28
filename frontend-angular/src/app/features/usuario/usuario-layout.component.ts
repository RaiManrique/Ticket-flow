import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { EventosStateService } from '../../core/services/eventos-state.service';
import { profilePhoto } from '../../core/utils/images.util';

@Component({
  selector: 'app-usuario-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './usuario-layout.component.html',
  host: { class: 'app-body' },
})
export class UsuarioLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly eventosState = inject(EventosStateService);
  readonly user = this.auth.getUser()!;

  ngOnInit(): void {
    this.eventosState.load();
  }

  photo(): string {
    return profilePhoto(this.user);
  }

  initials(): string {
    return (this.user.username || 'U').slice(0, 2).toUpperCase();
  }

  firstName(): string {
    return (this.user.nombre_completo || this.user.username).split(' ')[0];
  }

  logout(): void {
    this.auth.logout();
  }
}
