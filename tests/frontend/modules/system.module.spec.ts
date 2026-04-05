import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { SyncCenterComponent } from '../../../src/features/system/sync-center.component';

function createComponent() {
  const component = Object.create(SyncCenterComponent.prototype) as SyncCenterComponent & Record<string, any>;
  const calls: string[] = [];
  component.state = {
    setPendingSyncCount() { calls.push('setPendingSyncCount'); },
    setSyncStatus(status: string) { calls.push(`setSyncStatus:${status}`); },
  };
  component.backend = {
    async getSyncStatus() {
      return {
        connected: true,
        last_server_change_at: null,
        last_sync_activity_at: null,
        counts: { pending: 1, conflicts: 0, errors: 0 },
        pending_mutations: [],
        issues: [],
      };
    },
    async syncPull() {
      return { items: [{ id: 1 }], has_more: false };
    },
  };
  component.isLoading = false;
  component.isSyncing = false;
  component.lastManualSyncMessage = '';
  component.status = null;
  component.__calls = calls;
  return component;
}

test('system module smoke imports sync center component', () => {
  assert.equal(typeof SyncCenterComponent, 'function');
});

test('system module derives sync status tone and supports manual sync', async () => {
  const component = createComponent();
  await component.ngOnInit();
  assert.equal(component.pendingCount, 1);
  assert.equal(component.statusTone, 'warning');
  await component.forceSync();
  assert.match(component.lastManualSyncMessage, /Se descargaron 1 cambios/);
});
