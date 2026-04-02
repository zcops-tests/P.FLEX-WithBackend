import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuditService } from './audit.service';
import { AppUser, PermissionDefinition, RoleDefinition, SystemConfig } from '../features/admin/models/admin.models';
import { BackendApiService } from './backend-api.service';
import { ApiClientService } from './api-client.service';
import { BrowserStorageService } from './browser-storage.service';

export type UserRole = string;
export type Shift = string | null;
export type SyncStatus = 'online' | 'offline' | 'syncing' | 'conflict';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  roleId?: string | null;
  roleCode?: string | null;
  roleName?: string;
  permissionCodes: string[];
  username?: string;
  avatar?: string;
}

export interface ActiveOperatorContext {
  id: string;
  dni: string;
  name: string;
  roleCode?: string | null;
  roleName?: string;
  assignedAreas: string[];
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  type: string;
  area: string;
  status: 'Activo' | 'Inactivo' | 'Mantenimiento' | 'Detenida' | 'Sin Operario';
  active: boolean;
  areaId?: string;
  rawType?: string;
}

export interface PlantArea {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface PlantShift {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
}

const MANAGER_WORKSPACE_ROUTES: ReadonlyArray<{ route: string; permissions: readonly string[] }> = [
  { route: '/dashboard', permissions: ['dashboard.view'] },
  { route: '/ots', permissions: ['workorders.view'] },
  { route: '/schedule', permissions: ['planning.view'] },
  { route: '/reports/print', permissions: ['reports.print.view'] },
  { route: '/reports/diecut', permissions: ['reports.diecut.view'] },
  { route: '/reports/rewind', permissions: ['reports.rewind.view'] },
  { route: '/reports/packaging', permissions: ['reports.packaging.view'] },
  { route: '/inventory/layout', permissions: ['inventory.layout.view'] },
  { route: '/inventory/clise', permissions: ['inventory.clises.view'] },
  { route: '/inventory/die', permissions: ['inventory.dies.view'] },
  { route: '/inventory/stock', permissions: ['inventory.stock.view'] },
  { route: '/inventory/ink', permissions: ['inventory.ink.view'] },
  { route: '/incidents', permissions: ['quality.incidents.view'] },
  { route: '/analytics', permissions: ['analytics.view'] },
  { route: '/audit', permissions: ['audit.view'] },
  { route: '/admin', permissions: ['admin.panel.view'] },
  { route: '/sync', permissions: ['sync.manage'] },
];

const MANAGER_WORKSPACE_PERMISSIONS = MANAGER_WORKSPACE_ROUTES.flatMap((entry) => entry.permissions);

interface PersistedUserSession {
  user: User | null;
  shift: Shift;
  sessionId?: string | null;
  expiresAt?: string;
  activeOperator?: ActiveOperatorContext | null;
}

@Injectable({ providedIn: 'root' })
export class StateService {
  private audit = inject(AuditService);
  private backend = inject(BackendApiService);
  private apiClient = inject(ApiClientService);
  private storage = inject(BrowserStorageService);
  private readonly userSessionKey = 'pflex_user_session';

  readonly config = signal<SystemConfig>({
    shiftName1: 'Turno Dia',
    shiftTime1: '06:00',
    shiftName2: 'Turno Noche',
    shiftTime2: '18:00',
    passwordExpiryWarningDays: 15,
    passwordPolicyDays: 90,
    plantName: 'Planta Central - Zona Industrial',
    autoLogoutMinutes: 30,
    operatorMessage: 'Recordar verificar el estado de los clises y troqueles al finalizar el turno.',
  });

  readonly currentUser = signal<User | null>(null);
  readonly currentShift = signal<Shift>(null);
  readonly activeOperator = signal<ActiveOperatorContext | null>(null);

  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly syncStatus = signal<SyncStatus>('online');
  readonly pendingSyncCount = signal<number>(0);

