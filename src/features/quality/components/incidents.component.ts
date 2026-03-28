
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QualityService } from '../services/quality.service';
import { Incident, IncidentPriority, IncidentType, IncidentStatus, CapaAction } from '../models/quality.models';
import { StateService } from '../../../services/state.service';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-gradient-mesh min-h-screen p-6 pb-20 text-slate-200 font-sans relative">
      
      <!-- MAIN CONTENT CONTAINER -->
      <div class="max-w-7xl mx-auto">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <div class="p-2 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                  <span class="material-icons text-red-500">report_problem</span>
              </div>
              Incidencias y CAPA
            </h1>
            <p class="text-sm text-slate-400 mt-1 ml-14">Gestión de no conformidades y acciones correctivas</p>
          </div>
          <button *ngIf="canCreateIncidents" (click)="openCreateModal()" class="glassmorphism-input bg-red-600/20 hover:bg-red-600/40 text-red-100 border-red-500/50 px-5 py-2.5 rounded-xl shadow-lg shadow-red-900/20 text-sm font-bold flex items-center gap-2 transition-all active:scale-95">
             <span class="material-icons text-sm">add_alert</span> Reportar Falla
          </button>
        </div>

        <!-- Filters -->
        <div class="flex gap-2 mb-6 border-b border-white/10 pb-1 overflow-x-auto">
            <button (click)="activeFilter = 'active'" 
              [class]="activeFilter === 'active' ? 'bg-white/10 text-white border-b-2 border-primary' : 'text-slate-400 hover:text-white hover:bg-white/5 border-b-2 border-transparent'"
              class="px-6 py-3 text-sm font-bold transition-all rounded-t-lg">
              Activas ({{ service.activeIncidents.length }})
            </button>
            <button (click)="activeFilter = 'closed'" 
              [class]="activeFilter === 'closed' ? 'bg-white/10 text-white border-b-2 border-slate-400' : 'text-slate-400 hover:text-white hover:bg-white/5 border-b-2 border-transparent'"
              class="px-6 py-3 text-sm font-bold transition-all rounded-t-lg">
              Cerradas ({{ service.closedIncidents.length }})
            </button>
        </div>

        <!-- Incident Cards List -->
        <div class="space-y-4">
          <ng-container *ngFor="let incident of filteredIncidents; trackBy: trackById">
            <div (click)="openDetailModal(incident)" class="glassmorphism-card rounded-2xl p-5 flex flex-col md:flex-row gap-5 items-start justify-between cursor-pointer hover:bg-white/10 transition-all group relative overflow-hidden border border-white/10 hover:border-white/20">
               
               <!-- Priority Glow -->
               <div class="absolute left-0 top-0 bottom-0 w-1"
                  [ngClass]="{
                    'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]': incident.priority === 'Alta',
                    'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]': incident.priority === 'Media',
                    'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]': incident.priority === 'Baja'
                  }"></div>

               <div class="flex gap-4 items-start w-full relative z-10">
                  <!-- Icon Box -->
                  <div class="p-3 rounded-xl h-fit flex-shrink-0 backdrop-blur-md border border-white/5"
                     [ngClass]="{
                        'bg-red-500/10 text-red-400': incident.priority === 'Alta',
                        'bg-yellow-500/10 text-yellow-400': incident.priority === 'Media',
                        'bg-emerald-500/10 text-emerald-400': incident.priority === 'Baja'
                     }">
                      <span class="material-icons">{{ getIconByType(incident.type) }}</span>
                  </div>
                  
                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                      <div class="flex flex-wrap items-center gap-2 mb-2">
                          <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider">{{ incident.code }}</span>
                          <span class="text-[9px] font-bold px-2 py-0.5 rounded text-black uppercase"
                             [ngClass]="{
                                'bg-red-500': incident.priority === 'Alta',
                                'bg-yellow-500': incident.priority === 'Media',
                                'bg-emerald-500': incident.priority === 'Baja'
                             }">{{ incident.priority }}</span>
                          <span class="text-[9px] font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10 uppercase">
                            {{ incident.status }}
                          </span>
                      </div>
                      <h3 class="font-bold text-white text-lg group-hover:text-primary transition-colors truncate">{{ incident.title }}</h3>
                      <p class="text-sm text-slate-400 line-clamp-2 mt-1">{{ incident.description }}</p>
                      
                      <!-- Metadata Footer -->
                      <div class="flex flex-wrap gap-4 mt-4 text-xs text-slate-500 font-medium">
                         <span class="flex items-center gap-1">
                            <span class="material-icons text-[14px]">person</span> {{ incident.assignedTo }}
                         </span>
                         <span *ngIf="incident.otRef" class="flex items-center gap-1 font-bold text-blue-400 bg-blue-500/10 px-1.5 rounded border border-blue-500/20">
                            <span class="material-icons text-[14px]">receipt</span> OT #{{ incident.otRef }}
                         </span>
                         <span *ngIf="incident.machineRef" class="flex items-center gap-1">
                            <span class="material-icons text-[14px]">precision_manufacturing</span> {{ incident.machineRef }}
                         </span>
                         <span class="flex items-center gap-1 ml-auto">
                            <span class="material-icons text-[14px]">schedule</span> {{ incident.reportedAt | date:'short' }}
                         </span>
                      </div>
                  </div>
               </div>

               <!-- Chevron -->
               <div class="hidden md:flex flex-col items-center justify-center pl-4 border-l border-white/5 self-stretch">
                  <span class="material-icons text-slate-600 group-hover:text-white transition-colors">chevron_right</span>
               </div>
            </div>
          </ng-container>
          
          <div *ngIf="filteredIncidents.length === 0" class="glassmorphism-card text-center py-16 rounded-2xl border-dashed border-white/10">
               <span class="material-icons text-5xl text-slate-600 mb-3 block">assignment_turned_in</span>
               <p class="text-slate-400 font-medium">No hay incidencias {{ activeFilter === 'active' ? 'activas' : 'cerradas' }} para mostrar.</p>
          </div>
        </div>
      </div>

      <!-- CREATE MODAL (Dark Glass) -->
      <div *ngIf="showCreateModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
           <div class="glassmorphism-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
              <div class="px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/10 bg-white/5">
                 <h2 class="text-lg font-bold text-white flex items-center gap-2">
                    <span class="material-icons text-red-500">add_circle</span> Nueva Incidencia
                 </h2>
                 <button (click)="showCreateModal = false" class="text-slate-400 hover:text-white transition-colors"><span class="material-icons">close</span></button>
              </div>
              
              <div class="p-6 overflow-y-auto custom-scrollbar space-y-5">
                  <div>
                     <label class="block text-xs font-bold text-slate-400 mb-2 uppercase">Título Corto *</label>
                     <input type="text" [(ngModel)]="newIncidentData.title" class="glassmorphism-input w-full rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-red-500 outline-none">
                  </div>
                  
                  <div class="grid grid-cols-2 gap-4">
                     <div>
                        <label class="block text-xs font-bold text-slate-400 mb-2 uppercase">Tipo *</label>
                        <select [(ngModel)]="newIncidentData.type" class="glassmorphism-input w-full rounded-xl px-3 py-3 text-sm text-white outline-none cursor-pointer">
                           <option class="bg-slate-900" value="Maquinaria">Maquinaria</option>
                           <option class="bg-slate-900" value="Calidad">Calidad</option>
                           <option class="bg-slate-900" value="Seguridad">Seguridad</option>
                           <option class="bg-slate-900" value="Material">Material</option>
                           <option class="bg-slate-900" value="Otro">Otro</option>
                        </select>
                     </div>
                     <div>
                        <label class="block text-xs font-bold text-slate-400 mb-2 uppercase">Prioridad *</label>
                        <select [(ngModel)]="newIncidentData.priority" class="glassmorphism-input w-full rounded-xl px-3 py-3 text-sm text-white outline-none cursor-pointer">
                           <option class="bg-slate-900" value="Alta">Alta (Crítica)</option>
                           <option class="bg-slate-900" value="Media">Media</option>
                           <option class="bg-slate-900" value="Baja">Baja</option>
                        </select>
                     </div>
                  </div>

                  <div>
                     <label class="block text-xs font-bold text-slate-400 mb-2 uppercase">Descripción Detallada *</label>
                     <textarea [(ngModel)]="newIncidentData.description" rows="3" class="glassmorphism-input w-full rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-red-500 outline-none resize-none"></textarea>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                     <div>
                        <label class="block text-xs font-bold text-slate-400 mb-2 uppercase">OT (Opcional)</label>
                        <input type="text" [(ngModel)]="newIncidentData.otRef" placeholder="Ej. 45200" class="glassmorphism-input w-full rounded-xl px-4 py-3 text-sm text-white outline-none font-mono">
                     </div>
                     <div>
                        <label class="block text-xs font-bold text-slate-400 mb-2 uppercase">Asignar a</label>
                         <select [(ngModel)]="newIncidentData.assignedTo" class="glassmorphism-input w-full rounded-xl px-3 py-3 text-sm text-white outline-none cursor-pointer">
                           <option class="bg-slate-900" value="Mantenimiento">Mantenimiento</option>
                           <option class="bg-slate-900" value="Calidad">Calidad</option>
                           <option class="bg-slate-900" value="Producción">Producción</option>
                           <option class="bg-slate-900" value="Almacén">Almacén</option>
                           <option class="bg-slate-900" value="Seguridad">Seguridad</option>
                        </select>
                     </div>
                  </div>
              </div>

              <div class="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3 shrink-0">
                 <button (click)="showCreateModal = false" class="px-5 py-2.5 text-slate-300 font-bold hover:text-white rounded-xl hover:bg-white/10 transition-colors text-sm">Cancelar</button>
                 <button (click)="createIncident()" class="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/30 text-sm transition-all flex items-center gap-2">
                    <span class="material-icons text-sm">send</span> Reportar
                 </button>
              </div>
           </div>
        </div>

      <!-- DETAIL MODAL (Dark Glass) -->
      <div *ngIf="selectedIncident" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
           <div class="glassmorphism-card rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
              
              <div class="px-6 py-4 flex justify-between items-start border-b border-white/10 bg-white/5">
                 <div>
                    <div class="flex items-center gap-3 mb-1">
                       <span class="text-sm font-black text-slate-500 tracking-wider">{{ selectedIncident.code }}</span>
                       <span class="px-2 py-0.5 rounded text-[10px] font-bold text-black uppercase"
                           [ngClass]="{
                              'bg-red-500': selectedIncident.priority === 'Alta',
                              'bg-yellow-500': selectedIncident.priority === 'Media',
                              'bg-emerald-500': selectedIncident.priority === 'Baja'
                           }">{{ selectedIncident.priority }}</span>
                    </div>
                    <h2 class="text-xl font-bold text-white">{{ selectedIncident.title }}</h2>
                 </div>
                 <button (click)="closeDetailModal()" class="text-slate-400 hover:text-white transition-colors"><span class="material-icons">close</span></button>
              </div>

              <div class="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row">
                 
                 <!-- Left: Info -->
                 <div class="w-full md:w-1/3 border-r border-white/10 bg-white/5 p-6 space-y-6">
                    <div>
                       <h3 class="text-xs font-bold text-slate-500 uppercase mb-2">Descripción</h3>
                       <p class="text-sm text-slate-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">{{ selectedIncident.description }}</p>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                       <div>
                          <h3 class="text-xs font-bold text-slate-500 uppercase mb-1">Reportado Por</h3>
                          <p class="text-sm font-bold text-slate-200">{{ selectedIncident.reportedBy }}</p>
                       </div>
                       <div>
                          <h3 class="text-xs font-bold text-slate-500 uppercase mb-1">Fecha</h3>
                          <p class="text-sm font-bold text-slate-200">{{ selectedIncident.reportedAt | date:'dd/MM/yy HH:mm' }}</p>
                       </div>
                       <div>
                          <h3 class="text-xs font-bold text-slate-500 uppercase mb-1">Área</h3>
                          <p class="text-sm font-bold text-slate-200">{{ selectedIncident.assignedTo }}</p>
                       </div>
                       <div>
                          <h3 class="text-xs font-bold text-slate-500 uppercase mb-1">Estado</h3>
                          <p class="text-sm font-bold" [ngClass]="selectedIncident.status === 'Cerrada' ? 'text-emerald-400' : 'text-blue-400'">{{ selectedIncident.status }}</p>
                       </div>
                    </div>

                    <div class="pt-4 border-t border-white/10">
                         <h3 class="text-xs font-bold text-slate-500 uppercase mb-2">Análisis de Causa Raíz</h3>
                         <ng-container *ngIf="canManageIncidents && selectedIncident.status !== 'Cerrada'; else rootCauseReadOnly">
                           <textarea 
                             [ngModel]="selectedIncident.rootCause" 
                             (ngModelChange)="selectedIncident.rootCause = $event"
                             (blur)="persistRootCause()"
                             placeholder="Describa la causa raíz..."
                             class="glassmorphism-input w-full text-sm rounded-xl p-3 outline-none min-h-[80px] bg-black/20"></textarea>
                         </ng-container>
                         <ng-template #rootCauseReadOnly>
                           <div class="text-sm text-slate-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5 min-h-[80px]">
                             {{ selectedIncident.rootCause || 'Sin análisis de causa raíz registrado.' }}
                           </div>
                         </ng-template>
                    </div>
                 </div>

                 <!-- Right: CAPA -->
                 <div class="w-full md:w-2/3 p-6 bg-transparent">
                    <div class="flex justify-between items-center mb-4">
                       <h3 class="font-bold text-slate-200 flex items-center gap-2">
                          <span class="material-icons text-primary">build_circle</span> Acciones (CAPA)
                       </h3>
                       <span *ngIf="!canManageIncidents" class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Solo lectura</span>
                       <button *ngIf="selectedIncident.status !== 'Cerrada' && canManageIncidents" (click)="toggleAddAction()" class="text-xs font-bold text-primary hover:text-white transition-colors flex items-center gap-1">
                            <span class="material-icons text-sm">add</span> Agregar Acción
                       </button>
                    </div>

                    <!-- Add Action Form -->
                    <div *ngIf="showAddAction" class="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 mb-4 animate-fadeIn">
                          <h4 class="text-xs font-bold text-blue-300 uppercase mb-3">Nueva Acción</h4>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                             <div>
                                <label class="block text-[10px] font-bold text-slate-400 mb-1">Tipo</label>
                                <select [(ngModel)]="newActionData.type" class="w-full text-sm bg-black/30 border border-white/10 text-white rounded-lg p-2 outline-none">
                                   <option class="bg-slate-900" value="Correctiva">Correctiva (Inmediata)</option>
                                   <option class="bg-slate-900" value="Preventiva">Preventiva (Largo Plazo)</option>
                                </select>
                             </div>
                             <div>
                                <label class="block text-[10px] font-bold text-slate-400 mb-1">Responsable</label>
                                <input type="text" [(ngModel)]="newActionData.responsible" class="w-full text-sm bg-black/30 border border-white/10 text-white rounded-lg p-2 outline-none">
                             </div>
                             <div class="md:col-span-2">
                                <label class="block text-[10px] font-bold text-slate-400 mb-1">Descripción</label>
                                <input type="text" [(ngModel)]="newActionData.description" class="w-full text-sm bg-black/30 border border-white/10 text-white rounded-lg p-2 outline-none">
                             </div>
                             <div>
                                <label class="block text-[10px] font-bold text-slate-400 mb-1">Fecha Límite</label>
                                <input type="date" [(ngModel)]="newActionData.deadline" class="w-full text-sm bg-black/30 border border-white/10 text-white rounded-lg p-2 outline-none">
                             </div>
                          </div>
                          <div class="flex justify-end gap-2">
                             <button (click)="showAddAction = false" class="text-xs font-bold text-slate-400 hover:text-white px-3 py-1">Cancelar</button>
                             <button (click)="saveAction(selectedIncident.id)" class="text-xs font-bold bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-500">Guardar</button>
                          </div>
                    </div>

                    <!-- Actions List -->
                    <div class="space-y-3">
                       <ng-container *ngFor="let action of selectedIncident.actions; trackBy: trackById">
                          <div class="border rounded-xl p-3 flex gap-3 items-start group transition-colors" 
                             [ngClass]="action.completed ? 'bg-white/5 border-white/5 opacity-60' : 'bg-white/5 border-white/10 hover:bg-white/10'">
                             
                             <button (click)="toggleAction(selectedIncident.id, action.id)" [disabled]="selectedIncident.status === 'Cerrada' || !canManageIncidents || action.completed"
                                class="mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors"
                                [ngClass]="action.completed ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-transparent border-slate-500 hover:border-emerald-400 text-transparent hover:text-emerald-400'">
                                <span class="material-icons text-sm font-bold">check</span>
                             </button>

                             <div class="flex-1">
                                <div class="flex justify-between items-start">
                                   <p class="text-sm font-bold text-slate-200" [class.line-through]="action.completed">
                                      {{ action.description }}
                                   </p>
                                   <span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
                                      [ngClass]="action.type === 'Correctiva' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'">
                                      {{ action.type }}
                                   </span>
                                </div>
                                <div class="flex gap-4 mt-2 text-xs text-slate-500">
                                   <span><strong class="text-slate-400">Resp:</strong> {{ action.responsible }}</span>
                                   <span [class.text-red-400]="isOverdue(action.deadline) && !action.completed"><strong class="text-slate-400">Límite:</strong> {{ action.deadline | date:'dd/MM/yy' }}</span>
                                </div>
                             </div>
                          </div>
                       </ng-container>
                       
                       <div *ngIf="selectedIncident.actions.length === 0" class="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                             <p class="text-sm text-slate-500 italic">No hay acciones registradas.</p>
                       </div>
                    </div>

                 </div>
              </div>

              <!-- Modal Footer -->
              <div class="bg-white/5 p-4 border-t border-white/10 flex justify-end gap-3 shrink-0">
                  <ng-container *ngIf="selectedIncident.status !== 'Cerrada'">
                     <button (click)="closeDetailModal()" class="px-4 py-2 text-slate-300 font-bold text-sm hover:text-white">Cerrar Ventana</button>
                     <button *ngIf="canManageIncidents" (click)="resolveIncident(selectedIncident.id)" class="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow hover:bg-emerald-500 text-sm flex items-center gap-2 transition-all">
                        <span class="material-icons text-sm">check_circle</span> Marcar Resuelto
                     </button>
                  </ng-container>
                  <ng-container *ngIf="selectedIncident.status === 'Cerrada'">
                     <span class="text-sm font-bold text-emerald-400 flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 mr-auto">
                        <span class="material-icons text-sm">lock</span> Incidencia Cerrada
                     </span>
                     <button (click)="closeDetailModal()" class="px-6 py-2 bg-white/10 text-white font-bold rounded-xl text-sm hover:bg-white/20">Salir</button>
                  </ng-container>
              </div>

           </div>
         </div>

    </div>
  `
})
export class IncidentsComponent {
  service = inject(QualityService);
  state = inject(StateService);

  activeFilter: 'active' | 'closed' = 'active';
  
  get filteredIncidents() {
    return this.activeFilter === 'active' ? this.service.activeIncidents : this.service.closedIncidents;
  }

  get canManageIncidents() {
    return this.state.hasPermission('quality.incidents.manage');
  }

  get canCreateIncidents() {
    return this.state.hasPermission('quality.incidents.create');
  }

  // Modal States
  showCreateModal = false;
  selectedIncident: Incident | null = null;

  // New Incident Form
  newIncidentData: Partial<Incident> = {
     priority: 'Media',
     type: 'Maquinaria',
     assignedTo: 'Mantenimiento'
  };

  // Add Action Form State
  showAddAction = false;
  newActionData: Partial<CapaAction> = {
     type: 'Correctiva',
     responsible: '',
     deadline: ''
  };

  openCreateModal() {
     if (!this.canCreateIncidents) return;
     this.newIncidentData = { 
        priority: 'Media', 
        type: 'Maquinaria', 
        assignedTo: 'Mantenimiento',
        reportedBy: this.state.userName()
     };
     this.showCreateModal = true;
  }

  async createIncident() {
     if (!this.canCreateIncidents) return;
     if (!this.newIncidentData.title || !this.newIncidentData.description) {
        alert('Complete el título y la descripción.');
        return;
     }
     await this.service.addIncident(this.newIncidentData);
     this.showCreateModal = false;
  }

  openDetailModal(incident: Incident) {
     this.selectedIncident = JSON.parse(JSON.stringify(incident));
  }

  closeDetailModal() {
     this.selectedIncident = null;
     this.showAddAction = false;
  }

  // Action Logic
  toggleAddAction() {
     if (!this.canManageIncidents) return;
     this.showAddAction = !this.showAddAction;
     this.newActionData = { type: 'Correctiva', responsible: '', deadline: new Date().toISOString().split('T')[0] };
  }

  async saveAction(incidentId: string) {
     if (!this.newActionData.description) return;
     await this.service.addCapaAction(incidentId, this.newActionData);
     this.refreshSelectedIncident(incidentId);
     this.showAddAction = false;
  }

  async toggleAction(incidentId: string, actionId: string) {
     await this.service.toggleActionCompletion(incidentId, actionId);
     this.refreshSelectedIncident(incidentId);
  }

  async persistRootCause() {
     if (!this.selectedIncident || !this.canManageIncidents) return;
     const updated = await this.service.updateIncidentRootCause(this.selectedIncident.id, this.selectedIncident.rootCause || '');
     this.selectedIncident = JSON.parse(JSON.stringify(updated));
  }

  async resolveIncident(incidentId: string) {
     const incident = this.selectedIncident || this.service.incidents.find(i => i.id === incidentId) || null;
     const pendingActions = incident?.actions.some(a => !a.completed);

     if (pendingActions) {
        if (!confirm('Hay acciones pendientes. ¿Desea cerrar la incidencia de todos modos?')) return;
     }

     if (!incident?.rootCause) {
        alert('Debe ingresar un Análisis de Causa Raíz antes de cerrar.');
        return;
     }

     await this.service.closeIncident(incidentId, incident.rootCause);
     this.closeDetailModal();
  }

  private refreshSelectedIncident(incidentId: string) {
     if (!this.selectedIncident) return;
     const updated = this.service.incidents.find(i => i.id === incidentId);
     if (updated) {
        this.selectedIncident = JSON.parse(JSON.stringify(updated));
     }
  }

  // Helpers
  getIconByType(type: IncidentType): string {
     switch(type) {
        case 'Maquinaria': return 'settings';
        case 'Calidad': return 'search';
        case 'Seguridad': return 'health_and_safety';
        case 'Material': return 'inventory_2';
        default: return 'info';
     }
  }

  isOverdue(dateStr: string): boolean {
     return new Date(dateStr) < new Date();
  }

  trackById(index: number, item: any) {
    return item.id;
  }
}
