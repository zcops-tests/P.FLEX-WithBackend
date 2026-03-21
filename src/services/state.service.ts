
import { Injectable, signal, computed, inject } from '@angular/core';
import { AuditService } from './audit.service';
import { AppUser, RoleDefinition, SystemConfig } from '../features/admin/models/admin.models';

export type UserRole = 'Jefatura' | 'Supervisor' | 'Asistente' | 'Operario' | 'Encargado' | 'Sistemas';
export type Shift = 'Turno Día' | 'Turno Noche' | string | null;
export type SyncStatus = 'online' | 'offline' | 'syncing' | 'conflict';

export interface User {
  id: string;
  name: string;
  role: UserRole;
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
}

@Injectable({ providedIn: 'root' })
export class StateService {
  private audit = inject(AuditService);

  // Global Configuration (Signal)
  readonly config = signal<SystemConfig>({
    shiftName1: 'Turno Día',
    shiftTime1: '06:00',
    shiftName2: 'Turno Noche',
    shiftTime2: '18:00',
    passwordExpiryWarningDays: 15,
    passwordPolicyDays: 90,
    plantName: 'Planta Central - Zona Industrial',
    autoLogoutMinutes: 30,
    operatorMessage: 'Recordar verificar el estado de los clichés y troqueles al finalizar el turno noche. Reportar daños en Incidencias.'
  });

  // Authentication State (Signals)
  readonly currentUser = signal<User | null>(null);
  readonly currentShift = signal<Shift>(null);
  
  // App State (Signals)
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly syncStatus = signal<SyncStatus>('online');
  readonly pendingSyncCount = signal<number>(0);

  // --- ADMIN DATA STORE (Signals) ---
  readonly adminUsers = signal<AppUser[]>([
    { id: '1', name: 'Juan Perez', username: 'jperez', role: 'Supervisor', active: true },
    { id: '2', name: 'Maria Garcia', username: 'mgarcia', role: 'Jefatura', active: true },
    { id: '3', name: 'Pedro Operador', username: 'poperador', role: 'Operario', active: true },
    { id: '4', name: 'Carlos Admin', username: 'admin', role: 'Sistemas', active: true },
  ]);

  readonly adminRoles = signal<RoleDefinition[]>([
    { id: 'r1', name: 'Jefatura', description: 'Acceso total a reportes, KPIs y aprobación.', permissions: ['Ver Dashboard', 'Aprobar OTs', 'Reportes', 'Gestión Usuarios'] },
    { id: 'r2', name: 'Supervisor', description: 'Gestión de turno y asignación.', permissions: ['Asignar Tareas', 'Cerrar Turno', 'Validar Calidad', 'Ver OTs'] },
    { id: 'r3', name: 'Operario', description: 'Registro de producción.', permissions: ['Registrar Producción', 'Ver OTs'] },
    { id: 'r4', name: 'Sistemas', description: 'Configuración técnica.', permissions: ['Admin Total'] }
  ]);

