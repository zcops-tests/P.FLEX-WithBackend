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
  die: { status: string };
  observations: string;
  productionStatus: 'PARCIAL' | 'TOTAL';
}

export interface DiecutActivity {
  type: string;
  startTime: string;
  endTime: string;
  qty: number;
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
