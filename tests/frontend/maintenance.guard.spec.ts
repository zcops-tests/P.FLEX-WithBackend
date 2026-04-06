import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { maintenanceGuard } from '../../src/guards/auth.guard';
import { StateService } from '../../src/services/state.service';

function setupGuard(stateOverrides: Record<string, unknown> = {}) {
  const state = {
    canAccessDuringMaintenance: () => true,
    notifyMaintenanceRestriction() {},
    ...stateOverrides,
  };
  const router = {
    navigations: [] as string[][],
    navigate(commands: string[]) {
      this.navigations.push(commands);
      return Promise.resolve(true);
    },
  };

  const injector = createEnvironmentInjector([
    { provide: StateService, useValue: state },
    { provide: Router, useValue: router },
  ], null);

  return { state, router, injector };
}

test('maintenance guard allows navigation when maintenance is inactive', () => {
  const { injector } = setupGuard({
    canAccessDuringMaintenance: () => true,
  });

  const result = runInInjectionContext(injector, () => maintenanceGuard({} as any, {} as any));
  assert.equal(result, true);
});

test('maintenance guard allows navigation for sistemas users during maintenance', () => {
  const { injector } = setupGuard({
    canAccessDuringMaintenance: () => true,
  });

  const result = runInInjectionContext(injector, () => maintenanceGuard({} as any, {} as any));
  assert.equal(result, true);
});

test('maintenance guard blocks non-sistemas users and redirects to login', () => {
  let warned = false;
  const { router, injector } = setupGuard({
    canAccessDuringMaintenance: () => false,
    notifyMaintenanceRestriction() {
      warned = true;
    },
  });

  const result = runInInjectionContext(injector, () => maintenanceGuard({} as any, {} as any));

  assert.equal(result, false);
  assert.equal(warned, true);
  assert.deepEqual(router.navigations, [['/login']]);
});