  readonly adminMachines = signal<Machine[]>([
    // IMPRESIÓN
    { id: 'p1', code: 'IMP-01', name: 'SUPERPRINT 1', type: 'Impresión', area: 'Nave A', status: 'Operativa', active: true },
    { id: 'p2', code: 'IMP-02', name: 'SUPERPRINT 2', type: 'Impresión', area: 'Nave A', status: 'Operativa', active: true },
    { id: 'p3', code: 'IMP-03', name: 'SUPERFLEX 250', type: 'Impresión', area: 'Nave A', status: 'Operativa', active: true },
    { id: 'p4', code: 'IMP-04', name: 'SUPERFLEX ELITE', type: 'Impresión', area: 'Nave A', status: 'Mantenimiento', active: true },
    { id: 'p5', code: 'IMP-05', name: 'MARK ANDY 4120', type: 'Impresión', area: 'Nave B', status: 'Operativa', active: true },
    { id: 'p6', code: 'IMP-06', name: 'MARK ANDY 2100', type: 'Impresión', area: 'Nave B', status: 'Operativa', active: true },
    { id: 'p7', code: 'IMP-07', name: 'EVOLUTION', type: 'Impresión', area: 'Nave B', status: 'Operativa', active: true },
    { id: 'p8', code: 'IMP-08', name: 'MARK ANDY 4200', type: 'Impresión', area: 'Nave B', status: 'Operativa', active: true },
    { id: 'p9', code: 'IMP-09', name: 'REINAFLEX', type: 'Impresión', area: 'Nave A', status: 'Detenida', active: true },
    // TROQUELADO
    { id: 'd1', code: 'TRQ-01', name: 'PLANA 1', type: 'Troquelado', area: 'Nave C', status: 'Operativa', active: true },
    { id: 'd2', code: 'TRQ-02', name: 'PLANA 2', type: 'Troquelado', area: 'Nave C', status: 'Operativa', active: true },
    { id: 'd3', code: 'TRQ-03', name: 'PLANA 3', type: 'Troquelado', area: 'Nave C', status: 'Sin Operador', active: true },
    { id: 'd4', code: 'TRQ-04', name: 'PLANA 4', type: 'Troquelado', area: 'Nave C', status: 'Operativa', active: true },
    { id: 'd5', code: 'TRQ-05', name: 'PLANA 5', type: 'Troquelado', area: 'Nave C', status: 'Operativa', active: true },
    { id: 'd6', code: 'TRQ-06', name: 'PLANA 6', type: 'Troquelado', area: 'Nave C', status: 'Operativa', active: true },
    { id: 'd7', code: 'TRQ-07', name: 'MARK ANDY 830-1', type: 'Troquelado', area: 'Nave C', status: 'Operativa', active: true },
    { id: 'd8', code: 'TRQ-08', name: 'MARK ANDY 830-2', type: 'Troquelado', area: 'Nave C', status: 'Mantenimiento', active: true },
    { id: 'd9', code: 'TRQ-09', name: 'FOCUS', type: 'Troquelado', area: 'Nave C', status: 'Operativa', active: true },
    { id: 'd10', code: 'TRQ-10', name: 'MASTER', type: 'Troquelado', area: 'Nave C', status: 'Operativa', active: true },
    { id: 'd11', code: 'TRQ-11', name: 'DK-320', type: 'Troquelado', area: 'Nave C', status: 'Operativa', active: true },
    { id: 'd12', code: 'TRQ-12', name: 'MAQUIFLEX', type: 'Troquelado', area: 'Nave C', status: 'Operativa', active: true },
    // ACABADO
    { id: 'r1', code: 'RBB-01', name: 'REBOBINADORA 1', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r2', code: 'RBB-02', name: 'REBOBINADORA 2', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r3', code: 'RBB-03', name: 'REBOBINADORA 3', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r4', code: 'RBB-04', name: 'REBOBINADORA 4', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r5', code: 'RBB-05', name: 'REBOBINADORA 5', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r6', code: 'RBB-06', name: 'REBOBINADORA 6', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r7', code: 'RBB-07', name: 'REBOBINADORA 7', type: 'Acabado', area: 'Nave D', status: 'Mantenimiento', active: true },
    { id: 'r8', code: 'RBB-08', name: 'REBOBINADORA 8', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r9', code: 'RBB-09', name: 'ROTOFLEX', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r10', code: 'RBB-10', name: 'REB EVO', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r11', code: 'RBB-11', name: 'BGM', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r12', code: 'RBB-12', name: 'BLISTER 1', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
    { id: 'r13', code: 'RBB-13', name: 'BLISTER 2', type: 'Acabado', area: 'Nave D', status: 'Operativa', active: true },
  ]);
  
  // Computed Signals
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly userName = computed(() => this.currentUser()?.name || 'Invitado');
  readonly userRole = computed(() => this.currentUser()?.role || '');

  // Logic
  login(username: string, shift: Shift) {
    let role: UserRole = 'Supervisor';
    let name = 'Juan Supervisor';
    const lowerUser = username.toLowerCase().trim();

    const foundUser = this.adminUsers().find(u => u.username.toLowerCase() === lowerUser);
    if (foundUser && foundUser.active) {
       role = foundUser.role;
       name = foundUser.name;
    } else if (lowerUser === 'admin') {
      role = 'Sistemas';
      name = 'Admin Sistema';
    } else if (lowerUser === 'jefe') {
      role = 'Jefatura';
      name = 'Carlos Gerencia';
    } else if (lowerUser === 'operario') {
      role = 'Operario';
      name = 'Pedro Operador';
    }

    this.currentUser.set({
      id: 'u-' + Date.now(),
      name: name,
      role: role
    });
    this.currentShift.set(shift);

    // AUDIT LOG
    this.audit.log(name, role, 'ACCESO', 'Inicio de Sesión', `Usuario ${username} inició sesión en ${shift}.`);
  }

  logout() {
    // AUDIT LOG
    const user = this.userName();
    const role = this.userRole();
    this.audit.log(user, role, 'ACCESO', 'Cierre de Sesión', 'Usuario cerró sesión manualmente.');

    this.currentUser.set(null);
    this.currentShift.set(null);
  }

  toggleSidebar() {
    this.isSidebarCollapsed.update(v => !v);
  }

  setSyncStatus(status: SyncStatus) {
    this.syncStatus.set(status);
  }

  updateMachine(updatedMachine: Machine) {
    this.adminMachines.update(machines => machines.map(m => m.id === updatedMachine.id ? updatedMachine : m));
    // Operational update log
    this.audit.log(this.userName(), this.userRole(), 'OPERACIONES', 'Estado Máquina', `Máquina ${updatedMachine.name} cambió a ${updatedMachine.status}`);
  }
}
