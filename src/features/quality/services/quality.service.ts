import { Injectable, effect, inject, untracked } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StateService } from '../../../services/state.service';
import { AuditService } from '../../../services/audit.service';
import { Incident, CapaAction } from '../models/quality.models';
import { BackendApiService } from '../../../services/backend-api.service';
import { NotificationService } from '../../../services/notification.service';

export type DataLoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'stale';

export interface QualityLoadStatus {
  state: DataLoadState;
  lastSuccessfulSync: string | null;
  errorMessage: string | null;
}

@Injectable({ providedIn: 'root' })
export class QualityService {
  private state = inject(StateService);
  private audit = inject(AuditService);
  private backend = inject(BackendApiService);
  private notifications = inject(NotificationService);
  
  private _incidents = new BehaviorSubject<Incident[]>([]);
  private _loadStatus = new BehaviorSubject<QualityLoadStatus>({
    state: 'idle',
    lastSuccessfulSync: null,
    errorMessage: null,
  });

  get incidents() { return this._incidents.value; }
  get activeIncidents() { return this.incidents.filter(i => i.status !== 'Cerrada'); }
  get closedIncidents() { return this.incidents.filter(i => i.status === 'Cerrada'); }
  get loadStatus() { return this._loadStatus.value; }
  get incidents$() { return this._incidents.asObservable(); }
  get loadStatus$() { return this._loadStatus.asObservable(); }
  
  constructor() {
    effect(() => {
      if (!this.state.currentUser()) {
        this._incidents.next([]);
        return;
      }

      untracked(() => {
        void this.reload();
      });
    });
  }

  async reload() {
    this._loadStatus.next({
      state: 'loading',
      lastSuccessfulSync: this.loadStatus.lastSuccessfulSync,
      errorMessage: null,
    });
    try {
      const response = await this.backend.getIncidents({ page: 1, pageSize: 100 });
      const items = response.items || [];
      this._incidents.next(items.map((item: any) => this.mapIncident(item)));
      this._loadStatus.next({
        state: 'loaded',
        lastSuccessfulSync: new Date().toISOString(),
        errorMessage: null,
      });
    } catch (error: any) {
      const stale = this.loadStatus.lastSuccessfulSync !== null;
      const message = error?.message || 'No fue posible cargar las incidencias.';
      this._loadStatus.next({
        state: stale ? 'stale' : 'error',
        lastSuccessfulSync: this.loadStatus.lastSuccessfulSync,
        errorMessage: message,
      });
      this.notifications.showWarning(
        stale ? `${message} Se mantienen los últimos datos cargados.` : message,
      );
    }
  }

  async addIncident(incident: Partial<Incident>) {
    const machine = this.state.adminMachines().find(item => item.name === incident.machineRef);
    const workOrder = incident.otRef ? await this.tryFindWorkOrderByOt(incident.otRef) : null;

    const created = await this.backend.createIncident({
      code: incident.code || undefined,
      title: incident.title || 'Sin Titulo',
      description: incident.description || '',
      priority: this.mapPriorityToApi(incident.priority || 'Media'),
      type: this.mapTypeToApi(incident.type || 'Otro'),
      work_order_id: workOrder?.id,
      machine_id: machine?.id,
      reported_at: new Date().toISOString(),
    });

    const newIncident = this.mapIncident({
      ...created,
      reportedBy: { name: this.state.userName() },
      assignedTo: null,
    });

    this._incidents.next([newIncident, ...this.incidents]);
    this.audit.log(this.state.userName(), this.state.userRole(), 'CALIDAD', 'Reportar Incidencia', `Nueva incidencia ${newIncident.code}: ${newIncident.title}`);
  }

  async updateIncident(updated: Incident) {
    const saved = await this.backend.updateIncidentRootCause(updated.id, {
      root_cause: updated.rootCause || '',
    });
    const mapped = this.mapIncident(saved);
    this._incidents.next(this.incidents.map(i => i.id === updated.id ? mapped : i));
    this.audit.log(this.state.userName(), this.state.userRole(), 'CALIDAD', 'Actualizar Incidencia', `Actualizacion de ${updated.code}`);
  }

  async updateIncidentRootCause(incidentId: string, rootCause: string) {
    const saved = await this.backend.updateIncidentRootCause(incidentId, {
      root_cause: rootCause,
    });
    const mapped = this.mapIncident(saved);
    this._incidents.next(this.incidents.map(i => i.id === incidentId ? mapped : i));
    return mapped;
  }

