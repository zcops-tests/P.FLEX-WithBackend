export const OT_IMPORT_HEADERS = [
  'descripcion',
  'Nro. Cotizacion',
  'Nro. Ficha',
  'Pedido',
  'OT',
  'ORDEN COMPRA',
  'Razon Social',
  'Vendedor',
  'Glosa',
  'MLL Pedido',
  'FECHA PED',
  'FECHA ENT',
  'CANT PED',
  'Und',
  'Material',
  'Ancho',
  'Drawback',
  'impresion',
  'merma',
  'Medida',
  'Avance',
  'desarrollo',
  'sep_avance',
  'calibre',
  'num_colum',
  'adhesivo',
  'acabado',
  'troquel',
  'SentidoFinal',
  'diametuco',
  'ObsDes',
  'ObsCot',
  'medidavend',
  'maquina',
  'anchoEtiq',
  'ancho_mate',
  'forma',
  'tipoimpre1',
  'dispensado',
  'cant_etq_xrollohojas',
  'fechaPrd',
  'codmaquina',
  's_merma',
  'mtl_sin_merma',
  'total_mtl',
  'total_M2',
  'LARGO',
  'col_ficha',
  'prepicado_h',
  'prepicado_v',
  'semicorte',
  'corte_seguridad',
  'forma_emb',
  'und_negocio',
  'Linea_produccion',
  'p_cant_rollo_ficha',
  'Estado_pedido',
  'r_ref_ot',
  'logo_tuco',
  'troquel_ficha',
  'acabado_ficha',
  't_acabado',
  'ta_acabado',
  'd_max_bob',
] as const;

export interface OT {
  id?: string;
  row_version?: bigint | number | string;
  backend_status?: string;
  descripcion: string;
  'Nro. Cotizacion': string;
  'Nro. Ficha': string;
  Pedido: string;
  OT: string;
  'ORDEN COMPRA': string;
  'Razon Social': string;
  Vendedor: string;
  Glosa: string;
  'MLL Pedido': string;
  'FECHA PED': string;
  'FECHA ENT': string;
  'FECHA INGRESO PLANTA'?: string; // New field
  'CANT PED': number | string;
  Und: string;
  Material: string;
  Ancho: string;
  Drawback: string;
  impresion: string;
  merma: string;
  Medida: string;
  Avance: string;
  desarrollo: string;
  sep_avance: string;
  calibre: string;
  num_colum: string;
  adhesivo: string;
  acabado: string;
  troquel: string;
  SentidoFinal: string;
  diametuco: string;
  ObsDes: string;
  ObsCot: string;
  medidavend: string;
  maquina: string;
  anchoEtiq: string;
  ancho_mate: string;
  forma: string;
  tipoimpre1: string;
  dispensado: string;
  cant_etq_xrollohojas: string;
  fechaPrd: string;
  codmaquina: string;
  s_merma: string;
  mtl_sin_merma: string;
  total_mtl: string;
  total_M2: string;
  LARGO: string;
  col_ficha: string;
  prepicado_h: string;
  prepicado_v: string;
  semicorte: string;
  corte_seguridad: string;
  forma_emb: string;
  und_negocio: string;
  Linea_produccion: string;
  p_cant_rollo_ficha: string;
  Estado_pedido: string;
  r_ref_ot: string;
  logo_tuco: string;
  troquel_ficha: string;
  acabado_ficha: string;
  t_acabado: string;
  ta_acabado: string;
  d_max_bob: string;
}

export interface OTImportProgress {
  currentBatch: number;
  totalBatches: number;
  processedItems: number;
  totalItems: number;
  percentage: number;
}

export type OTManagementExitAction =
  | 'REMOVE_ONLY'
  | 'CLEAR_PLANT_ENTRY'
  | 'REVERT_TO_IMPORTED';

export interface OTDatabaseBrowserState {
  items: Partial<OT>[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  query: string;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string;
}
