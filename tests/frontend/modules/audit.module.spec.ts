import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { AuditComponent } from '../../../src/features/audit/audit.component';

function createComponent() {
  const component = Object.create(AuditComponent.prototype) as AuditComponent & Record<string, any>;
  let reloadArgs: any = null;
  component.audit = {
    reload(args: any) {
      reloadArgs = args;
      return Promise.resolve();
    },
    get lastArgs() {
      return reloadArgs;
    },
  };
  return component;
}

test('audit module smoke imports audit component', () => {
  assert.equal(typeof AuditComponent, 'function');
});

test('audit module loads real logs on init with the expected paging', async () => {
  const component = createComponent();
  await component.ngOnInit();
  assert.deepEqual(component.audit.lastArgs, { page: 1, pageSize: 150 });
});
