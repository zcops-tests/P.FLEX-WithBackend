import { normalizeRoleName } from '../../modules/auth/utils/role-normalization.util';

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateString(value: Date | string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function toDate(value: Date | string | null | undefined): Date {
  return value ? new Date(value) : new Date();
}

function normalizeMachineType(value: string | null | undefined): string {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('PRINT') || normalized.includes('IMP')) return 'Impresion';
  if (normalized.includes('DIECUT') || normalized.includes('TROQ')) return 'Troquelado';
  if (normalized.includes('REWIND') || normalized.includes('PACK') || normalized.includes('ACAB')) return 'Acabado';
  return value || 'Impresion';
}

function normalizeMachineStatus(value: string | null | undefined): 'Operativa' | 'Mantenimiento' | 'Detenida' | 'Sin Operador' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('MAINT')) return 'Mantenimiento';
  if (normalized.includes('STOP') || normalized.includes('DETEN')) return 'Detenida';
  if (normalized.includes('NO_OPERATOR') || normalized.includes('SIN')) return 'Sin Operador';
  return 'Operativa';
}

function normalizeStockStatus(value: string | null | undefined): 'Liberado' | 'Cuarentena' | 'Retenido' | 'Despachado' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('QUAR')) return 'Cuarentena';
  if (normalized.includes('RETAIN')) return 'Retenido';
  if (normalized.includes('DISPATCH')) return 'Despachado';
  return 'Liberado';
}

function normalizeIncidentPriority(value: string | null | undefined): 'Alta' | 'Media' | 'Baja' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('HIGH') || normalized.includes('ALTA')) return 'Alta';
  if (normalized.includes('LOW') || normalized.includes('BAJA')) return 'Baja';
  return 'Media';
}

function normalizeIncidentType(value: string | null | undefined): 'Calidad' | 'Seguridad' | 'Maquinaria' | 'Material' | 'Otro' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('SAFE')) return 'Seguridad';
  if (normalized.includes('MACH')) return 'Maquinaria';
  if (normalized.includes('MATER')) return 'Material';
  if (normalized.includes('OTRO') || normalized.includes('OTHER')) return 'Otro';
  return 'Calidad';
}

function normalizeIncidentStatus(value: string | null | undefined): 'Abierta' | 'En Análisis' | 'Acción Correctiva' | 'Cerrada' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('ANAL')) return 'En Análisis';
  if (normalized.includes('CORRECT')) return 'Acción Correctiva';
  if (normalized.includes('CLOSE') || normalized.includes('CERR')) return 'Cerrada';
  return 'Abierta';
}

function normalizeCapaType(value: string | null | undefined): 'Correctiva' | 'Preventiva' {
  const normalized = String(value || '').toUpperCase();
  return normalized.includes('PREV') ? 'Preventiva' : 'Correctiva';
}

function normalizeProductionStatus(value: string | null | undefined): 'PARCIAL' | 'TOTAL' {
  return String(value || '').toUpperCase().includes('PAR') ? 'PARCIAL' : 'TOTAL';
}

function normalizeDieStatus(value: string | null | undefined): 'OK' | 'Desgaste' | 'Dañado' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('WEAR') || normalized.includes('DESG')) return 'Desgaste';
  if (normalized.includes('DAM') || normalized.includes('DAÑ') || normalized.includes('DAN')) return 'Dañado';
  return 'OK';
}

function normalizeHistoryType(value: string | null | undefined): 'Producción' | 'Mantenimiento' | 'Reparación' | 'Cambio Versión' | 'Creación' | 'Baja' | 'Otro' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('MAINT')) return 'Mantenimiento';
  if (normalized.includes('REPAIR')) return 'Reparación';
  if (normalized.includes('VERSION')) return 'Cambio Versión';
  if (normalized.includes('CREAT')) return 'Creación';
  if (normalized.includes('DEACT') || normalized.includes('BAJA')) return 'Baja';
  if (normalized.includes('PROD')) return 'Producción';
  return 'Otro';
}

export function toFrontendRole(role: any) {
  return {
    ...role,
    name: normalizeRoleName(role.name || role.code),
    permissions: (role.permissions || []).map((entry: any) => entry.permission?.name || entry.permission?.code).filter(Boolean),
  };
}

export function toFrontendUser(user: any) {
  return {
    ...user,
    role: {
      ...(user.role || {}),
      name: normalizeRoleName(user.role?.name || user.role?.code || user.role_code),
    },
    assignedAreas: user.assignedAreas || [],
  };
}

export function toFrontendMachine(machine: any) {
  return {
    ...machine,
    type: machine.type,
    uiType: normalizeMachineType(machine.type),
    uiStatus: normalizeMachineStatus(machine.status),
    area_name: machine.area?.name || machine.area_name || '',
  };
}

export function toFrontendArea(area: any) {
  return { ...area };
}

export function toFrontendShift(shift: any) {
  return { ...shift };
}

