import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  host: { class: 'login-page-host' },
})
export class RegisterComponent implements OnInit {
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
      .register({
        nombre_completo: this.nombreCompleto.trim(),
        email: this.email.trim().toLowerCase(),
        username,
        password: this.password,
      })
      .subscribe({
        next: (data) => {
          this.success = data.mensaje || 'Cuenta creada. Redirigiendo...';
          this.router.navigateByUrl(data.redirect || '/usuario');
        },
        error: (err) => {
          if (err.status === 404) {
            this.error =
              'Registro no disponible en la API. Desde la raiz del proyecto ejecuta: docker compose up -d --build api';
          } else if (err.status === 0 || err.message?.includes('Http failure')) {
            this.error =
              'Sin conexion con la API. Verifica Docker y ejecuta: docker compose up -d mongo api';
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
