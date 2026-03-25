import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StateService, UserRole } from '../services/state.service';

function isAuthenticated(state: StateService) {
  return state.isLoggedIn() && !state.sessionExpired();
}

export const authGuard: CanActivateFn = () => {
  const state = inject(StateService);
  const router = inject(Router);

  if (isAuthenticated(state)) {
    return true;
  }

  void router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const state = inject(StateService);
  const router = inject(Router);

  if (!isAuthenticated(state)) {
    return true;
  }

  void router.navigate(['/dashboard']);
  return false;
};

export const roleGuard: CanActivateFn = (route) => {
  const state = inject(StateService);
  const router = inject(Router);
  const allowedRoles = (route.data?.['roles'] as UserRole[] | undefined) || [];

  if (!isAuthenticated(state)) {
    void router.navigate(['/login']);
    return false;
  }

  if (!allowedRoles.length || state.hasAnyRole(allowedRoles)) {
    return true;
  }

  void router.navigate(['/dashboard']);
  return false;
};

export const inventoryRoleGuard: CanActivateFn = (route) => {
  const state = inject(StateService);
  const router = inject(Router);
  const type = String(route.paramMap.get('type') || '').toLowerCase();
  const rolesByType = (route.data?.['rolesByType'] as Record<string, UserRole[] | undefined> | undefined) || {};
  const allowedRoles = rolesByType[type] || [];

  if (!isAuthenticated(state)) {
    void router.navigate(['/login']);
    return false;
  }

  if (!allowedRoles.length || state.hasAnyRole(allowedRoles)) {
    return true;
  }

  void router.navigate(['/dashboard']);
  return false;
};
