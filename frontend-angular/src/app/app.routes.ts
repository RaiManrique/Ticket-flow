import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/login/login.component';
import { UsuarioLayoutComponent } from './features/usuario/usuario-layout.component';
import { UsuarioInicioComponent } from './features/usuario/pages/usuario-inicio.component';
import { UsuarioEventosComponent } from './features/usuario/pages/usuario-eventos.component';
import { UsuarioComunidadComponent } from './features/usuario/pages/usuario-comunidad.component';
import { UsuarioBilleteraComponent } from './features/usuario/pages/usuario-billetera.component';
import { UsuarioCheckoutComponent } from './features/usuario/pages/usuario-checkout.component';
import { AdminLayoutComponent } from './features/admin/admin-layout.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { AdminPanelComponent } from './features/admin/admin-panel.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'usuario',
    component: UsuarioLayoutComponent,
    canActivate: [roleGuard(['usuario'])],
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: UsuarioInicioComponent },
      { path: 'eventos', component: UsuarioEventosComponent },
      { path: 'comunidad', component: UsuarioComunidadComponent },
      { path: 'billetera', component: UsuarioBilleteraComponent },
      { path: 'checkout/:id', component: UsuarioCheckoutComponent },
    ],
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [roleGuard(['admin', 'organizador'])],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'usuarios', component: AdminPanelComponent, data: { panel: 'usuarios' } },
      { path: 'eventos', component: AdminPanelComponent, data: { panel: 'eventos' } },
      { path: 'ventas', component: AdminPanelComponent, data: { panel: 'ventas' } },
      { path: 'reembolsos', component: AdminPanelComponent, data: { panel: 'reembolsos' } },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