export function toFrontendSystemConfig(config: any) {
  return {
    ...config,
    shiftName1: config.shiftName1 || 'Turno Dia',
    shiftTime1: config.shiftTime1 || '06:00',
    shiftName2: config.shiftName2 || 'Turno Noche',
    shiftTime2: config.shiftTime2 || '18:00',
    plantName: config.plant_name,
    autoLogoutMinutes: config.auto_logout_minutes,
    passwordExpiryWarningDays: config.password_expiry_warning_days,
    passwordPolicyDays: config.password_policy_days,
    operatorMessage: config.operator_message || '',
  };
}

export function toFrontendWorkOrder(workOrder: any) {
  return {
    ...workOrder,
    OT: workOrder.ot_number,
    descripcion: workOrder.descripcion || '',
    'Nro. Cotizacion': workOrder.nro_cotizacion || '',
    'Nro. Ficha': workOrder.nro_ficha || '',
    Pedido: workOrder.pedido || '',
    'ORDEN COMPRA': workOrder.orden_compra || '',
    'Razon Social': workOrder.cliente_razon_social || '',
    Vendedor: workOrder.vendedor || '',
    Glosa: workOrder.descripcion || '',
    'FECHA PED': toDateString(workOrder.fecha_pedido),
    'FECHA ENT': toDateString(workOrder.fecha_entrega),
    'FECHA INGRESO PLANTA': toDateString(workOrder.fecha_ingreso_planta),
    'CANT PED': toNumber(workOrder.cantidad_pedida) ?? '',
    Und: workOrder.unidad || '',
    Material: workOrder.material || '',
    Ancho: String(toNumber(workOrder.ancho_mm) ?? ''),
    Avance: String(toNumber(workOrder.avance_mm) ?? ''),
    desarrollo: String(toNumber(workOrder.desarrollo_mm) ?? ''),
    num_colum: String(workOrder.columnas ?? ''),
    adhesivo: workOrder.adhesivo || '',
    acabado: workOrder.acabado || '',
    troquel: workOrder.troquel || '',
    ObsDes: workOrder.observaciones_diseno || '',
    ObsCot: workOrder.observaciones_cotizacion || '',
    maquina: workOrder.maquina_texto || '',
    total_mtl: String(toNumber(workOrder.total_metros) ?? ''),
    total_M2: String(toNumber(workOrder.total_m2) ?? ''),
    fechaPrd: toDateString(workOrder.fecha_programada_produccion),
  };
}

export function toFrontendClise(clise: any) {
  const fallbackColors = Array.isArray(clise.colores_json)
    ? clise.colores_json
    : typeof clise.raw_payload?.colores === 'string'
      ? String(clise.raw_payload.colores).split(',').map((entry: string) => entry.trim()).filter(Boolean)
      : [];
  const displayItemCode = typeof clise.raw_payload?.display_item_code === 'string'
    ? String(clise.raw_payload.display_item_code).trim()
    : String(clise.item_code || '').trim();
  const hasConflict = Boolean(
    clise.raw_payload?.import_conflict
    || !displayItemCode
    || !String(clise.cliente || '').trim(),
  );

  return {
    ...clise,
    item: displayItemCode,
    backend_item_code: clise.item_code,
    hasConflict,
    z: clise.z_value || '',
    medidas: clise.raw_payload?.medidas || [clise.ancho_mm, clise.avance_mm].filter((value) => value !== null && value !== undefined).join(' x '),
    troquel: clise.die_links?.[0]?.die?.raw_payload?.display_serie || clise.die_links?.[0]?.die?.serie || clise.raw_payload?.troquel || '',
    linkedDies: (clise.die_links || []).map((link: any) => link.die?.raw_payload?.display_serie || link.die?.serie).filter(Boolean),
    ancho: toNumber(clise.ancho_mm),
    avance: toNumber(clise.avance_mm),
    col: clise.columnas ?? null,
    rep: clise.repeticiones ?? null,
    n_clises: clise.numero_clises ?? null,
    espesor: String(toNumber(clise.espesor_mm) ?? ''),
    ingreso: toDateString(clise.fecha_ingreso),
    obs: clise.observaciones || '',
    maq: clise.maquina_texto || '',
    colores: (clise.color_usage || []).length
      ? (clise.color_usage || []).map((usage: any) => usage.color_name).join(', ')
      : fallbackColors.join(', '),
    colorUsage: (clise.color_usage || []).length
      ? (clise.color_usage || []).map((usage: any) => ({
        name: usage.color_name,
        meters: toNumber(usage.meters) || 0,
      }))
      : fallbackColors.map((name: string) => ({
        name,
        meters: 0,
      })),
    n_ficha_fler: clise.ficha_fler || '',
    mtl_acum: toNumber(clise.metros_acumulados),
    imagen: clise.imagen_url || '',
    history: (clise.history || []).map((entry: any) => ({
      ...entry,
      date: toDateString(entry.event_date),
      type: normalizeHistoryType(entry.event_type),
      user: entry.user?.name || '',
      machine: entry.machine?.name || '',
      amount: toNumber(entry.amount) || undefined,
    })),
  };
}