  readonly adminUsers = signal<AppUser[]>([]);
  readonly adminRoles = signal<RoleDefinition[]>([]);
  readonly adminMachines = signal<Machine[]>([]);
  readonly plantAreas = signal<PlantArea[]>([]);
  readonly plantShifts = signal<PlantShift[]>([]);
  readonly permissions = signal<PermissionDefinition[]>([]);

  readonly isLoggedIn = computed(() => !!this.currentUser() && this.canUseInteractiveSession(this.currentUser()));
  readonly userName = computed(() => this.currentUser()?.name || 'Invitado');
  readonly userRole = computed(() => this.currentUser()?.roleName || this.currentUser()?.role || '');
  readonly roleCode = computed(() => this.currentUser()?.roleCode || '');
  readonly canHostOperatorPanel = computed(() => this.hasPermission('operator.host'));
  readonly canAccessManagerWorkspace = computed(() => this.hasAnyPermission(MANAGER_WORKSPACE_PERMISSIONS));
  readonly canSwitchWorkspace = computed(() => this.canHostOperatorPanel() && this.canAccessManagerWorkspace());
  readonly managerHomeRoute = computed(() => {
    const match = MANAGER_WORKSPACE_ROUTES.find((entry) => this.hasAnyPermission(entry.permissions));
    return match?.route || '/dashboard';
  });
  readonly homeRoute = computed(() => this.canHostOperatorPanel() ? '/operator' : this.managerHomeRoute());
  readonly postLoginRoute = computed(() => this.canSwitchWorkspace() ? '/mode-selector' : this.homeRoute());
  readonly environmentRoute = computed(() => this.canSwitchWorkspace() ? '/mode-selector' : this.homeRoute());
  readonly hasActiveOperator = computed(() => !!this.activeOperator());
  readonly activeOperatorName = computed(() => this.activeOperator()?.name || 'Operario no identificado');
  readonly activeOperatorDni = computed(() => this.activeOperator()?.dni || '');
  readonly activeOperatorAreas = computed(() => this.activeOperator()?.assignedAreas || []);
  readonly sessionExpired = computed(() => {
    const session = this.readSession();
    if (!session?.expiresAt) return false;
    return new Date(session.expiresAt).getTime() <= Date.now();
  });

  constructor() {
    this.restoreSession();

    effect(() => {
      const user = this.currentUser();
      if (!user) return;
      untracked(() => {
        void this.loadBootstrapData();
      });
    });
  }

  async login(username: string, shift: Shift, password: string) {
    const response = await this.backend.login({
      username,
      password,
      deviceName: 'Web Frontend',
      deviceType: 'DESKTOP',
      deviceProfile: 'FRONTEND_APP',
    });

    const mappedUser = this.mapAuthUser(response.user);
    const expiresAt = new Date(Date.now() + this.config().autoLogoutMinutes * 60_000).toISOString();
    this.activeOperator.set(null);

    this.persistSession({
      user: mappedUser,
      shift,
      sessionId: response.sessionId,
      expiresAt,
      activeOperator: null,
    });

    this.apiClient.setSession(
      {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        sessionId: response.sessionId,
      },
      {
        user: mappedUser,
        shift,
        expiresAt,
      },
    );

    this.currentUser.set(mappedUser);
    this.currentShift.set(shift);

    this.audit.log(mappedUser.name, mappedUser.roleName || mappedUser.role, 'ACCESO', 'Inicio de Sesion', `Usuario ${username} inicio sesion en ${shift}.`);
    await this.loadBootstrapData();
    return mappedUser;
  }

  async logout() {
    try {
      if (this.currentUser()) {
        await this.backend.logout();
      }
    } catch {
      // Ignore logout transport errors and clear session locally.
    }

    const user = this.userName();
    const role = this.userRole();
    this.audit.log(user, role, 'ACCESO', 'Cierre de Sesion', 'Usuario cerro sesion manualmente.');

    this.clearPersistedSession();
    this.apiClient.clearSession();

    this.currentUser.set(null);
    this.currentShift.set(null);
    this.activeOperator.set(null);
  }

