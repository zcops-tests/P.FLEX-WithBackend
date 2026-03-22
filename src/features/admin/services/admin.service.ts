import { Injectable, effect, inject, untracked } from '@angular/core';
import { StateService, Machine } from '../../../services/state.service';
import { AuditService } from '../../../services/audit.service';
import { BackendApiService } from '../../../services/backend-api.service';
import { AppUser, RoleDefinition, SystemConfig, UserRole } from '../models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private state = inject(StateService);
  private audit = inject(AuditService);
  private backend = inject(BackendApiService);

  constructor() {
    effect(() => {
      if (!this.state.currentUser()) return;
      untracked(() => {
        void this.refresh();
      });
    });
  }

  get users() { return this.state.adminUsers; }
  get roles() { return this.state.adminRoles; }
  get machines() { return this.state.adminMachines; }
  get config() { return this.state.config; }

  async refresh() {
    try {
      const [users, roles, machines] = await Promise.all([
        this.backend.getUsers(),
        this.backend.getRoles(),
        this.backend.getMachines(),
      ]);

      this.state.setAdminUsers(users.map((user: any) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        role: this.state.normalizeUserRole(user.role?.code || user.role_id || user.role?.name),
        active: user.active !== false,
        assignedAreas: user.assignedAreas?.map((item: any) => item.area?.name).filter(Boolean) || [],
      })));
      this.state.setAdminRoles(roles.map((role: any) => ({
        id: role.id,
        name: this.state.normalizeUserRole(role.code || role.name),
        description: role.description || role.name,
        permissions: (role.permissions || []).map((item: any) => item.permission?.name || item.permission?.code).filter(Boolean),
      })));
      this.state.setAdminMachines(machines.map((machine: any) => ({
        id: machine.id,
        code: machine.code,
        name: machine.name,
        type: this.state.toUiMachineType(machine.type),
        area: machine.area?.name || '',
        status: this.state.toUiMachineStatus(machine.status),
        active: machine.active !== false,
        areaId: machine.area_id,
        rawType: machine.type,
      })));
    } catch {
      // Preserve current local state as fallback.
    }
  }

  async addAdminUser(user: Partial<AppUser>) {
    const role = this.state.adminRoles().find(r => r.name === user.role) || this.state.adminRoles()[0];
    const created = await this.backend.createUser({
      username: user.username || '',
      password: 'tempPassword123!',
      name: user.name || '',
      role_id: role?.id,
      active: user.active ?? true,
    });

    const newUser: AppUser = {
      id: created.id,
      name: created.name,
      username: created.username,
      role: (user.role || role?.name || 'Operario') as UserRole,
      active: created.active !== false,
      assignedAreas: user.assignedAreas || [],
    };

    for (const areaName of newUser.assignedAreas || []) {
      const area = this.state.plantAreas().find(item => item.name === areaName);
      if (area) {
        await this.backend.assignUserArea(newUser.id, { area_id: area.id });
      }
    }

    this.state.adminUsers.update(users => [...users, newUser]);
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Crear Usuario', `Usuario creado: ${newUser.username} (${newUser.role})`);
  }

  async updateAdminUser(updatedUser: AppUser) {
    const role = this.state.adminRoles().find(r => r.name === updatedUser.role) || this.state.adminRoles()[0];
    await this.backend.updateUser(updatedUser.id, {
      name: updatedUser.name,
      role_id: role?.id,
      active: updatedUser.active,
    });

    try {
      const detail = await this.backend.getUser(updatedUser.id);
      const currentAreas = detail.assignedAreas?.map((item: any) => item.area?.name).filter(Boolean) || [];
      for (const areaName of currentAreas.filter((name: string) => !(updatedUser.assignedAreas || []).includes(name))) {
        const area = this.state.plantAreas().find(item => item.name === areaName);
        if (area) {
          await this.backend.unassignUserArea(updatedUser.id, area.id);
        }
      }
      for (const areaName of (updatedUser.assignedAreas || []).filter(name => !currentAreas.includes(name))) {
        const area = this.state.plantAreas().find(item => item.name === areaName);
        if (area) {
          await this.backend.assignUserArea(updatedUser.id, { area_id: area.id });
        }
      }
    } catch {
      // Non-blocking area sync.
    }

    this.state.adminUsers.update(users => users.map(u => u.id === updatedUser.id ? updatedUser : u));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Editar Usuario', `Usuario modificado: ${updatedUser.username}`);
  }

  async deleteAdminUser(id: string) {
    const user = this.state.adminUsers().find(u => u.id === id);
    await this.backend.deleteUser(id);
    this.state.adminUsers.update(users => users.filter(u => u.id !== id));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Eliminar Usuario', `Usuario eliminado: ${user?.username || id}`);
  }

  updateRole(updatedRole: RoleDefinition) {
    this.state.adminRoles.update(roles => roles.map(r => r.id === updatedRole.id ? updatedRole : r));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Actualizar Rol', `Rol modificado: ${updatedRole.name}`);
  }
  
  deleteRole(id: string) {
    const role = this.state.adminRoles().find(r => r.id === id);
    this.state.adminRoles.update(roles => roles.filter(r => r.id !== id));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Eliminar Rol', `Rol eliminado: ${role?.name || id}`);
  }

  async addMachine(machine: Partial<Machine>) {
    const area = this.resolveArea(machine.area);
    const created = await this.backend.createMachine({
      code: machine.code || '',
      name: machine.name || '',
      type: this.mapMachineTypeToApi(machine.type || 'Impresion'),
      area_id: area?.id,
      active: machine.active ?? true,
    });

    const newMachine: Machine = {
      id: created.id,
      code: created.code,
      name: created.name,
      type: machine.type || 'Impresion',
      area: area?.name || machine.area || '',
      status: machine.status || 'Operativa',
      active: created.active !== false,
      areaId: created.area_id,
      rawType: created.type,
    };
    this.state.adminMachines.update(machines => [...machines, newMachine]);
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Crear Maquina', `Maquina registrada: ${newMachine.name}`);
  }

  async updateMachine(updatedMachine: Machine) {
    const area = this.resolveArea(updatedMachine.area);
    await this.backend.updateMachine(updatedMachine.id, {
      name: updatedMachine.name,
      type: this.mapMachineTypeToApi(updatedMachine.type),
      area_id: area?.id || updatedMachine.areaId,
      active: updatedMachine.active,
    });
    this.state.adminMachines.update(machines => machines.map(m => m.id === updatedMachine.id ? { ...updatedMachine, area: area?.name || updatedMachine.area } : m));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Actualizar Maquina', `Maquina actualizada: ${updatedMachine.name} - Estado: ${updatedMachine.status}`);
  }

  async deleteMachine(id: string) {
    const machine = this.state.adminMachines().find(m => m.id === id);
    await this.backend.deleteMachine(id);
    this.state.adminMachines.update(machines => machines.filter(m => m.id !== id));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Eliminar Maquina', `Maquina eliminada: ${machine?.name || id}`);
  }

  async updateConfig(newConfig: SystemConfig) {
    await this.backend.updateSystemConfig({
      plant_name: newConfig.plantName,
      auto_logout_minutes: newConfig.autoLogoutMinutes,
      password_expiry_warning_days: newConfig.passwordExpiryWarningDays,
      password_policy_days: newConfig.passwordPolicyDays,
      operator_message: newConfig.operatorMessage,
    });
    this.state.config.set(newConfig);
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Configuracion', 'Se actualizaron los parametros globales del sistema.');
  }

  private resolveArea(areaName?: string) {
    return this.state.plantAreas().find(area => area.name === areaName) || this.state.plantAreas()[0];
  }

  private mapMachineTypeToApi(type: string) {
    const normalized = String(type || '').toUpperCase();
    if (normalized.includes('TROQ') || normalized.includes('DIECUT')) return 'DIECUT';
    return 'PRINT';
  }
}
