import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  host: { class: 'login-page-host' },
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  login = '';
  password = '';
  demoPassword = 'TicketFlow2026';
  error = '';
  loading = false;
  apiError = '';
  demoAccounts = [
    { login: 'rai_manrique', label: 'Usuario' },
    { login: 'victor_arapa', label: 'Organizador' },
    { login: 'admin_ticketflow', label: 'Admin' },
  ];

  ngOnInit(): void {
    this.auth.checkHealth().subscribe((ok) => {
      if (!ok) {
        this.apiError = 'API no disponible. Abre http://127.0.0.1:8090 y ejecuta docker compose up -d.';
      }
    });
    this.auth.getDemoInfo().subscribe({
      next: (data) => {
        if (data.password) this.demoPassword = data.password;
        if (data.accounts?.length) this.demoAccounts = data.accounts;
      },
    });
    this.auth.validateSession().subscribe((ok) => {
      if (ok) this.router.navigateByUrl(this.auth.redirectForRole(this.auth.getUser()));
    });
  }

  submit(): void {
    this.doLogin(this.login.trim(), this.password);
  }

  demo(login: string): void {
    this.login = login;
    this.password = this.demoPassword;
    this.doLogin(login, this.demoPassword);
  }

  private doLogin(user: string, pass: string): void {
    this.error = '';
    this.loading = true;
    this.auth.login(user, pass).subscribe({
      next: (data) => this.router.navigateByUrl(data.redirect || this.auth.redirectForRole(data.user)),
      error: (err) => {
        this.error = err.error?.error || err.message || 'Error de login';
        this.loading = false;
      },
      complete: () => { this.loading = false; },
    });
  }
}