  redirectToLogin() {
    const { origin, pathname, search } = window.location;
    window.location.replace(`${origin}${pathname}${search}#/login`);
  }

  toggleSidebar() {
    this.isSidebarCollapsed.update((v) => !v);
  }

  setSyncStatus(status: SyncStatus) {
    this.syncStatus.set(status);
  }

  setPendingSyncCount(count: number) {
    this.pendingSyncCount.set(count);
  }

  setAdminUsers(users: AppUser[]) {
    this.adminUsers.set(users);
  }

  setAdminRoles(roles: RoleDefinition[]) {
    this.adminRoles.set(roles);
  }

  setAdminMachines(machines: Machine[]) {
    this.adminMachines.set(machines);
  }

  setPlantAreas(areas: PlantArea[]) {
    this.plantAreas.set(areas);
  }

  setPlantShifts(shifts: PlantShift[]) {
    this.plantShifts.set(shifts);
    this.applyShiftConfigFromShifts(shifts);
  }

  setPermissions(permissions: PermissionDefinition[]) {
    this.permissions.set(permissions);
  }

  updateMachine(updatedMachine: Machine) {
    this.adminMachines.update((machines) => machines.map((m) => (m.id === updatedMachine.id ? updatedMachine : m)));
    this.audit.log(this.userName(), this.userRole(), 'OPERACIONES', 'Estado Maquina', `Maquina ${updatedMachine.name} cambio a ${updatedMachine.status}`);
  }

  async identifyOperatorByDni(dni: string) {
    const response = await this.backend.identifyOperatorByDni({ dni: this.normalizeOperatorDni(dni) });
    const operator = this.mapOperatorUser(response);
    this.setActiveOperatorContext(operator);
    this.audit.log(
      this.userName(),
      this.userRole(),
      'OPERACION',
      'Identificar Operario',
      `Operario ${operator.name} identificado para terminal anfitrion con DNI ${operator.dni}.`,
    );
    return operator;
  }

  clearActiveOperatorContext() {
    this.setActiveOperatorContext(null);
  }

  isProcessAllowedForActiveOperator(process: string): boolean {
    const operator = this.activeOperator();
    if (!operator) return false;

    const assignedTokens = (operator.assignedAreas || [])
      .map((area) => this.toRoleToken(area))
      .filter(Boolean);

    if (!assignedTokens.length) return false;

    const aliases = this.getProcessAliases(process);
    return assignedTokens.some((token) =>
      aliases.some((alias) => token.includes(alias) || alias.includes(token)),
    );
  }

  isMachineAllowedForActiveOperator(machine: Machine, process?: string): boolean {
    const operator = this.activeOperator();
    if (!operator) return false;

    const assignedTokens = (operator.assignedAreas || [])
      .map((area) => this.toRoleToken(area))
      .filter(Boolean);

    if (!assignedTokens.length) return false;

    const machineAreaToken = this.toRoleToken(machine.area);
    if (machineAreaToken && assignedTokens.some((token) => machineAreaToken.includes(token) || token.includes(machineAreaToken))) {
      return true;
    }

    if (process) {
      return this.isProcessAllowedForActiveOperator(process);
    }

    const machineTypeAliases = this.getProcessAliases(machine.type || machine.rawType || '');
    return assignedTokens.some((token) =>
      machineTypeAliases.some((alias) => token.includes(alias) || alias.includes(token)),
    );
  }

