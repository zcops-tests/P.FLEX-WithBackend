import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StateService } from '../services/state.service';

function isAuthenticated(state: StateService) {
  return state.isLoggedIn() && !state.sessionExpired();
}

function resolvePermissionAccess(
  state: StateService,
  permissions: readonly string[] | undefined,
  roles: readonly string[] | undefined,
) {
  if (permissions?.length) {
    return state.hasAnyPermission(permissions);
  }

  if (roles?.length) {
    return state.hasAnyRole(roles);
  }

  return true;
}

function redirectToHome(state: StateService, router: Router) {
  void router.navigate([state.homeRoute()]);
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

  void router.navigate([state.homeRoute()]);
  return false;
};

export const roleGuard: CanActivateFn = (route) => {
  const state = inject(StateService);
  const router = inject(Router);
  const allowedPermissions = (route.data?.['permissions'] as string[] | undefined) || [];
  const allowedRoles = (route.data?.['roles'] as string[] | undefined) || [];

  if (!isAuthenticated(state)) {
    void router.navigate(['/login']);
    return false;
  }

  if (resolvePermissionAccess(state, allowedPermissions, allowedRoles)) {
    return true;
  }

  redirectToHome(state, router);
  return false;
};

export const inventoryRoleGuard: CanActivateFn = (route) => {
  const state = inject(StateService);
  const router = inject(Router);
  const type = String(route.paramMap.get('type') || '').toLowerCase();
  const permissionsByType = (route.data?.['permissionsByType'] as Record<string, string[] | undefined> | undefined) || {};
  const rolesByType = (route.data?.['rolesByType'] as Record<string, string[] | undefined> | undefined) || {};
  const allowedPermissions = permissionsByType[type] || [];
  const allowedRoles = rolesByType[type] || [];

  if (!isAuthenticated(state)) {
    void router.navigate(['/login']);
    return false;
  }

  if (resolvePermissionAccess(state, allowedPermissions, allowedRoles)) {
    return true;
  }

  redirectToHome(state, router);
  return false;
};
