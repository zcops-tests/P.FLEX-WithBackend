
import { Injectable, inject } from '@angular/core';
import { StateService, Machine } from '../../../services/state.service';
import { AuditService } from '../../../services/audit.service';
import { AppUser, RoleDefinition, SystemConfig } from '../models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private state = inject(StateService);
  private audit = inject(AuditService);

  // --- USERS ---
  
  get users() { return this.state.adminUsers; }

  addAdminUser(user: Partial<AppUser>) {
    const newUser: AppUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: user.name || '',
      username: user.username || '',
      role: user.role || 'Operario',
      active: user.active ?? true,
      assignedAreas: user.assignedAreas || []
    };
    this.state.adminUsers.update(users => [...users, newUser]);
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Crear Usuario', `Usuario creado: ${newUser.username} (${newUser.role})`);
  }

  updateAdminUser(updatedUser: AppUser) {
    this.state.adminUsers.update(users => users.map(u => u.id === updatedUser.id ? updatedUser : u));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Editar Usuario', `Usuario modificado: ${updatedUser.username}`);
  }

  deleteAdminUser(id: string) {
    const user = this.state.adminUsers().find(u => u.id === id);
    this.state.adminUsers.update(users => users.filter(u => u.id !== id));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Eliminar Usuario', `Usuario eliminado: ${user?.username || id}`);
  }

  // --- ROLES ---

  get roles() { return this.state.adminRoles; }

  updateRole(updatedRole: RoleDefinition) {
    this.state.adminRoles.update(roles => roles.map(r => r.id === updatedRole.id ? updatedRole : r));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Actualizar Rol', `Rol modificado: ${updatedRole.name}`);
  }
  
  deleteRole(id: string) {
    const role = this.state.adminRoles().find(r => r.id === id);
    this.state.adminRoles.update(roles => roles.filter(r => r.id !== id));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Eliminar Rol', `Rol eliminado: ${role?.name || id}`);
  }

  // --- MACHINES ---

  get machines() { return this.state.adminMachines; }

  addMachine(machine: Partial<Machine>) {
    const newMachine: Machine = {
      id: Math.random().toString(36).substr(2, 9),
      code: machine.code || '',
      name: machine.name || '',
      type: machine.type || 'Impresión',
      area: machine.area || '',
      status: machine.status || 'Operativa',
      active: machine.active ?? true
    };
    this.state.adminMachines.update(machines => [...machines, newMachine]);
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Crear Máquina', `Máquina registrada: ${newMachine.name}`);
  }

  updateMachine(updatedMachine: Machine) {
    this.state.adminMachines.update(machines => machines.map(m => m.id === updatedMachine.id ? updatedMachine : m));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Actualizar Máquina', `Máquina actualizada: ${updatedMachine.name} - Estado: ${updatedMachine.status}`);
  }

  deleteMachine(id: string) {
    const machine = this.state.adminMachines().find(m => m.id === id);
    this.state.adminMachines.update(machines => machines.filter(m => m.id !== id));
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Eliminar Máquina', `Máquina eliminada: ${machine?.name || id}`);
  }

  // --- CONFIG ---

  get config() { return this.state.config; }

  updateConfig(newConfig: SystemConfig) {
    this.state.config.set(newConfig);
    this.audit.log(this.state.userName(), this.state.userRole(), 'ADMIN', 'Configuración', 'Se actualizaron los parámetros globales del sistema.');
  }
}
