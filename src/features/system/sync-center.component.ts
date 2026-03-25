
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { BackendApiService } from '../../services/backend-api.service';

interface SyncMutationItem {
  mutation_id: string;
  entity: string;
  entity_id: string;
  action: string;
  client_id: string;
  processed_at: string;
}

interface SyncIssueItem extends SyncMutationItem {
  status: string;
  message: string;
}

interface SyncStatusResponse {
  connected: boolean;
  last_server_change_at: string | null;
  last_sync_activity_at: string | null;
  counts: {
    pending: number;
    conflicts: number;
    errors: number;
  };
  pending_mutations: SyncMutationItem[];
  issues: SyncIssueItem[];
}

@Component({
  selector: 'app-sync-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      <h1 class="text-2xl font-bold text-brand-dark mb-6 flex items-center gap-3">
        <span class="material-icons text-3xl text-gray-400">sync</span>
        Centro de Sincronización
      </h1>

      <!-- Status Card -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8 text-center">
         <div class="inline-flex p-6 rounded-full mb-4" [ngClass]="statusTone === 'ok' ? 'bg-green-50' : (statusTone === 'warning' ? 'bg-amber-50' : 'bg-red-50')">
            <span class="material-icons text-6xl" [ngClass]="statusTone === 'ok' ? 'text-brand-success' : (statusTone === 'warning' ? 'text-amber-500' : 'text-brand-critical')">{{ statusIcon }}</span>
         </div>
         <h2 class="text-xl font-bold text-gray-800">{{ statusTitle }}</h2>
         <p class="text-gray-500 mt-2">{{ statusDescription }}</p>
         <p class="text-xs text-gray-400 mt-1">
           {{ isLoading ? 'Cargando estado real de sincronización...' : ('Última actividad registrada: ' + formatTimestamp(status?.last_sync_activity_at || status?.last_server_change_at)) }}
         </p>

         <button (click)="forceSync()" [disabled]="isSyncing || isLoading" class="mt-6 px-6 py-2 border border-brand-action text-brand-action rounded hover:bg-blue-50 font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
           {{ isSyncing ? 'Sincronizando...' : 'Forzar Sincronización Manual' }}
         </button>
         <p *ngIf="lastManualSyncMessage" class="mt-3 text-xs font-medium text-slate-500">{{ lastManualSyncMessage }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Local Pending -->
        <div>
          <h3 class="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-brand-warning"></span>
            Cola de Envío ({{ pendingCount }})
          </h3>
          <div class="bg-white rounded border border-gray-200 overflow-hidden">
             <div *ngIf="status?.pending_mutations?.length; else emptyPending">
               <div *ngFor="let item of status?.pending_mutations" class="px-4 py-3 border-b border-gray-100 last:border-b-0">
                 <div class="flex items-start justify-between gap-3">
                   <div>
                     <p class="text-sm font-semibold text-gray-800">{{ formatEntity(item.entity) }} · {{ item.action }}</p>
                     <p class="text-xs text-gray-500">ID {{ item.entity_id }} · Cliente {{ item.client_id }}</p>
                   </div>
                   <span class="text-[11px] font-mono text-gray-400">{{ formatTimestamp(item.processed_at) }}</span>
                 </div>
               </div>
             </div>
             <ng-template #emptyPending>
             <div class="p-8 text-center text-gray-400">
               <span class="material-icons text-4xl mb-2">inbox</span>
               <p class="text-sm">{{ isLoading ? 'Consultando cola real...' : 'No hay mutaciones pendientes en el backend.' }}</p>
             </div>
             </ng-template>
          </div>
        </div>

        <!-- History/Conflicts -->
        <div>
          <h3 class="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-brand-critical"></span>
            Conflictos y Errores ({{ totalIssues }})
          </h3>
          <div class="bg-white rounded border border-gray-200 overflow-hidden">
             <div *ngIf="status?.issues?.length; else emptyIssues">
               <div *ngFor="let issue of status?.issues" class="px-4 py-3 border-b border-gray-100 last:border-b-0">
                 <div class="flex items-start justify-between gap-3">
                   <div>
                     <p class="text-sm font-semibold" [ngClass]="issue.status === 'CONFLICT' ? 'text-amber-700' : 'text-red-700'">
                       {{ issue.status === 'CONFLICT' ? 'Conflicto' : 'Error' }} · {{ formatEntity(issue.entity) }}
                     </p>
                     <p class="text-xs text-gray-500">ID {{ issue.entity_id }} · {{ issue.message || 'Sin detalle adicional.' }}</p>
                   </div>
                   <span class="text-[11px] font-mono text-gray-400">{{ formatTimestamp(issue.processed_at) }}</span>
                 </div>
               </div>
             </div>
             <ng-template #emptyIssues>
               <div class="p-8 text-center text-gray-400">
                 <span class="material-icons text-4xl mb-2">check_circle</span>
                 <p class="text-sm">{{ isLoading ? 'Consultando incidencias reales...' : 'No se han detectado conflictos recientes.' }}</p>
               </div>
             </ng-template>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SyncCenterComponent implements OnInit {
  state = inject(StateService);
  backend = inject(BackendApiService);
  isLoading = true;
  isSyncing = false;
  lastManualSyncMessage = '';
  status: SyncStatusResponse | null = null;

  async ngOnInit() {
    await this.loadStatus();
  }

  get pendingCount() {
    return Number(this.status?.counts?.pending || 0);
  }

  get totalIssues() {
    return Number(this.status?.counts?.conflicts || 0) + Number(this.status?.counts?.errors || 0);
  }

  get statusTone(): 'ok' | 'warning' | 'error' {
    if (!this.status?.connected) return 'error';
    if (this.totalIssues > 0) return 'error';
    if (this.isSyncing || this.pendingCount > 0) return 'warning';
    return 'ok';
  }

  get statusIcon() {
    if (!this.status?.connected) return 'cloud_off';
    if (this.totalIssues > 0) return 'warning';
    if (this.isSyncing || this.pendingCount > 0) return 'sync';
    return 'wifi';
  }

  get statusTitle() {
    if (!this.status?.connected) return 'Sin conexión con el estado de sincronización';
    if (this.totalIssues > 0) return 'Sincronización con observaciones';
    if (this.isSyncing) return 'Sincronizando manualmente con el backend';
    if (this.pendingCount > 0) return 'Hay mutaciones pendientes por procesar';
    return 'Sincronización estable';
  }

  get statusDescription() {
    if (!this.status?.connected) return 'No fue posible consultar el estado real del backend.';
    if (this.totalIssues > 0) return 'Se encontraron conflictos o rechazos recientes en la bitácora de sincronización.';
    if (this.pendingCount > 0) return 'Existen mutaciones registradas en espera de procesamiento.';
    return 'El estado mostrado se construye con logs reales de cambios y mutaciones.';
  }

  async forceSync() {
    try {
      this.isSyncing = true;
      this.lastManualSyncMessage = '';
      this.state.setSyncStatus('syncing');
      const response = await this.backend.syncPull({
        last_changed_at: new Date(0).toISOString(),
        last_id: '0',
        batch_size: 100,
        device_profile: 'FRONTEND_APP',
      });
      const pulledItems = Array.isArray(response?.items) ? response.items.length : 0;
      this.lastManualSyncMessage = pulledItems > 0
        ? `Se descargaron ${pulledItems} cambios del backend${response?.has_more ? ' y existen más registros pendientes.' : '.'}`
        : 'No se detectaron cambios nuevos para descargar.';
      await this.loadStatus();
    } catch {
      this.state.setSyncStatus('conflict');
      this.lastManualSyncMessage = 'La sincronización manual no se pudo completar.';
    } finally {
      this.isSyncing = false;
    }
  }

  private async loadStatus() {
    this.isLoading = true;

    try {
      const response = await this.backend.getSyncStatus();
      this.status = response;
      this.state.setPendingSyncCount(Number(response?.counts?.pending || 0));

      if (Number(response?.counts?.conflicts || 0) > 0 || Number(response?.counts?.errors || 0) > 0) {
        this.state.setSyncStatus('conflict');
      } else if (Number(response?.counts?.pending || 0) > 0) {
        this.state.setSyncStatus('syncing');
      } else {
        this.state.setSyncStatus('online');
      }
    } catch {
      this.status = null;
      this.state.setPendingSyncCount(0);
      this.state.setSyncStatus('offline');
    } finally {
      this.isLoading = false;
    }
  }

  formatTimestamp(value: string | null | undefined) {
    if (!value) return 'Sin registro';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Sin registro';

    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  }

  formatEntity(value: string) {
    return String(value || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
