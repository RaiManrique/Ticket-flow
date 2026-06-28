import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/ticketflow.models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getUser();
  const token = auth.getToken();

  if (user && token && auth.isJwtToken(token)) {
    auth.syncStoredSession();
    return of(true);
  }

  return auth.validateSession().pipe(
    map((ok) => {
      if (ok) return true;
      router.navigate(['/login']);
      return false;
    })
  );
};

export function roleGuard(roles: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const check = (): boolean => {
      const user = auth.getUser();
      if (!user || !auth.isJwtToken(auth.getToken())) {
        router.navigate(['/login']);
        return false;
      }
      if (!roles.includes(user.rol)) {
        router.navigate([auth.redirectForRole(user)]);
        return false;
      }
      return true;
    };

    if (auth.getUser() && auth.isJwtToken(auth.getToken())) {
      auth.syncStoredSession();
      return of(check());
    }

    return auth.validateSession().pipe(
      switchMap(() => of(check()))
    );
  };
}