  canCreateProcessReport(process: string): boolean {
    const normalized = this.toRoleToken(process);
    if (normalized.includes('PRINT') || normalized.includes('IMPRES')) {
      return this.hasPermission('reports.print.create');
    }
    if (normalized.includes('DIECUT') || normalized.includes('TROQ')) {
      return this.hasPermission('reports.diecut.create');
    }
    if (normalized.includes('REWIND') || normalized.includes('REBOB')) {
      return this.hasPermission('reports.rewind.create');
    }
    if (normalized.includes('PACK') || normalized.includes('EMPAQ')) {
      return this.hasPermission('reports.packaging.create');
    }
    return false;
  }

  hasPermission(permission: string | null | undefined): boolean {
    const code = String(permission || '').trim();
    if (!code) return false;
    return new Set(this.currentUser()?.permissionCodes || []).has(code);
  }

  hasAnyPermission(permissions: readonly string[]): boolean {
    if (!permissions.length) return false;
    const currentPermissions = new Set(this.currentUser()?.permissionCodes || []);
    return permissions.some((permission) => currentPermissions.has(String(permission || '').trim()));
  }

  hasAllPermissions(permissions: readonly string[]): boolean {
    if (!permissions.length) return true;
    const currentPermissions = new Set(this.currentUser()?.permissionCodes || []);
    return permissions.every((permission) => currentPermissions.has(String(permission || '').trim()));
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    const current = this.currentUser();
    if (!current || !roles.length) return false;

    const currentRoles = new Set(
      [current.role, current.roleName, current.roleCode]
        .map((value) => this.toRoleToken(value))
        .filter(Boolean),
    );

    return roles.some((role) => currentRoles.has(this.toRoleToken(role)));
  }

  normalizeUserRole(value: string): UserRole {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const normalized = this.toRoleToken(raw);
    if (normalized.includes('AUDIT')) return 'Auditor';
    if (normalized.includes('QUALITY') || (normalized.includes('CALIDAD') && normalized.includes('JEFE'))) return 'Jefe de Calidad';
    if (normalized.includes('PRODUCTION_ASSISTANT') || normalized.includes('ASISTENTE DE PRODUCCION')) return 'Asistente de Producción';
    if ((normalized.includes('CLISE') || normalized.includes('CLICHE')) && normalized.includes('TINTA')) return 'Encargado de Clisés, Troqueles y Tintas';
    if (normalized.includes('CLISE') || normalized.includes('CLICHE')) return 'Encargado de Clisés y Troqueles';
    if (normalized.includes('TROQUELADO') || normalized.includes('REBOBINADO') || normalized.includes('FINISHING')) return 'Encargado de Troquelado y Rebobinado';
    if (normalized.includes('TINTA') || normalized.includes('INK')) return 'Encargado de Tintas';
    if (normalized.includes('ADMIN') || normalized.includes('SISTEM')) return 'Sistemas';
    if (normalized.includes('SUPERVISOR')) return 'Supervisor';
    if (normalized.includes('OPERATOR') || normalized.includes('OPERARIO')) return 'Operario';
    if (normalized.includes('WAREHOUSE')) return 'Encargado de Clisés, Troqueles y Tintas';
    if (normalized.includes('PLANNER') || normalized === 'ASISTENTE') return 'Asistente';
    if (normalized.includes('JEFAT') || normalized.includes('MANAGER') || normalized.includes('GEREN')) return 'Jefatura';
    return raw;
  }

  toUiMachineType(value: string, areaName?: string, areaCode?: string): string {
    const normalized = String(value || '').toUpperCase();
    const normalizedAreaName = String(areaName || '').toUpperCase();
    const normalizedAreaCode = String(areaCode || '').toUpperCase();
    if (normalized.includes('PRINT') || normalized.includes('IMP')) return 'Impresión';
    if (normalized.includes('DIECUT') || normalized.includes('TROQ')) return 'Troquelado';
    if (
      normalized.includes('PACK') ||
      normalized.includes('EMPAQ') ||
      normalizedAreaName.includes('EMPAQ') ||
      normalizedAreaCode.includes('EMPAQ')
    ) {
      return 'Empaquetado';
    }
    if (
      normalized.includes('REWIND') ||
      normalized.includes('REBOB') ||
      normalized.includes('ACAB') ||
      normalizedAreaName.includes('REBOB') ||
      normalizedAreaCode.includes('REBOB')
    ) {
      return 'Rebobinado';
    }
    return value || 'Impresión';
  }

