export interface PrintActivity {
  type: string;
  startTime: string;
  endTime: string;
  meters: number;
  duration?: string;
}

export interface PrintReport {
  id: string;
  date: Date;
  ot: string;
  client: string;
  product: string;
  machine: string;
  operator: string;
  shift: string;
  activities: PrintActivity[];
  totalMeters: number;
  clise: { code: string; status: string };
  die: { status: string; type?: string; series?: string; location?: string };
  observations: string;
  productionStatus: 'PARCIAL' | 'TOTAL';
}

export interface DiecutActivity {
  type: string;
  startTime: string;
  endTime: string;
  qty: number;
  observations?: string;
}

export interface DiecutReport {
  id: string;
  date: Date;
  ot: string;
  client: string;
  product: string;
  machine: string;
  operator: string;
  shift: string;
  dieSeries: string;
  frequency?: string;
  goodUnits: number;
  waste: number;
  dieStatus: 'OK' | 'Desgaste' | 'Dañado';
  activities: DiecutActivity[];
  productionStatus: 'PARCIAL' | 'TOTAL';
  observations: string;
}

export interface RewindReport {
  id: string;
  date: Date;
  ot: string;
  client: string;
  description: string;
  machine: string;
  operator: string;
  shift: string;
  rolls: number;
  labelsPerRoll: number;
  totalLabels: number;
  meters: number;
  waste: number;
  qualityCheck: boolean;
  observations: string;
  productionStatus: 'PARCIAL' | 'TOTAL';
}

export interface PackagingReport {
  id: string;
  date: Date;
  ot: string;
  client: string;
  description: string;
  operator: string;
  shift: string;
  status: 'Completo' | 'Parcial';
  rolls: number;
  meters: number;
  demasiaRolls: number;
  demasiaMeters: number;
  notes: string;
  workOrderId?: string | null;
}
