import { Injectable, effect, inject, untracked } from '@angular/core';
import { StateService, Machine } from '../../../services/state.service';
import { AuditService } from '../../../services/audit.service';
import { BackendApiService } from '../../../services/backend-api.service';
import { AppUser, PermissionDefinition, RoleDefinition, SystemConfig } from '../models/admin.models';
import {
  isOperatorAreaMatch,
  OPERATOR_PRODUCTION_AREAS,
  OperatorProductionArea,
  resolveCanonicalOperatorAreas,
} from '../utils/operator-area.util';

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
      if (!this.state.hasPermission('admin.panel.view')) return;
      untracked(() => {
        void this.refresh();
      });
    });
  }

  get users() { return this.state.adminUsers; }
  get roles() { return this.state.adminRoles; }
  get machines() { return this.state.adminMachines; }
  get config() { return this.state.config; }
  get permissions() { return this.state.permissions; }

  async refresh() {
    try {
      const [users, roles, machines, permissions, areas] = await Promise.all([
        this.backend.getUsers(),
        this.backend.getRoles(),
        this.backend.getMachines(),
        this.backend.getPermissions(),
        this.backend.getAreas(),
      ]);

      this.state.setAdminUsers(users.map((user: any) => this.mapUser(user)));
      this.state.setAdminRoles(roles.map((role: any) => this.mapRole(role)));
      this.state.setAdminMachines(machines.map((machine: any) => this.mapMachine(machine)));
      this.state.setPermissions(permissions.map((permission: any) => this.mapPermission(permission)));
      this.state.setPlantAreas(
        areas.map((area: any) => ({
          id: area.id,
          code: area.code,
          name: area.name,
          active: area.active !== false,
        })),
      );
    } catch {
      // Preserve current local state as fallback.
    }
  }

  async addAdminUser(user: Partial<AppUser>) {
    const role = this.resolveRole(user.role, user.roleId);
    const created = await this.backend.createUser({
      username: user.username || '',
      password: user.password?.trim() ? user.password : undefined,
      name: user.name || '',
      role_id: role?.id,
      active: user.active ?? true,
    });

    const newUser = this.mapUser(created);
    const targetAreas = this.normalizeAssignedAreas(user.assignedAreas);

    for (const areaName of targetAreas) {
      const area = this.resolveRequiredOperatorPlantArea(areaName);
      await this.backend.assignUserArea(newUser.id, { area_id: area.id });
    }

    await this.refresh();
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Crear Usuario', `Usuario creado: ${newUser.username} (${newUser.role})`);
  }

  async updateAdminUser(updatedUser: AppUser) {
    const role = this.resolveRole(updatedUser.role, updatedUser.roleId);
    await this.backend.updateUser(updatedUser.id, {
      username: updatedUser.username,
      name: updatedUser.name,
      password: updatedUser.password || undefined,
      role_id: role?.id,
      active: updatedUser.active,
    });

    try {
      const detail = await this.backend.getUser(updatedUser.id);
      const currentAreaAssignments = this.buildAssignedAreaMap(detail.assignedAreas);
      const currentAreas = Array.from(currentAreaAssignments.keys());
      const desiredAreas = this.normalizeAssignedAreas(updatedUser.assignedAreas);

      for (const areaName of currentAreas.filter((name) => !desiredAreas.includes(name))) {
        const areaId = currentAreaAssignments.get(areaName);
        if (areaId) {
          await this.backend.unassignUserArea(updatedUser.id, areaId);
        }
      }

      for (const areaName of desiredAreas.filter((name) => !currentAreas.includes(name))) {
        const area = this.resolveRequiredOperatorPlantArea(areaName);
        await this.backend.assignUserArea(updatedUser.id, { area_id: area.id });
      }
    } catch (error) {
      await this.refresh();
      throw error;
    }

    await this.refresh();
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Editar Usuario', `Usuario modificado: ${updatedUser.username}`);
  }

  async deleteAdminUser(id: string) {
    const user = this.state.adminUsers().find((item) => item.id === id);
    await this.backend.deleteUser(id);
    await this.refresh();
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Eliminar Usuario', `Usuario eliminado: ${user?.username || id}`);
  }

  async createRole(role: Partial<RoleDefinition>) {
    const created = await this.backend.createRole({
      name: role.name || '',
      description: role.description || role.name || '',
      permission_codes: role.permissionCodes || [],
      active: role.active ?? true,
    });

    await this.refresh();
    const savedRole = this.mapRole(created);
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Crear Rol', `Rol creado: ${savedRole.name}`);
    return savedRole;
  }

  async updateRole(updatedRole: RoleDefinition) {
    const saved = await this.backend.updateRole(updatedRole.id, {
      name: updatedRole.name,
      description: updatedRole.description,
      permission_codes: updatedRole.permissionCodes,
      active: updatedRole.active,
    });

    await this.refresh();
    const mappedRole = this.mapRole(saved);
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Actualizar Rol', `Rol modificado: ${mappedRole.name}`);
    return mappedRole;
  }

  async deleteRole(id: string) {
    const role = this.state.adminRoles().find((item) => item.id === id);
    await this.backend.deleteRole(id);
    await this.refresh();
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Eliminar Rol', `Rol eliminado: ${role?.name || id}`);
  }

  async addMachine(machine: Partial<Machine>) {
    const area = this.resolveRequiredArea(machine.area, machine.areaId);
    const normalizedName = this.normalizeRequiredText(
      machine.name,
      'El nombre de la máquina es obligatorio.',
    );
    const normalizedCode = this.normalizeRequiredText(
      machine.code,
      'El código de la máquina es obligatorio.',
    );
    const created = await this.backend.createMachine({
      code: normalizedCode,
      name: normalizedName,
      type: this.resolveMachineTypeForArea(area.name, area.code),
      area_id: area?.id,
      status: this.mapMachineStatusToApi(machine.status),
    });

    await this.refresh();
    const newMachine = this.mapMachine(created);
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Crear Maquina', `Maquina registrada: ${newMachine.name}`);
    return newMachine;
  }

  async updateMachine(updatedMachine: Machine) {
    const area = this.resolveRequiredArea(updatedMachine.area, updatedMachine.areaId);
    const normalizedName = this.normalizeRequiredText(
      updatedMachine.name,
      'El nombre de la máquina es obligatorio.',
    );
    const normalizedCode = this.normalizeRequiredText(
      updatedMachine.code,
      'El código de la máquina es obligatorio.',
    );
    await this.backend.updateMachine(updatedMachine.id, {
      code: normalizedCode,
      name: normalizedName,
      type: this.resolveMachineTypeForArea(area.name, area.code),
      area_id: area?.id || updatedMachine.areaId,
      status: this.mapMachineStatusToApi(updatedMachine.status),
    });

    await this.refresh();
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Actualizar Maquina', `Maquina actualizada: ${updatedMachine.name} - Estado: ${updatedMachine.status}`);
  }

  async deleteMachine(id: string) {
    const machine = this.state.adminMachines().find((item) => item.id === id);
    await this.backend.deleteMachine(id);
    await this.refresh();
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

  private resolveRole(roleName?: string, roleId?: string | null) {
    if (roleId) {
      return this.state.adminRoles().find((role) => role.id === roleId) || this.state.adminRoles()[0];
    }
    return this.state.adminRoles().find((role) => role.name === roleName) || this.state.adminRoles()[0];
  }

  private resolveArea(areaName?: string, areaId?: string) {
    const normalized = String(areaName || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

    if (areaId) {
      const byId = this.state.plantAreas().find((area) => area.id === areaId);
      if (byId) return byId;
    }

    return this.state.plantAreas().find((area) => {
      const nameToken = String(area.name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
      const codeToken = String(area.code || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();

      return normalized === nameToken || normalized === codeToken;
    });
  }

  private mapMachineTypeToApi(type: string) {
    const normalized = String(type || '').toUpperCase();
    if (normalized.includes('TROQ') || normalized.includes('DIECUT')) return 'DIECUT';
    if (normalized.includes('REBOB') || normalized.includes('REWIND')) return 'REWIND';
    if (normalized.includes('EMPAQ') || normalized.includes('PACK')) return 'PACKAGING';
    return 'PRINT';
  }

  private mapPermission(permission: any): PermissionDefinition {
    return {
      id: permission.id,
      code: permission.code,
      name: permission.name,
      description: permission.description,
    };
  }

  private mapUser(user: any): AppUser {
    const roleName = this.state.normalizeUserRole(user.role?.name || user.roleName || user.role?.code || user.role_code);
    const permissionCodes = (user.role?.permissions || [])
      .map((permission: any) => permission?.code || permission?.permission?.code)
      .filter(Boolean);

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: roleName,
      roleId: user.role?.id || user.role_id || null,
      roleCode: user.role?.code || user.role_code || null,
      roleName,
      permissionCodes: this.normalizePermissionCodes(permissionCodes),
      active: user.active !== false,
      lastLoginAt: user.last_login_at || user.lastLoginAt || null,
      assignedAreas: this.normalizeAssignedAreas(user.assignedAreas),
    };
  }

  private mapRole(role: any): RoleDefinition {
    const permissions = (role.permissions || [])
      .map((permission: any) => permission?.code ? permission : permission?.permission)
      .filter(Boolean)
      .map((permission: any) => this.mapPermission(permission));

    return {
      id: role.id,
      code: role.code,
      name: this.state.normalizeUserRole(role.name || role.legacyName || role.code),
      legacyName: role.legacyName || role.name,
      description: role.description || role.name || '',
      permissions,
      permissionCodes: role.permissionCodes || permissions.map((permission) => permission.code),
      active: role.active !== false,
      assignedUserCount: role.assignedUserCount,
      isSystem: !String(role.code || '').startsWith('CUSTOM_'),
    };
  }

  private mapMachine(machine: any): Machine {
    return {
      id: machine.id,
      code: machine.code,
      name: machine.name,
      type: this.state.toUiMachineType(
        machine.type,
        machine.area?.name || machine.area_name,
        machine.area?.code || machine.area_code,
      ),
      area: this.toDisplayAreaName(
        machine.area?.name || machine.area_name || '',
        machine.area?.code || machine.area_code || '',
      ),
      status: this.state.toUiMachineStatus(machine.uiStatus || machine.status),
      active: machine.active !== false,
      areaId: machine.area_id,
      rawType: machine.type,
    };
  }

  private resolveRequiredArea(areaName?: string, areaId?: string) {
    const area = this.resolveArea(areaName, areaId);
    if (area) {
      return area;
    }

    throw new Error('Selecciona un área de producción válida para registrar la máquina.');
  }

  private resolveMachineTypeForArea(areaName?: string, areaCode?: string) {
    return this.mapMachineTypeToApi(`${areaName || ''} ${areaCode || ''}`);
  }

  private mapMachineStatusToApi(status: string | undefined) {
    const normalized = String(status || '').toUpperCase();
    if (normalized.includes('INACT')) return 'INACTIVE';
    if (normalized.includes('MAINT') || normalized.includes('MANTEN'))
      return 'MAINTENANCE';
    if (normalized.includes('SIN')) return 'NO_OPERATOR';
    if (normalized.includes('DETEN')) return 'STOPPED';
    return 'ACTIVE';
  }

  private toDisplayAreaName(areaName?: string, areaCode?: string) {
    const normalized = `${areaName || ''} ${areaCode || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

    if (normalized.includes('TROQ')) return 'Troquelado';
    if (normalized.includes('REBOB')) return 'Rebobinado';
    if (normalized.includes('EMPAQ')) return 'Empaquetado';
    if (normalized.includes('IMP')) return 'Impresión';
    return areaName || '';
  }

  private normalizePermissionCodes(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((code) => String(code || '').trim()).filter((code) => Boolean(code)))];
  }

  private normalizeAssignedAreas(values: unknown): string[] {
    return resolveCanonicalOperatorAreas(values);
  }

  private buildAssignedAreaMap(values: unknown): Map<string, string> {
    const assignments = new Map<string, string>();

    if (!Array.isArray(values)) {
      return assignments;
    }

    for (const value of values) {
      const areaId = this.extractAreaId(value);
      if (!areaId) continue;

      for (const areaName of this.normalizeAssignedAreas([value])) {
        assignments.set(areaName, areaId);
      }
    }

    return assignments;
  }

  private resolveOperatorPlantArea(areaName: string) {
    const desiredArea = this.normalizeAssignedAreas([
      areaName,
    ])[0] as OperatorProductionArea | undefined;
    if (!desiredArea) {
      return undefined;
    }

    return this.state.plantAreas().find((area) =>
      isOperatorAreaMatch(desiredArea, area.name) ||
      isOperatorAreaMatch(desiredArea, area.code),
    );
  }

  private resolveRequiredOperatorPlantArea(areaName: string) {
    const area = this.resolveOperatorPlantArea(areaName);
    if (area) {
      return area;
    }

    throw new Error(
      `No existe el área de producción configurada para ${areaName}. Recargue la sesión o verifique la configuración de áreas.`,
    );
  }

  private extractAreaId(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as {
      id?: unknown;
      area_id?: unknown;
      area?: {
        id?: unknown;
      };
    };

    const rawId = record.area?.id || record.area_id || record.id;
    return rawId ? String(rawId) : null;
  }

  private getOperatorAreaOrder() {
    return [...OPERATOR_PRODUCTION_AREAS];
  }

  private normalizeRequiredText(value: unknown, errorMessage: string) {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      throw new Error(errorMessage);
    }

    return normalized;
  }
}
