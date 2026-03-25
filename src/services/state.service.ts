import { Injectable, computed, effect, signal, untracked, inject } from '@angular/core';
import { AuditService } from './audit.service';
import { AppUser, RoleDefinition, SystemConfig } from '../features/admin/models/admin.models';
import { BackendApiService } from './backend-api.service';
import { ApiClientService } from './api-client.service';
import { BrowserStorageService } from './browser-storage.service';

export type UserRole =
  | 'Sistemas'
  | 'Jefatura'
  | 'Supervisor'
  | 'Operario'
  | 'Asistente'
  | 'Asistente de Producción'
  | 'Encargado de Clisés, Troqueles y Tintas'
  | 'Encargado de Clisés y Troqueles'
  | 'Encargado de Tintas'
  | 'Encargado de Troquelado y Rebobinado'
  | 'Jefe de Calidad'
  | 'Auditor';
export type Shift = string | null;
export type SyncStatus = 'online' | 'offline' | 'syncing' | 'conflict';
export const USER_ROLES: readonly UserRole[] = [
  'Sistemas',
  'Jefatura',
  'Supervisor',
  'Operario',
  'Asistente',
  'Asistente de Producción',
  'Encargado de Clisés, Troqueles y Tintas',
  'Encargado de Clisés y Troqueles',
  'Encargado de Tintas',
  'Encargado de Troquelado y Rebobinado',
  'Jefe de Calidad',
  'Auditor',
] as const;

const ROLE_CAPABILITIES: Record<UserRole, readonly UserRole[]> = {
  Sistemas: USER_ROLES,
  Jefatura: ['Jefatura'],
  Supervisor: ['Supervisor', 'Operario'],
  Operario: ['Operario'],
  Asistente: ['Asistente'],
  'Asistente de Producción': ['Asistente de Producción', 'Asistente', 'Operario'],
  'Encargado de Clisés, Troqueles y Tintas': [
    'Encargado de Clisés, Troqueles y Tintas',
    'Encargado de Clisés y Troqueles',
    'Encargado de Tintas',
  ],
  'Encargado de Clisés y Troqueles': ['Encargado de Clisés y Troqueles'],
  'Encargado de Tintas': ['Encargado de Tintas'],
  'Encargado de Troquelado y Rebobinado': ['Encargado de Troquelado y Rebobinado', 'Operario'],
  'Jefe de Calidad': ['Jefe de Calidad'],
  Auditor: ['Auditor'],
};

export interface User {
  id: string;
  name: string;
  role: UserRole;
  username?: string;
  roleCode?: string;
  avatar?: string;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  type: string;
  area: string;
  status: 'Operativa' | 'Mantenimiento' | 'Detenida' | 'Sin Operador';
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

interface PersistedUserSession {
  user: User | null;
  shift: Shift;
  sessionId?: string | null;
  expiresAt?: string;
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

  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly syncStatus = signal<SyncStatus>('online');
  readonly pendingSyncCount = signal<number>(0);

  readonly adminUsers = signal<AppUser[]>([]);
  readonly adminRoles = signal<RoleDefinition[]>([]);
  readonly adminMachines = signal<Machine[]>([]);
  readonly plantAreas = signal<PlantArea[]>([]);
  readonly plantShifts = signal<PlantShift[]>([]);
  readonly permissions = signal<{ id: string; code: string; name: string; description?: string }[]>([]);

  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly userName = computed(() => this.currentUser()?.name || 'Invitado');
  readonly userRole = computed(() => this.currentUser()?.role || '');
  readonly roleCode = computed(() => this.currentUser()?.roleCode || '');
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

