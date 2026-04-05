
export interface CliseHistory {
  date: string;
  type: 'Producción' | 'Mantenimiento' | 'Reparación' | 'Cambio Versión' | 'Creación' | 'Baja' | 'Otro';
  description: string;
  user: string;
  machine?: string;
  amount?: number; 
}

export interface CliseColorUsage {
  name: string;
  meters: number;
}

export interface CliseItem {
  id: string;
  item: string;
  backendItemCode?: string;
  ubicacion: string;
  descripcion: string;
  cliente: string;
  z: string;
  estandar: string;
  medidas: string;
  troquel: string; 
  linkedDies: string[];
  ancho: number | null;
  avance: number | null;
  col: number | null;
  rep: number | null;
  n_clises: number | null;
  espesor: string;
  ingreso: string; 
  obs: string;
  maq: string;
  colores: string;
  colorUsage?: CliseColorUsage[];
  n_ficha_fler: string;
  mtl_acum: number | null;
  imagen?: string; 
  sourceRow?: Record<string, unknown>;
  history: CliseHistory[];
  hasConflict?: boolean;
  conflictReasons?: string[];
}

export interface DieItem {
  id: string;
  medida: string;
  ubicacion: string;
  serie: string;
  backendSerie?: string;
  linkedClises: string[];
  ancho_mm: number | null;
  avance_mm: number | null;
  ancho_plg: number | null;
  avance_plg: number | null;
  z: string;
  columnas: number | null;
  repeticiones: number | null;
  material: string;
  forma: string;
  cliente: string;
  observaciones: string;
  ingreso: string;
  pb: string;
  sep_ava: string;
  estado: string;
  cantidad: number | null;
  almacen: string;
  mtl_acum: number | null;
  tipo_troquel: string;
  sourceRow?: Record<string, unknown>;
  history: CliseHistory[];
  hasConflict?: boolean;
  conflictReasons?: string[];
}

export interface StockItem {
  id: string;
  medida: string;
  anchoMm: number | null;
  avanceMm: number | null;
  material: string;
  columnas: number | null;
  prepicado: string;
  cantidadXRollo: number | null;
  cantidadMillares: number | null;
  etiqueta: string;
  forma: string;
  tipoProducto: string;
  caja: string;
  ubicacion: string;
  status: 'Liberado' | 'Cuarentena' | 'Retenido' | 'Despachado';
  entryDate: string;
  notes?: string;
  boxId?: string;
  hasConflict?: boolean;
  conflictReasons?: string[];
}

export interface RackBox {
  label: string; 
  min?: number;
  max?: number;
  items: (CliseItem | DieItem)[]; 
}

export interface RackLevel {
  levelNumber: number;
  boxes: RackBox[];
}

export interface RackConfig {
  id: string;
  name: string; 
  type: 'clise' | 'die';
  levels: RackLevel[];
  orientation: 'vertical' | 'horizontal'; 
}
