
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { AdminUsersComponent } from './components/admin-users.component';
import { AdminRolesComponent } from './components/admin-roles.component';
import { AdminMachinesComponent } from './components/admin-machines.component';
import { AdminConfigComponent } from './components/admin-config.component';

type AdminTab = 'users' | 'roles' | 'machines' | 'config';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    AdminUsersComponent,
    AdminRolesComponent,
    AdminMachinesComponent,
    AdminConfigComponent
  ],
  template: `
    <div class="bg-gradient-mesh min-h-screen text-slate-200 font-sans p-6 pb-20">
      <div class="max-w-[1600px] mx-auto space-y-8">
        
        <!-- Top Navigation Bar (Glassmorphism) -->
        <header class="sticky top-4 z-40 bg-[#0B0E14]/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-lg transition-all">
          <div class="flex items-center gap-4 mb-4 md:mb-0">
            <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-primary border border-white/10 backdrop-blur-sm shadow-lg shadow-primary/10">
              <span class="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-white leading-tight">Administración</h1>
              <p class="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                Gestión del Sistema Global
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4">
             <div class="relative">
                <span class="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 border border-black animate-pulse"></span>
                <button class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all focus:outline-none">
                   <span class="material-symbols-outlined">notifications</span>
                </button>
             </div>
             <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/80 to-blue-600/80 backdrop-blur-md text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-primary/20 border border-white/10 cursor-pointer hover:brightness-110 transition-all">
                AD
             </div>
          </div>
        </header>

        <!-- Tabs Navigation -->
        <nav class="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md inline-flex shadow-lg overflow-x-auto">
          <button (click)="activeTab = 'users'" 
             class="whitespace-nowrap py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all"
             [ngClass]="activeTab === 'users' ? 'bg-primary/20 text-white font-semibold border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'">
             <span class="material-symbols-outlined text-[20px]">people</span> Usuarios
          </button>
          <button (click)="activeTab = 'roles'" 
             class="whitespace-nowrap py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all"
             [ngClass]="activeTab === 'roles' ? 'bg-primary/20 text-white font-semibold border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'">
             <span class="material-symbols-outlined text-[20px]">verified_user</span> Roles
          </button>
          <button (click)="activeTab = 'machines'" 
             class="whitespace-nowrap py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all"
             [ngClass]="activeTab === 'machines' ? 'bg-primary/20 text-white font-semibold border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'">
             <span class="material-symbols-outlined text-[20px]">precision_manufacturing</span> Máquinas
          </button>
          <button (click)="activeTab = 'config'" 
             class="whitespace-nowrap py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 transition-all"
             [ngClass]="activeTab === 'config' ? 'bg-primary/20 text-white font-semibold border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'">
             <span class="material-symbols-outlined text-[20px]">settings</span> Configuración
          </button>
        </nav>

        <!-- Main Content Area -->
        <div class="animate-fadeIn">
           <app-admin-users *ngIf="activeTab === 'users'"></app-admin-users>
           <app-admin-roles *ngIf="activeTab === 'roles'"></app-admin-roles>
           <app-admin-machines *ngIf="activeTab === 'machines'"></app-admin-machines>
           <app-admin-config *ngIf="activeTab === 'config'"></app-admin-config>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `]
})
export class AdminComponent {
    activeTab: AdminTab = 'users';
}