    this.persistSession({
      user: mappedUser,
      shift,
      sessionId: response.sessionId,
      expiresAt,
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

    this.audit.log(mappedUser.name, mappedUser.role, 'ACCESO', 'Inicio de Sesion', `Usuario ${username} inicio sesion en ${shift}.`);
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

  setPermissions(permissions: { id: string; code: string; name: string; description?: string }[]) {
    this.permissions.set(permissions);
  }

  updateMachine(updatedMachine: Machine) {
    this.adminMachines.update((machines) => machines.map((m) => (m.id === updatedMachine.id ? updatedMachine : m)));
    this.audit.log(this.userName(), this.userRole(), 'OPERACIONES', 'Estado Maquina', `Maquina ${updatedMachine.name} cambio a ${updatedMachine.status}`);
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    const currentRole = this.currentUser()?.role;
    if (!currentRole || !roles.length) return false;
    const capabilities = new Set(ROLE_CAPABILITIES[currentRole] || [currentRole]);
    return roles
      .map((role) => this.normalizeUserRole(role))
      .some((role) => capabilities.has(role));
  }

  normalizeUserRole(value: string): UserRole {
    const normalized = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

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
    if (normalized.includes('WAREHOUSE') || normalized.includes('ENCARG')) return 'Encargado de Clisés, Troqueles y Tintas';
    if (normalized.includes('PLANNER') || normalized.includes('ASIST')) return 'Asistente';
    if (normalized.includes('JEFAT') || normalized.includes('MANAGER') || normalized.includes('GEREN')) return 'Jefatura';
    return 'Jefatura';
  }

  toUiMachineType(value: string): string {
    const normalized = String(value || '').toUpperCase();
    if (normalized.includes('PRINT') || normalized.includes('IMP')) return 'Impresion';
    if (normalized.includes('DIECUT') || normalized.includes('TROQ')) return 'Troquelado';
    if (normalized.includes('REWIND') || normalized.includes('PACK') || normalized.includes('ACAB')) return 'Acabado';
    return value || 'Impresion';
  }

  toUiMachineStatus(value: string): Machine['status'] {
    const normalized = String(value || '').toUpperCase();
    if (normalized.includes('MAINT')) return 'Mantenimiento';
    if (normalized.includes('STOP') || normalized.includes('DETEN')) return 'Detenida';
    if (normalized.includes('NO_OPERATOR') || normalized.includes('SIN')) return 'Sin Operador';
    return 'Operativa';
  }

  private restoreSession() {
    const session = this.readSession();
    if (!session) return;

    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      this.clearPersistedSession();
      this.apiClient.clearSession();
      return;
    }

    this.currentUser.set(session.user || null);
    this.currentShift.set(session.shift || null);
  }

  private async loadBootstrapData() {
    const tasks = await Promise.allSettled([
      this.backend.getRoles(),
      this.backend.getMachines(),
      this.backend.getUsers(),
      this.backend.getAreas(),
      this.backend.getShifts(),
      this.backend.getPermissions(),
      this.backend.getSystemConfig(),
    ]);

    const [roles, machines, users, areas, shifts, permissions, config] = tasks;

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
        plantName: config.value.plant_name || current.plantName,
        autoLogoutMinutes: config.value.auto_logout_minutes ?? current.autoLogoutMinutes,
        passwordExpiryWarningDays: config.value.password_expiry_warning_days ?? current.passwordExpiryWarningDays,
        passwordPolicyDays: config.value.password_policy_days ?? current.passwordPolicyDays,
        operatorMessage: config.value.operator_message || current.operatorMessage,
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
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: this.normalizeUserRole(user.role || user.roleCode || user.role_name),
      roleCode: user.roleCode || user.role,
    };
  }

  private mapAdminUser(user: any): AppUser {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: this.normalizeUserRole(user.role?.code || user.role_code || user.role?.name),
      active: user.active !== false,
      assignedAreas: user.assignedAreas?.map((item: any) => item.area?.name).filter(Boolean) || [],
    };
  }

  private mapRole(role: any): RoleDefinition {
    const roleName = this.normalizeUserRole(role.code || role.name);
    return {
      id: role.id,
      name: roleName,
      description: role.description || role.name || roleName,
      permissions: (role.permissions || []).map((entry: any) => entry.permission?.name || entry.permission?.code).filter(Boolean),
    };
  }

  private mapMachine(machine: any): Machine {
    return {
      id: machine.id,
      code: machine.code,
      name: machine.name,
      type: this.toUiMachineType(machine.type),
      area: machine.area?.name || machine.area_name || '',
      areaId: machine.area_id,
      status: this.toUiMachineStatus(machine.status),
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
        expiresAt: session.expiresAt,
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
}
