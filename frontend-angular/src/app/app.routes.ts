import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/login/login.component';
import { RegisterComponent } from './features/login/register.component';
import { RegisterOrganizerComponent } from './features/login/register-organizer.component';
import { UsuarioLayoutComponent } from './features/usuario/usuario-layout.component';
import { UsuarioInicioComponent } from './features/usuario/pages/usuario-inicio.component';
import { UsuarioEventosComponent } from './features/usuario/pages/usuario-eventos.component';
import { UsuarioComunidadComponent } from './features/usuario/pages/usuario-comunidad.component';
import { UsuarioPerfilComponent } from './features/usuario/pages/usuario-perfil.component';
import { AdminLayoutComponent } from './features/admin/admin-layout.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { AdminPanelComponent } from './features/admin/admin-panel.component';
import { AdminEventosComponent } from './features/admin/admin-eventos.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegisterComponent },
  { path: 'registro-organizador', component: RegisterOrganizerComponent },
  {
    path: 'usuario',
    component: UsuarioLayoutComponent,
    canActivate: [roleGuard(['usuario'])],
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: UsuarioInicioComponent },
      { path: 'eventos', component: UsuarioEventosComponent },
      { path: 'comunidad', component: UsuarioComunidadComponent },
      { path: 'perfil', component: UsuarioPerfilComponent },
    ],
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [roleGuard(['admin', 'organizador'])],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'usuarios', component: AdminPanelComponent, data: { panel: 'usuarios' } },
      { path: 'eventos', component: AdminEventosComponent },
      { path: 'comunidad', component: UsuarioComunidadComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
