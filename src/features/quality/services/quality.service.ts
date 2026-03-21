import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StateService } from '../../../services/state.service';
import { AuditService } from '../../../services/audit.service';
import { Incident, IncidentPriority, IncidentType, IncidentStatus, CapaAction } from '../models/quality.models';

@Injectable({ providedIn: 'root' })
export class QualityService {
  private state = inject(StateService);
  private audit = inject(AuditService);
  
  private initialData: Incident[] = [
    {
      id: '1',
      code: 'INC-2024-089',
      title: 'Parada no programada en Flexo 03',
      description: 'Rotura de engranaje principal durante corrida a alta velocidad.',
      priority: 'Alta',
      type: 'Maquinaria',
      status: 'Acción Correctiva',
      otRef: '45100',
      machineRef: 'Flexo 03',
      reportedBy: 'Juan Perez',
      reportedAt: new Date(new Date().getTime() - 7200000), 
      assignedTo: 'Mantenimiento',
      rootCause: 'Fatiga de material por falta de lubricación en el turno anterior.',
      actions: [
        { id: 'a1', description: 'Reemplazo de engranaje', type: 'Correctiva', responsible: 'J. Mantenimiento', deadline: '2024-10-26', completed: true },
        { id: 'a2', description: 'Revisar plan de lubricación diario', type: 'Preventiva', responsible: 'Gerente Planta', deadline: '2024-10-30', completed: false }
      ]
    },
    {
      id: '2',
      code: 'INC-2024-090',
      title: 'Diferencia de inventario Tinta Magenta',
      description: 'Faltante de 2kg vs sistema al realizar el cambio de turno.',
      priority: 'Media',
      type: 'Material',
      status: 'Abierta',
      reportedBy: 'Pedro Operador',
      reportedAt: new Date(new Date().getTime() - 14400000),
      assignedTo: 'Almacén',
      actions: []
    }
  ];

  private _incidents = new BehaviorSubject<Incident[]>(this.initialData);

  get incidents() { return this._incidents.value; }

  // Getters replacing computed signals
  get activeIncidents() { return this.incidents.filter(i => i.status !== 'Cerrada'); }
  get closedIncidents() { return this.incidents.filter(i => i.status === 'Cerrada'); }
  
  addIncident(incident: Partial<Incident>) {
    const newIncident: Incident = {
      id: Math.random().toString(36).substr(2, 9),
      code: `INC-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      title: incident.title || 'Sin Título',
      description: incident.description || '',
      priority: incident.priority || 'Media',
      type: incident.type || 'Otro',
      status: 'Abierta',
      otRef: incident.otRef,
      machineRef: incident.machineRef,
      reportedBy: incident.reportedBy || 'Usuario Actual',
      reportedAt: new Date(),
      assignedTo: incident.assignedTo || 'Sin Asignar',
      actions: []
    };

    this._incidents.next([newIncident, ...this.incidents]);
    this.audit.log(this.state.userName(), this.state.userRole(), 'CALIDAD', 'Reportar Incidencia', `Nueva incidencia ${newIncident.code}: ${newIncident.title}`);
  }

  updateIncident(updated: Incident) {
    this._incidents.next(this.incidents.map(i => i.id === updated.id ? updated : i));
    // Optional: Log every update or just major ones. Here logging generic update.
    this.audit.log(this.state.userName(), this.state.userRole(), 'CALIDAD', 'Actualizar Incidencia', `Actualización de ${updated.code}`);
  }

  addCapaAction(incidentId: string, action: Partial<CapaAction>) {
    this._incidents.next(this.incidents.map(i => {
      if (i.id === incidentId) {
        const newAction: CapaAction = {
          id: Math.random().toString(36).substr(2, 9),
          description: action.description || '',
          type: action.type || 'Correctiva',
          responsible: action.responsible || '',
          deadline: action.deadline || new Date().toISOString().split('T')[0],
          completed: false
        };
        const newStatus = i.status === 'Abierta' ? 'Acción Correctiva' : i.status;
        
        this.audit.log(this.state.userName(), this.state.userRole(), 'CALIDAD', 'Agregar Acción CAPA', `Acción ${newAction.type} agregada a ${i.code}`);
        return { ...i, status: newStatus, actions: [...i.actions, newAction] };
      }
      return i;
    }));
  }

  toggleActionCompletion(incidentId: string, actionId: string) {
    this._incidents.next(this.incidents.map(i => {
      if (i.id === incidentId) {
         const updatedActions = i.actions.map(a => a.id === actionId ? { ...a, completed: !a.completed } : a);
         this.audit.log(this.state.userName(), this.state.userRole(), 'CALIDAD', 'Completar Acción', `Estado de acción modificado en ${i.code}`);
         return { ...i, actions: updatedActions };
      }
      return i;
    }));
  }

  closeIncident(incidentId: string) {
     const incident = this.incidents.find(i => i.id === incidentId);
     this._incidents.next(this.incidents.map(i => i.id === incidentId ? { ...i, status: 'Cerrada' } : i));
     this.audit.log(this.state.userName(), this.state.userRole(), 'CALIDAD', 'Cerrar Incidencia', `Incidencia ${incident?.code} marcada como resuelta.`);
  }
}
