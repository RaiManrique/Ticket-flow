import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register-organizer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-organizer.component.html',
  host: { class: 'login-page-host' },
})
export class RegisterOrganizerComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  nombreCompleto = '';
  email = '';
  username = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;
  error = '';
  success = '';
  loading = false;
  apiError = '';

  ngOnInit(): void {
    this.auth.checkHealth().subscribe((ok) => {
      if (!ok) {
        this.apiError =
          'API no disponible. Ejecuta docker compose up -d mongo api desde la raiz del proyecto.';
      }
    });
    this.auth.validateSession().subscribe((ok) => {
      if (ok) this.router.navigateByUrl(this.auth.redirectForRole(this.auth.getUser()));
    });
  }

  submit(): void {
    this.error = '';
    this.success = '';

    if (!this.acceptTerms) {
      this.error = 'Debes aceptar los terminos para crear tu cuenta.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Las contrasenas no coinciden.';
      return;
    }

    this.loading = true;
    const username = this.username.trim().toLowerCase().replace(/\s+/g, '_');
    this.auth
      .registerOrganizer({
        nombre_completo: this.nombreCompleto.trim(),
        email: this.email.trim().toLowerCase(),
        username,
        password: this.password,
      })
      .subscribe({
        next: (data) => {
          this.success = data.mensaje || 'Cuenta creada. Redirigiendo...';
          this.router.navigateByUrl(data.redirect || '/admin');
        },
        error: (err) => {
          if (err.status === 404) {
            this.error =
              'Registro de organizador no disponible. Ejecuta: docker compose up -d --build api';
          } else if (err.status === 0 || err.message?.includes('Http failure')) {
            this.error = 'Sin conexion con la API. Verifica Docker y la API en el puerto 3000.';
          } else {
            this.error = err.error?.error || err.message || 'No se pudo crear la cuenta';
          }
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }
}