  toUiMachineStatus(value: string): Machine['status'] {
    const normalized = String(value || '').toUpperCase();
    if (normalized.includes('INACT')) return 'Inactivo';
    if (normalized.includes('MAINT')) return 'Mantenimiento';
    if (normalized.includes('STOP') || normalized.includes('DETEN')) return 'Detenida';
    if (normalized.includes('NO_OPERATOR') || normalized.includes('SIN')) return 'Sin Operario';
    return 'Activo';
  }

  toUiAreaName(value: string, code?: string): string {
    const normalized = `${value || ''} ${code || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

    if (normalized.includes('TROQ')) return 'Troquelado';
    if (normalized.includes('REBOB')) return 'Rebobinado';
    if (normalized.includes('EMPAQ')) return 'Empaquetado';
    if (normalized.includes('IMP')) return 'Impresión';
    return value || '';
  }

  private restoreSession() {
    const session = this.readSession();
    if (!session) return;

    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      this.clearPersistedSession();
      this.apiClient.clearSession();
      return;
    }

    const mappedUser = this.mapPersistedUser(session.user);
    if (!this.canUseInteractiveSession(mappedUser)) {
      this.clearPersistedSession();
      this.apiClient.clearSession();
      return;
    }

    this.currentUser.set(mappedUser);
    this.currentShift.set(session.shift || null);
    this.activeOperator.set(this.mapPersistedOperator(session.activeOperator || null));
  }

  private async loadBootstrapData() {
    const tasks = await Promise.allSettled([
      this.backend.me(),
      this.backend.getRoles(),
      this.backend.getMachines(),
      this.backend.getUsers(),
      this.backend.getAreas(),
      this.backend.getShifts(),
      this.backend.getPermissions(),
      this.backend.getSystemConfig(),
    ]);

    const [me, roles, machines, users, areas, shifts, permissions, config] = tasks;

    if (me.status === 'fulfilled') {
      const refreshedUser = this.mapAuthUser(me.value);
      if (!this.isSameUserAccess(this.currentUser(), refreshedUser)) {
        const persistedSession = this.readSession();
        const nextSession: PersistedUserSession = {
          user: refreshedUser,
          shift: this.currentShift(),
          sessionId: persistedSession?.sessionId || null,
          expiresAt: persistedSession?.expiresAt,
          activeOperator: this.activeOperator(),
        };
        this.persistSession(nextSession);
        this.currentUser.set(refreshedUser);
      }
    }

    if (roles.status === 'fulfilled') {
      this.adminRoles.set(roles.value.map((role) => this.mapRole(role)));
    }

    if (areas.status === 'fulfilled') {
      this.plantAreas.set(
        areas.value.map((area: any) => ({
          id: area.id,
          code: area.code,
          name: area.name,
          active: area.active !== false,
        })),
      );
    }

    if (machines.status === 'fulfilled') {
      this.adminMachines.set(machines.value.map((machine: any) => this.mapMachine(machine)));
    }

    if (users.status === 'fulfilled') {
      this.adminUsers.set(users.value.map((user: any) => this.mapAdminUser(user)));
    }

    if (shifts.status === 'fulfilled') {
      this.setPlantShifts(
        shifts.value.map((shift: any) => ({
          id: shift.id,
          code: shift.code,
          name: shift.name,
          startTime: this.normalizeTime(shift.start_time),
          endTime: this.normalizeTime(shift.end_time),
        })),
      );
    }

    if (permissions.status === 'fulfilled') {
      this.permissions.set(
        permissions.value.map((permission: any) => ({
          id: permission.id,
          code: permission.code,
          name: permission.name,
          description: permission.description,
        })),
      );
    }

    if (config.status === 'fulfilled') {
      this.config.update((current) => ({
        ...current,
        plantName: config.value.plant_name || config.value.plantName || current.plantName,
        autoLogoutMinutes: config.value.auto_logout_minutes ?? config.value.autoLogoutMinutes ?? current.autoLogoutMinutes,
        passwordExpiryWarningDays: config.value.password_expiry_warning_days ?? config.value.passwordExpiryWarningDays ?? current.passwordExpiryWarningDays,
        passwordPolicyDays: config.value.password_policy_days ?? config.value.passwordPolicyDays ?? current.passwordPolicyDays,
        operatorMessage: config.value.operator_message || config.value.operatorMessage || current.operatorMessage,
      }));
    }
  }

  private applyShiftConfigFromShifts(shifts: PlantShift[]) {
    if (!shifts.length) return;
    this.config.update((current) => ({
      ...current,
      shiftName1: shifts[0]?.name || current.shiftName1,
      shiftTime1: shifts[0]?.startTime || current.shiftTime1,
      shiftName2: shifts[1]?.name || current.shiftName2,
      shiftTime2: shifts[1]?.startTime || current.shiftTime2,
    }));
  }

  private mapAuthUser(user: any): User {
    const roleName = this.normalizeUserRole(user.roleName || user.role || user.role_name || user.roleCode);
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: roleName,
      roleId: user.roleId || user.role_id || null,
      roleCode: user.roleCode || user.role_code || null,
      roleName,
      permissionCodes: this.normalizePermissionCodes(user.permissionCodes),
    };
  }

  private mapOperatorUser(user: any): ActiveOperatorContext {
    return {
      id: user.id,
      dni: this.normalizeOperatorDni(user.username || user.dni || ''),
      name: user.name,
      roleCode: user.role?.code || user.roleCode || user.role_code || 'OPERATOR',
      roleName: this.normalizeUserRole(user.role?.name || user.roleName || user.role?.code || user.role_code || 'Operario'),
      assignedAreas: user.assignedAreas?.map((item: any) => item.area?.name || item.name).filter(Boolean) || [],
    };
  }

  private mapPersistedUser(user: User | null): User | null {
    if (!user) return null;
    return {
      ...user,
      role: this.normalizeUserRole(user.roleName || user.role || user.roleCode || ''),
      roleName: this.normalizeUserRole(user.roleName || user.role || user.roleCode || ''),
      permissionCodes: this.normalizePermissionCodes(user.permissionCodes),
    };
  }

  private mapPersistedOperator(operator: ActiveOperatorContext | null): ActiveOperatorContext | null {
    if (!operator) return null;
    return {
      ...operator,
      dni: this.normalizeOperatorDni(operator.dni),
      roleName: this.normalizeUserRole(operator.roleName || operator.roleCode || 'Operario'),
      assignedAreas: Array.isArray(operator.assignedAreas)
        ? [...new Set(operator.assignedAreas.map((area) => String(area || '').trim()).filter(Boolean))]
        : [],
    };
  }

  private mapAdminUser(user: any): AppUser {
    const roleName = this.normalizeUserRole(user.role?.name || user.roleName || user.role?.code || user.role_code);
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
      assignedAreas: user.assignedAreas?.map((item: any) => item.area?.name || item.name).filter(Boolean) || [],
    };
  }

  private mapRole(role: any): RoleDefinition {
    const permissions = (role.permissions || [])
      .map((permission: any) => permission?.code ? permission : permission?.permission)
      .filter(Boolean)
      .map((permission: any) => ({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
      }));

    const name = this.normalizeUserRole(role.name || role.legacyName || role.code);
    return {
      id: role.id,
      code: role.code,
      name,
      legacyName: role.legacyName || name,
      description: role.description || role.name || name,
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
      type: this.toUiMachineType(
        machine.type,
        machine.area?.name || machine.area_name,
        machine.area?.code || machine.area_code,
      ),
      area: this.toUiAreaName(
        machine.area?.name || machine.area_name || '',
        machine.area?.code || machine.area_code || '',
      ),
      areaId: machine.area_id,
      status: this.toUiMachineStatus(machine.uiStatus || machine.status),
      active: machine.active !== false,
      rawType: machine.type,
    };
  }

  private normalizeTime(value: string | undefined): string {
    if (!value) return '';
    return String(value).slice(0, 5);
  }

  private persistSession(session: PersistedUserSession) {
    this.storage.setItem(this.userSessionKey, JSON.stringify(session));
    this.storage.setItem(
      'pflex_session',
      JSON.stringify({
        sessionId: session.sessionId || null,
        user: session.user,
        shift: session.shift,
        expiresAt: session.expiresAt,
        activeOperator: session.activeOperator || null,
      }),
    );
  }

  private clearPersistedSession() {
    this.storage.removeItem(this.userSessionKey);
    this.storage.removeItem('pflex_session');
    this.storage.removeItem('pflex_access_token');
    this.storage.removeItem('pflex_refresh_token');
  }

  private readSession(): PersistedUserSession | null {
    const raw = this.storage.getItem(this.userSessionKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as PersistedUserSession;
    } catch {
      this.storage.removeItem(this.userSessionKey);
      return null;
    }
  }

  private setActiveOperatorContext(operator: ActiveOperatorContext | null) {
    const normalizedOperator = this.mapPersistedOperator(operator);
    this.activeOperator.set(normalizedOperator);

    const currentSession = this.readSession();
    if (!currentSession) return;

    this.persistSession({
      ...currentSession,
      activeOperator: normalizedOperator,
    });
  }

  private canUseInteractiveSession(user: Pick<User, 'role' | 'roleCode' | 'roleName'> | null | undefined) {
    const tokens = [user?.roleCode, user?.roleName, user?.role]
      .map((value) => this.toRoleToken(value))
      .filter(Boolean);

    return !tokens.some((token) => token === 'OPERATOR' || token.includes('OPERARIO'));
  }

  private normalizeOperatorDni(value: string | null | undefined) {
    return String(value || '').replace(/\D/g, '').trim();
  }

  private getProcessAliases(process: string): string[] {
    const normalized = this.toRoleToken(process);
    if (normalized.includes('PRINT') || normalized.includes('IMPRES')) {
      return ['IMPRESION', 'IMPRENTA', 'PRINT'];
    }
    if (normalized.includes('DIECUT') || normalized.includes('TROQ')) {
      return ['TROQUELADO', 'DIECUT'];
    }
    if (normalized.includes('PACK') || normalized.includes('EMPAQ')) {
      return ['EMPAQUETADO', 'PACKAGING', 'PACK', 'ACABADO', 'FINISH'];
    }
    if (normalized.includes('REWIND') || normalized.includes('REBOB') || normalized.includes('ACAB')) {
      return ['REBOBINADO', 'REWIND', 'ACABADO', 'FINISH'];
    }
    return [normalized].filter(Boolean);
  }

  private toRoleToken(value: string | null | undefined) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  private isSameUserAccess(current: User | null, next: User | null) {
    if (!current && !next) return true;
    if (!current || !next) return false;
    if (current.id !== next.id) return false;
    if ((current.roleCode || '') !== (next.roleCode || '')) return false;
    if ((current.roleName || current.role || '') !== (next.roleName || next.role || '')) return false;

    const currentPermissions = [...new Set(current.permissionCodes || [])].sort();
    const nextPermissions = [...new Set(next.permissionCodes || [])].sort();
    return currentPermissions.join('|') === nextPermissions.join('|');
  }

  private normalizePermissionCodes(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((code) => String(code || '').trim()).filter((code) => Boolean(code)))];
  }
}