  async addCapaAction(incidentId: string, action: Partial<CapaAction>) {
    const responsible = this.state.adminUsers().find(user => user.name === action.responsible) || this.state.adminUsers()[0];
    if (!responsible) return;

    const created = await this.backend.addCapaAction(incidentId, {
      description: action.description || '',
      action_type: action.type === 'Preventiva' ? 'PREVENTIVE' : 'CORRECTIVE',
      responsible_user_id: responsible.id,
      deadline: action.deadline || new Date().toISOString().split('T')[0],
    });

    this._incidents.next(this.incidents.map(i => {
      if (i.id !== incidentId) return i;
      const newAction: CapaAction = {
        id: created.id,
        description: created.description,
        type: action.type || 'Correctiva',
        responsible: responsible.name,
        deadline: action.deadline || new Date().toISOString().split('T')[0],
        completed: false,
      };
      return {
        ...i,
        status: i.status === 'Abierta' ? 'Accion Correctiva' as any : i.status,
        actions: [...i.actions, newAction],
      };
    }));
    this.audit.log(this.state.userName(), this.state.userRole(), 'CALIDAD', 'Agregar Accion CAPA', `Accion ${action.type || 'Correctiva'} agregada a la incidencia.`);
  }

  async toggleActionCompletion(incidentId: string, actionId: string) {
    await this.backend.completeCapaAction(actionId);
    this._incidents.next(this.incidents.map(i => i.id === incidentId ? {
      ...i,
      actions: i.actions.map(a => a.id === actionId ? { ...a, completed: true } : a),
    } : i));
    this.audit.log(this.state.userName(), this.state.userRole(), 'CALIDAD', 'Completar Accion', `Estado de accion modificado en incidencia ${incidentId}`);
  }

  async closeIncident(incidentId: string, rootCause?: string) {
    const saved = await this.backend.updateIncidentStatus(incidentId, {
      status: 'CLOSED',
      root_cause: rootCause || '',
    });
    const incident = this.incidents.find(i => i.id === incidentId);
    const mapped = this.mapIncident(saved);
    this._incidents.next(this.incidents.map(i => i.id === incidentId ? mapped : i));
    this.audit.log(this.state.userName(), this.state.userRole(), 'CALIDAD', 'Cerrar Incidencia', `Incidencia ${incident?.code} marcada como resuelta.`);
  }

  private mapIncident(item: any): Incident {
    return {
      id: item.id,
      code: item.code,
      title: item.title,
      description: item.description || '',
      priority: this.mapPriorityFromApi(item.priority),
      type: this.mapTypeFromApi(item.type),
      status: this.mapStatusFromApi(item.status),
      otRef: item.ot_number_snapshot || item.work_order?.ot_number,
      machineRef: item.machine_code_snapshot || item.machine?.name,
      reportedBy: item.reportedBy?.name || item.reported_by_user_id || 'Sistema',
      reportedAt: new Date(item.reported_at),
      assignedTo: item.assignedTo?.name || 'Sin Asignar',
      rootCause: item.root_cause,
      actions: (item.capaActions || []).map((action: any) => ({
        id: action.id,
        description: action.description,
        type: action.action_type === 'PREVENTIVE' ? 'Preventiva' : 'Correctiva',
        responsible: action.responsible?.name || '',
        deadline: action.deadline ? new Date(action.deadline).toISOString().split('T')[0] : '',
        completed: action.completed === true,
      })),
    };
  }

  private mapPriorityToApi(priority: string) {
    if (priority === 'Alta') return 'HIGH';
    if (priority === 'Baja') return 'LOW';
    return 'MEDIUM';
  }

  private mapPriorityFromApi(priority: string): any {
    if (priority === 'HIGH') return 'Alta';
    if (priority === 'LOW') return 'Baja';
    return 'Media';
  }

  private mapTypeToApi(type: string) {
    const normalized = String(type || '').toUpperCase();
    if (normalized.includes('MAQ')) return 'MACHINERY';
    if (normalized.includes('MAT')) return 'MATERIAL';
    if (normalized.includes('SEG')) return 'SAFETY';
    if (normalized.includes('CAL')) return 'QUALITY';
    return 'OTHER';
  }

  private mapTypeFromApi(type: string): any {
    if (type === 'MACHINERY') return 'Maquinaria';
    if (type === 'MATERIAL') return 'Material';
    if (type === 'SAFETY') return 'Seguridad';
    if (type === 'QUALITY') return 'Calidad';
    return 'Otro';
  }

  private mapStatusFromApi(status: string): any {
    if (status === 'ANALYSIS') return 'En Analisis';
    if (status === 'CORRECTIVE_ACTION') return 'Accion Correctiva';
    if (status === 'CLOSED') return 'Cerrada';
    return 'Abierta';
  }

  private async tryFindWorkOrderByOt(otNumber: string) {
    try {
      const response = await this.backend.getWorkOrders({ q: otNumber, page: 1, pageSize: 10 });
      const normalizedTarget = String(otNumber || '').trim();
      return (
        (response.items || []).find((item: any) => {
          const candidates = [
            item?.ot_number,
            item?.OT,
            item?.ot,
          ]
            .map((value) => String(value || '').trim())
            .filter(Boolean);

          return candidates.includes(normalizedTarget);
        }) || null
      );
    } catch {
      return null;
    }
  }
}
