import '@angular/compiler';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { AdminComponent } from '../../../src/features/admin/admin.component';

const adminSource = readFileSync(resolve(process.cwd(), 'src/features/admin/admin.component.ts'), 'utf8');
const usersSource = readFileSync(resolve(process.cwd(), 'src/features/admin/components/admin-users.component.ts'), 'utf8');
const rolesSource = readFileSync(resolve(process.cwd(), 'src/features/admin/components/admin-roles.component.ts'), 'utf8');
const machinesSource = readFileSync(resolve(process.cwd(), 'src/features/admin/components/admin-machines.component.ts'), 'utf8');
const configSource = readFileSync(resolve(process.cwd(), 'src/features/admin/components/admin-config.component.ts'), 'utf8');

function createAdminComponent(permissionMap: Record<string, boolean>) {
  const component = Object.create(AdminComponent.prototype) as AdminComponent & Record<string, any>;
  component.state = {
    hasPermission(permission: string) {
      return Boolean(permissionMap[permission]);
    },
  };
  component.tabPermissions = {
    users: 'admin.users.manage',
    roles: 'admin.roles.manage',
    machines: 'admin.machines.manage',
    config: 'admin.config.manage',
  };
  component.activeTab = 'users';
  return component;
}

test('admin module smoke imports root component', () => {
  assert.equal(typeof AdminComponent, 'function');
});

test('admin module routes access by tab permissions', () => {
  const component = createAdminComponent({
    'admin.users.manage': false,
    'admin.roles.manage': true,
    'admin.machines.manage': false,
    'admin.config.manage': true,
  });
  component.activeTab = component['getDefaultTab']();
  assert.equal(component.activeTab, 'roles');
  component.selectTab('users');
  assert.equal(component.activeTab, 'roles');
  component.selectTab('config');
  assert.equal(component.activeTab, 'config');
});

test('admin module exposes user, role, machine and configuration functionality in templates', () => {
  assert.match(adminSource, /Usuarios/);
  assert.match(adminSource, /Roles/);
  assert.match(adminSource, /Máquinas/);
  assert.match(adminSource, /Configuración/);
  assert.match(usersSource, /usuario/i);
  assert.match(rolesSource, /permisos/i);
  assert.match(machinesSource, /maquina|máquina/i);
  assert.match(configSource, /Auditoría y Cierre OT/);
});
