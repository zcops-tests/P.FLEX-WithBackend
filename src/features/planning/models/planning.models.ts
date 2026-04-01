export type PlanningShift = 'DIA' | 'NOCHE';
export type PlanningArea = 'IMPRESION' | 'TROQUELADO' | 'REBOBINADO';

export interface PlanningScheduleEntry {
  id: string;
  scheduleEntryId?: string;
  workOrderId: string;
  ot: string;
  client: string;
  description: string;
  machineId: string;
  machineCode: string;
  machineName: string;
  scheduledDate: string;
  shift: PlanningShift;
  area: PlanningArea;
  start: string;
  duration: number;
  operator: string;
  meters: number;
  notes?: string;
  rowVersion?: bigint | number | string;
  isHistorical?: boolean;
}