export function toFrontendDie(die: any) {
  const displaySerie = typeof die.raw_payload?.display_serie === 'string'
    ? String(die.raw_payload.display_serie).trim()
    : String(die.serie || '').trim();
  const hasConflict = Boolean(
    die.raw_payload?.import_conflict
    || !displaySerie
    || !String(die.cliente || '').trim(),
  );

  return {
    ...die,
    serie: displaySerie,
    backend_serie: die.serie,
    hasConflict,
    linkedClises: (die.clise_links || []).map((link: any) => link.clise?.raw_payload?.display_item_code || link.clise?.item_code).filter(Boolean),
    z: die.z_value || '',
    ingreso: toDateString(die.fecha_ingreso),
    sep_ava: die.separacion_avance || '',
    mtl_acum: toNumber(die.metros_acumulados),
    history: (die.history || []).map((entry: any) => ({
      ...entry,
      date: toDateString(entry.event_date),
      type: normalizeHistoryType(entry.event_type),
      user: entry.user?.name || '',
      machine: entry.machine?.name || '',
      amount: toNumber(entry.amount) || undefined,
    })),
  };
}

export function toFrontendStockItem(item: any) {
  return {
    ...item,
    ot: item.ot_number_snapshot || item.work_order?.ot_number || '',
    client: item.client_snapshot || '',
    product: item.product_snapshot || '',
    quantity: toNumber(item.quantity) || 0,
    millares: toNumber(item.millares) || undefined,
    location: item.location || '',
    uiStatus: normalizeStockStatus(item.status),
    entryDate: toDateString(item.entry_date),
    notes: item.notes || undefined,
    palletId: item.pallet_id || undefined,
  };
}

export function toFrontendIncident(incident: any) {
  return {
    ...incident,
    uiPriority: normalizeIncidentPriority(incident.priority),
    uiType: normalizeIncidentType(incident.type),
    uiStatus: normalizeIncidentStatus(incident.status),
    otRef: incident.ot_number_snapshot || incident.work_order?.ot_number || undefined,
    machineRef: incident.machine_code_snapshot || incident.machine?.code || undefined,
    reportedBy: incident.reportedBy?.name || incident.reportedBy || '',
    reportedAt: toDate(incident.reported_at),
    assignedTo: incident.assignedTo?.name || incident.assignedTo || '',
    rootCause: incident.root_cause || undefined,
    actions: (incident.capaActions || []).map((action: any) => ({
      ...action,
      description: action.description,
      type: normalizeCapaType(action.action_type),
      responsible: action.responsible?.name || '',
      deadline: toDateString(action.deadline),
      completed: Boolean(action.completed),
    })),
  };
}

export function toFrontendCapaAction(action: any) {
  return {
    ...action,
    uiType: normalizeCapaType(action.action_type),
    responsible: action.responsible?.name || '',
    deadline: toDateString(action.deadline),
    completed: Boolean(action.completed),
  };
}

export function toFrontendPrintReport(report: any) {
  if (!report) return report;
  return {
    ...report,
    date: toDate(report.reported_at),
    ot: report.work_order_number_snapshot || report.work_order?.ot_number || '',
    client: report.client_snapshot || '',
    product: report.product_snapshot || '',
    machine: report.machine?.name || '',
    operator: report.operator?.name || report.operator_name_snapshot || '',
    shift: report.shift?.name || '',
    uiActivities: (report.activities || []).map((activity: any) => ({
      ...activity,
      type: activity.activity_type,
      startTime: activity.start_time,
      endTime: activity.end_time,
      meters: toNumber(activity.meters) || 0,
      duration: activity.duration_minutes ? `${activity.duration_minutes} min` : undefined,
    })),
    totalMeters: toNumber(report.total_meters) || 0,
    clise: { code: report.clise?.item_code || '', status: report.clise_status || '' },
    die: { status: report.die_status || '' },
    productionStatus: normalizeProductionStatus(report.production_status),
  };
}

export function toFrontendDiecutReport(report: any) {
  if (!report) return report;
  return {
    ...report,
    date: toDate(report.reported_at),
    ot: report.work_order_number_snapshot || report.work_order?.ot_number || '',
    client: report.client_snapshot || '',
    product: report.product_snapshot || '',
    machine: report.machine?.name || '',
    operator: report.operator?.name || report.operator_name_snapshot || '',
    shift: report.shift?.name || '',
    dieSeries: report.die?.serie || '',
    goodUnits: toNumber(report.good_units) || 0,
    waste: toNumber(report.waste_units) || 0,
    dieStatus: normalizeDieStatus(report.die_status),
    uiActivities: (report.activities || []).map((activity: any) => ({
      ...activity,
      type: activity.activity_type,
      startTime: activity.start_time,
      endTime: activity.end_time,
      qty: toNumber(activity.quantity) || 0,
    })),
    productionStatus: normalizeProductionStatus(report.production_status),
  };
}
