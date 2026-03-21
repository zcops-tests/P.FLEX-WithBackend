
export type IncidentPriority = 'Alta' | 'Media' | 'Baja';
export type IncidentType = 'Calidad' | 'Seguridad' | 'Maquinaria' | 'Material' | 'Otro';
export type IncidentStatus = 'Abierta' | 'En Análisis' | 'Acción Correctiva' | 'Cerrada';

export interface CapaAction {
  id: string;
  description: string;
  type: 'Correctiva' | 'Preventiva';
  responsible: string;
  deadline: string;
  completed: boolean;
}

export interface Incident {
  id: string;
  code: string; 
  title: string;
  description: string;
  priority: IncidentPriority;
  type: IncidentType;
  status: IncidentStatus;
  otRef?: string;
  machineRef?: string;
  reportedBy: string;
  reportedAt: Date;
  assignedTo: string;
  rootCause?: string;
  actions: CapaAction[];
}
