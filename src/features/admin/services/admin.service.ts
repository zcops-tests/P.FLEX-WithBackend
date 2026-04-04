import { Injectable, effect, inject, untracked } from '@angular/core';
import { StateService, Machine } from '../../../services/state.service';
import { AuditService } from '../../../services/audit.service';
import { BackendApiService } from '../../../services/backend-api.service';
import {
  AppUser,
  PermissionDefinition,
  RoleDefinition,
  SystemConfig,
  SystemConfigContract,
} from '../models/admin.models';
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
  get configContract() { return this.state.systemConfigContract; }

  async refresh() {
    try {
      const [users, roles, machines, permissions, areas, configContract] = await Promise.all([
        this.backend.getUsers(),
        this.backend.getRoles(),
        this.backend.getMachines(),
        this.backend.getPermissions(),
        this.backend.getAreas(),
        this.backend.getSystemConfigContract(),
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
      this.state.systemConfigContract.set(
        this.normalizeSystemConfigContract(configContract),
      );
      this.state.setPlantShifts(
        (this.state.systemConfigContract()?.shifts || []).map((shift) => ({
          id: shift.id || shift.code,
          code: shift.code,
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
        })),
      );
      this.state.config.set(
        this.state.systemConfigContract()?.system_config || this.state.config(),
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
    const previousContract = this.state.systemConfigContract();
    const request = this.buildConfigContractRequest(newConfig);

    try {
      const savedContract = await this.backend.updateSystemConfigContract(request);
      this.applySystemConfigContract(savedContract);
      this.audit.log(
        this.state.userName(),
        this.state.userRole(),
        'ADMIN',
        'Configuracion',
        'Se actualizaron los parametros globales del sistema.',
      );
    } catch (error) {
      try {
        const reloadedContract = await this.backend.getSystemConfigContract();
        this.applySystemConfigContract(reloadedContract);
      } catch {
        if (previousContract) {
          this.applySystemConfigContract(previousContract);
        }
      }

      throw error;
    }
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

  private buildConfigContractRequest(newConfig: SystemConfig) {
    const existingShifts =
      this.state.systemConfigContract()?.shifts?.length
        ? this.state.systemConfigContract()!.shifts
        : this.state.plantShifts().map((shift) => ({
            id: shift.id,
            code: shift.code,
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
          }));

    const normalizedShifts = this.ensureContractShiftDefaults(existingShifts);

    return {
      system_config: {
        plant_name: newConfig.plantName,
        auto_logout_minutes: newConfig.autoLogoutMinutes,
        password_expiry_warning_days: newConfig.passwordExpiryWarningDays,
        password_policy_days: newConfig.passwordPolicyDays,
        operator_message: newConfig.operatorMessage,
        timezone_name: newConfig.timezoneName,
        maintenance_mode_enabled: newConfig.maintenanceModeEnabled,
        maintenance_message: newConfig.maintenanceMessage,
        offline_retention_days: newConfig.offlineRetentionDays,
        backup_frequency: newConfig.backupFrequency,
        conflict_resolution_policy: newConfig.conflictResolutionPolicy,
        production_assistant_message: newConfig.productionAssistantMessage,
        finishing_manager_message: newConfig.finishingManagerMessage,
        management_message: newConfig.managementMessage,
        failed_login_alert_mode: newConfig.failedLoginAlertMode,
        failed_login_max_attempts: newConfig.failedLoginMaxAttempts,
        ot_allow_partial_close: newConfig.otAllowPartialClose,
        ot_allow_close_with_waste: newConfig.otAllowCloseWithWaste,
        ot_allow_forced_close: newConfig.otAllowForcedClose,
        ot_forced_close_requires_reason: newConfig.otForcedCloseRequiresReason,
      },
      shifts: [
        {
          code: 'T1',
          name: newConfig.shiftName1,
          start_time: this.normalizeContractTime(newConfig.shiftTime1, normalizedShifts[0]?.startTime || '06:00'),
          end_time: this.normalizeContractTime(normalizedShifts[0]?.endTime || '14:00', '14:00'),
          crosses_midnight: false,
          active: true,
        },
        {
          code: 'T2',
          name: newConfig.shiftName2,
          start_time: this.normalizeContractTime(newConfig.shiftTime2, normalizedShifts[1]?.startTime || '14:00'),
          end_time: this.normalizeContractTime(normalizedShifts[1]?.endTime || '22:00', '22:00'),
          crosses_midnight: false,
          active: true,
        },
      ],
    };
  }

  private normalizeSystemConfigContract(contract: any): SystemConfigContract {
    const currentConfig = this.state.config();
    const normalizedShifts = Array.isArray(contract?.shifts)
      ? contract.shifts
          .map((shift: any) => ({
            id: shift.id,
            code: shift.code,
            name: shift.name,
            startTime: String(shift.startTime || shift.start_time || '').slice(0, 5),
            endTime: String(shift.endTime || shift.end_time || '').slice(0, 5),
            start_time: shift.start_time,
            end_time: shift.end_time,
            crosses_midnight: shift.crosses_midnight,
            active: shift.active,
          }))
          .sort((left, right) => String(left.code || '').localeCompare(String(right.code || '')))
      : [];

    const config = contract?.system_config || {};

    return {
      system_config: {
        ...currentConfig,
        ...config,
        plantName: config.plant_name || config.plantName || currentConfig.plantName,
        autoLogoutMinutes: config.auto_logout_minutes ?? config.autoLogoutMinutes ?? currentConfig.autoLogoutMinutes,
        passwordExpiryWarningDays: config.password_expiry_warning_days ?? config.passwordExpiryWarningDays ?? currentConfig.passwordExpiryWarningDays,
        passwordPolicyDays: config.password_policy_days ?? config.passwordPolicyDays ?? currentConfig.passwordPolicyDays,
        operatorMessage: config.operator_message || config.operatorMessage || currentConfig.operatorMessage,
        timezoneName: config.timezone_name || config.timezoneName || currentConfig.timezoneName,
        maintenanceModeEnabled: config.maintenance_mode_enabled ?? config.maintenanceModeEnabled ?? currentConfig.maintenanceModeEnabled,
        maintenanceMessage: config.maintenance_message || config.maintenanceMessage || currentConfig.maintenanceMessage,
        offlineRetentionDays: config.offline_retention_days ?? config.offlineRetentionDays ?? currentConfig.offlineRetentionDays,
        backupFrequency: config.backup_frequency || config.backupFrequency || currentConfig.backupFrequency,
        conflictResolutionPolicy: config.conflict_resolution_policy || config.conflictResolutionPolicy || currentConfig.conflictResolutionPolicy,
        productionAssistantMessage: config.production_assistant_message || config.productionAssistantMessage || currentConfig.productionAssistantMessage,
        finishingManagerMessage: config.finishing_manager_message || config.finishingManagerMessage || currentConfig.finishingManagerMessage,
        managementMessage: config.management_message || config.managementMessage || currentConfig.managementMessage,
        failedLoginAlertMode: config.failed_login_alert_mode || config.failedLoginAlertMode || currentConfig.failedLoginAlertMode,
        failedLoginMaxAttempts: config.failed_login_max_attempts ?? config.failedLoginMaxAttempts ?? currentConfig.failedLoginMaxAttempts,
        otAllowPartialClose: config.ot_allow_partial_close ?? config.otAllowPartialClose ?? currentConfig.otAllowPartialClose,
        otAllowCloseWithWaste: config.ot_allow_close_with_waste ?? config.otAllowCloseWithWaste ?? currentConfig.otAllowCloseWithWaste,
        otAllowForcedClose: config.ot_allow_forced_close ?? config.otAllowForcedClose ?? currentConfig.otAllowForcedClose,
        otForcedCloseRequiresReason: config.ot_forced_close_requires_reason ?? config.otForcedCloseRequiresReason ?? currentConfig.otForcedCloseRequiresReason,
        shiftName1: normalizedShifts[0]?.name || currentConfig.shiftName1,
        shiftTime1: normalizedShifts[0]?.startTime || currentConfig.shiftTime1,
        shiftName2: normalizedShifts[1]?.name || currentConfig.shiftName2,
        shiftTime2: normalizedShifts[1]?.startTime || currentConfig.shiftTime2,
      },
      shifts: normalizedShifts,
      audit_preview: Array.isArray(contract?.audit_preview) ? contract.audit_preview : [],
    };
  }

  private applySystemConfigContract(contract: any) {
    const normalizedContract = this.normalizeSystemConfigContract(contract);
    this.state.systemConfigContract.set(normalizedContract);
    this.state.setPlantShifts(
      normalizedContract.shifts.map((shift) => ({
        id: shift.id || shift.code,
        code: shift.code,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
      })),
    );
    this.state.config.set(normalizedContract.system_config);
  }

  private ensureContractShiftDefaults(shifts: Array<{
    id?: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
  }>) {
    const shiftMap = new Map(
      shifts.map((shift) => [String(shift.code || '').toUpperCase(), shift]),
    );

    return [
      shiftMap.get('T1') || {
        code: 'T1',
        name: 'Turno 1',
        startTime: '06:00',
        endTime: '14:00',
      },
      shiftMap.get('T2') || {
        code: 'T2',
        name: 'Turno 2',
        startTime: '14:00',
        endTime: '22:00',
      },
    ];
  }

  private normalizeContractTime(value: string | undefined, fallback: string) {
    const normalized = String(value || fallback || '').trim();
    if (/^\d{2}:\d{2}$/.test(normalized)) {
      return `${normalized}:00`;
    }

    if (/^\d{2}:\d{2}:\d{2}$/.test(normalized)) {
      return normalized;
    }

    return `${fallback}:00`;
  }
}
