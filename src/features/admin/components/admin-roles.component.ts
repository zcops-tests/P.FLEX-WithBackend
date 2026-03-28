import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../../services/state.service';
import { AdminService } from '../services/admin.service';
import { PermissionDefinition, RoleDefinition } from '../models/admin.models';

type EditableRole = Partial<RoleDefinition> & { permissionCodes: string[] };

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Roles del sistema</h2>
          <p class="text-sm text-slate-400">Incluye los roles predefinidos solicitados y los roles personalizados creados desde el panel.</p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <input
            [(ngModel)]="searchTerm"
            class="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary sm:w-72"
            placeholder="Buscar rol o permiso..."
            type="text"
          />
          <button
            (click)="openRoleModal()"
            class="rounded-xl border border-primary/40 bg-primary/80 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary"
          >
            Crear Rol
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article
          *ngFor="let role of filteredRoles"
          class="rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:border-primary/30 hover:bg-white/[0.07]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-bold text-white">{{ role.name }}</h3>
                <span class="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  [ngClass]="role.isSystem ? 'border-blue-400/30 bg-blue-500/10 text-blue-300' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'">
                  {{ role.isSystem ? 'Predefinido' : 'Personalizado' }}
                </span>
                <span *ngIf="!role.active" class="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-300">
                  Inactivo
                </span>
              </div>

              <p class="text-sm text-slate-400">{{ role.description || 'Sin descripción registrada.' }}</p>
            </div>

            <div class="flex items-center gap-2">
              <button
                (click)="openRoleModal(role)"
                class="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Editar
              </button>
              <button
                *ngIf="!role.isSystem"
                (click)="deleteRole(role)"
                class="rounded-lg border border-red-500/20 px-3 py-2 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/10 hover:text-white"
              >
                Eliminar
              </button>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-xl border border-white/10 bg-black/10 p-3">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Código</div>
              <div class="mt-1 font-mono text-slate-200">{{ role.code }}</div>
            </div>
            <div class="rounded-xl border border-white/10 bg-black/10 p-3">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Usuarios asignados</div>
              <div class="mt-1 text-lg font-bold text-white">{{ role.assignedUserCount ?? 0 }}</div>
            </div>
          </div>

          <div class="mt-4">
            <div class="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Permisos</div>
            <div class="flex flex-wrap gap-2">
              <span
                *ngFor="let permission of role.permissions.slice(0, 8)"
                class="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200"
              >
                {{ permission.name }}
              </span>
              <span
                *ngIf="role.permissions.length > 8"
                class="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400"
              >
                +{{ role.permissions.length - 8 }} más
              </span>
            </div>
          </div>
        </article>
      </div>

      <div *ngIf="showRoleModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div class="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1e293b]">
          <div class="flex items-center justify-between border-b border-white/10 bg-[#0f172a] px-6 py-4">
            <div>
              <h3 class="text-lg font-bold text-white">{{ tempRole.id ? 'Editar Rol' : 'Crear Rol' }}</h3>
              <p class="text-xs text-slate-400">
                {{ tempRole.isSystem ? 'Rol predefinido del sistema.' : 'Los roles personalizados usan permisos dinámicos.' }}
              </p>
            </div>
            <button (click)="closeRoleModal()" class="text-slate-400 transition-colors hover:text-white">Cerrar</button>
          </div>

          <div class="grid gap-6 overflow-y-auto p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <section class="space-y-4">
              <div>
                <label class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Nombre</label>
                <input
                  [(ngModel)]="tempRole.name"
                  class="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ej: Supervisor de Planta"
                />
              </div>

              <div>
                <label class="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Descripción</label>
                <textarea
                  [(ngModel)]="tempRole.description"
                  rows="4"
                  class="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Breve descripción del rol..."
                ></textarea>
              </div>

              <div class="rounded-xl border border-white/10 bg-white/5 p-4">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resumen</div>
                <div class="mt-3 space-y-2 text-sm text-slate-300">
                  <div>Permisos seleccionados: <strong class="text-white">{{ tempRole.permissionCodes.length }}</strong></div>
                  <div>Tipo: <strong class="text-white">{{ tempRole.isSystem ? 'Predefinido' : 'Personalizado' }}</strong></div>
                  <div *ngIf="tempRole.code">Código: <strong class="font-mono text-white">{{ tempRole.code }}</strong></div>
                </div>
              </div>
            </section>

            <section class="space-y-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h4 class="text-sm font-bold text-white">Permisos disponibles</h4>
                  <p class="text-xs text-slate-400">Selecciona exactamente los accesos que tendrá el rol.</p>
                </div>
                <input
                  [(ngModel)]="permissionSearch"
                  class="w-full max-w-xs rounded-xl border border-white/10 bg-[#111827] px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Filtrar permisos..."
                />
              </div>

              <div class="space-y-4">
                <div *ngFor="let group of filteredPermissionGroups" class="rounded-2xl border border-white/10 bg-black/10">
                  <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div>
                      <div class="text-sm font-bold text-white">{{ group.label }}</div>
                      <div class="text-[10px] uppercase tracking-wider text-slate-500">{{ group.permissions.length }} permisos</div>
                    </div>
                    <button
                      (click)="toggleGroup(group.permissions)"
                      class="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {{ areAllSelected(group.permissions) ? 'Quitar grupo' : 'Seleccionar grupo' }}
                    </button>
                  </div>

                  <div class="grid gap-3 p-4 md:grid-cols-2">
                    <label
                      *ngFor="let permission of group.permissions"
                      class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all"
                      [ngClass]="hasPermission(permission.code) ? 'border-primary/40 bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/20'"
                    >
                      <input
                        type="checkbox"
                        class="mt-1"
                        [checked]="hasPermission(permission.code)"
                        (change)="togglePermission(permission.code)"
                      />
                      <div>
                        <div class="text-sm font-semibold text-white">{{ permission.name }}</div>
                        <div class="text-[11px] text-slate-400">{{ permission.description || permission.code }}</div>
                        <div class="mt-1 font-mono text-[10px] text-slate-500">{{ permission.code }}</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="flex justify-end gap-3 border-t border-white/10 bg-[#0f172a] px-6 py-4">
            <button
              (click)="closeRoleModal()"
              class="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
            >
              Cancelar
            </button>
            <button
              (click)="saveRole()"
              class="rounded-xl border border-primary/40 bg-primary/80 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary"
            >
              Guardar Rol
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminRolesComponent {
  state = inject(StateService);
  adminService = inject(AdminService);

  searchTerm = '';
  permissionSearch = '';
  showRoleModal = false;
  tempRole: EditableRole = this.createEmptyRole();

  get filteredRoles() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.adminService.roles();

    return this.adminService.roles().filter((role) => {
      const permissionText = role.permissions.map((permission) => `${permission.name} ${permission.code}`).join(' ').toLowerCase();
      return `${role.name} ${role.description} ${role.code}`.toLowerCase().includes(term) || permissionText.includes(term);
    });
  }

  get filteredPermissionGroups() {
    const filteredPermissions = this.adminService.permissions().filter((permission) => {
      const term = this.permissionSearch.trim().toLowerCase();
      if (!term) return true;
      return `${permission.name} ${permission.code} ${permission.description || ''}`.toLowerCase().includes(term);
    });

    const groups = new Map<string, PermissionDefinition[]>();
    for (const permission of filteredPermissions) {
      const key = permission.code.split('.')[0] || 'general';
      const collection = groups.get(key) || [];
      collection.push(permission);
      groups.set(key, collection);
    }

    return [...groups.entries()].map(([key, permissions]) => ({
      key,
      label: this.getGroupLabel(key),
      permissions: [...permissions].sort((left, right) => left.name.localeCompare(right.name)),
    }));
  }

  openRoleModal(role: RoleDefinition | null = null) {
    this.permissionSearch = '';
    this.tempRole = role
      ? {
          ...JSON.parse(JSON.stringify(role)),
          permissionCodes: [...role.permissionCodes],
        }
      : this.createEmptyRole();
    this.showRoleModal = true;
  }

  closeRoleModal() {
    this.showRoleModal = false;
    this.tempRole = this.createEmptyRole();
    this.permissionSearch = '';
  }

  async saveRole() {
    if (!String(this.tempRole.name || '').trim()) {
      alert('Ingresa un nombre para el rol.');
      return;
    }

    try {
      if (this.tempRole.id) {
        await this.adminService.updateRole(this.toRoleDefinition(this.tempRole));
      } else {
        await this.adminService.createRole(this.tempRole);
      }
      this.closeRoleModal();
    } catch (error: any) {
      alert(error?.message || 'No se pudo guardar el rol.');
    }
  }

  async deleteRole(role: RoleDefinition) {
    if (!confirm(`¿Eliminar el rol ${role.name}?`)) return;

    try {
      await this.adminService.deleteRole(role.id);
    } catch (error: any) {
      alert(error?.message || 'No se pudo eliminar el rol.');
    }
  }

  hasPermission(permissionCode: string): boolean {
    return this.tempRole.permissionCodes.includes(permissionCode);
  }

  togglePermission(permissionCode: string) {
    if (this.hasPermission(permissionCode)) {
      this.tempRole.permissionCodes = this.tempRole.permissionCodes.filter((code) => code !== permissionCode);
      return;
    }
    this.tempRole.permissionCodes = [...this.tempRole.permissionCodes, permissionCode].sort();
  }

  areAllSelected(permissions: PermissionDefinition[]) {
    return permissions.every((permission) => this.hasPermission(permission.code));
  }

  toggleGroup(permissions: PermissionDefinition[]) {
    if (this.areAllSelected(permissions)) {
      const codes = new Set(permissions.map((permission) => permission.code));
      this.tempRole.permissionCodes = this.tempRole.permissionCodes.filter((code) => !codes.has(code));
      return;
    }

    const merged = new Set(this.tempRole.permissionCodes);
    permissions.forEach((permission) => merged.add(permission.code));
    this.tempRole.permissionCodes = [...merged].sort();
  }

  private createEmptyRole(): EditableRole {
    return {
      name: '',
      description: '',
      permissionCodes: [],
      permissions: [],
      active: true,
      isSystem: false,
    };
  }

  private toRoleDefinition(role: EditableRole): RoleDefinition {
    const permissions = this.state.permissions().filter((permission) => role.permissionCodes.includes(permission.code));
    return {
      id: role.id || '',
      code: role.code || '',
      name: role.name || '',
      legacyName: role.legacyName,
      description: role.description || role.name || '',
      permissions,
      permissionCodes: [...role.permissionCodes],
      active: role.active !== false,
      assignedUserCount: role.assignedUserCount,
      isSystem: role.isSystem,
    };
  }

  private getGroupLabel(group: string) {
    const labels: Record<string, string> = {
      admin: 'Administración',
      analytics: 'Analítica',
      audit: 'Auditoría',
      dashboard: 'Dashboard',
      exports: 'Exportaciones',
      imports: 'Importaciones',
      inventory: 'Inventario',
      operator: 'Operación',
      planning: 'Programación',
      quality: 'Calidad',
      reports: 'Reportes',
      staging: 'Staging',
      sync: 'Sincronización',
      workorders: 'Órdenes de trabajo',
    };

    return labels[group] || group;
  }
}
