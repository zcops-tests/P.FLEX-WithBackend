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

const WORK_ORDER_IMPORT_HEADERS = [
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
  'FECHA INGRESO PLANTA',
] as const;

function normalizeRawPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  return payload as Record<string, unknown>;
}

function stringifyWorkOrderValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return String(value);
}

function readWorkOrderRawValue(
  payload: Record<string, unknown>,
  key: (typeof WORK_ORDER_IMPORT_HEADERS)[number],
  fallback: unknown,
) {
  const rawValue = payload[key];
  return rawValue !== undefined && rawValue !== null && rawValue !== ''
    ? rawValue
    : stringifyWorkOrderValue(fallback);
}

function normalizeMachineType(
  value: string | null | undefined,
  areaName?: string | null,
  areaCode?: string | null,
): string {
  const normalized = String(value || '').toUpperCase();
  const normalizedAreaName = String(areaName || '').toUpperCase();
  const normalizedAreaCode = String(areaCode || '').toUpperCase();
  if (normalized.includes('PRINT') || normalized.includes('IMP'))
    return 'Impresion';
  if (normalized.includes('DIECUT') || normalized.includes('TROQ'))
    return 'Troquelado';
  if (
    normalized.includes('PACK') ||
    normalized.includes('EMPAQ') ||
    normalizedAreaName.includes('EMPAQ') ||
    normalizedAreaCode.includes('EMPAQ')
  )
    return 'Empaquetado';
  if (
    normalized.includes('REWIND') ||
    normalized.includes('REBOB') ||
    normalized.includes('ACAB') ||
    normalizedAreaName.includes('REBOB') ||
    normalizedAreaCode.includes('REBOB')
  )
    return 'Rebobinado';
  return value || 'Impresion';
}

function normalizeMachineStatus(
  value: string | null | undefined,
): 'Activo' | 'Inactivo' | 'Mantenimiento' | 'Detenida' | 'Sin Operario' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('INACT')) return 'Inactivo';
  if (normalized.includes('MAINT')) return 'Mantenimiento';
  if (normalized.includes('STOP') || normalized.includes('DETEN'))
    return 'Detenida';
  if (normalized.includes('NO_OPERATOR') || normalized.includes('SIN'))
    return 'Sin Operario';
  return 'Activo';
}

function normalizeStockStatus(
  value: string | null | undefined,
): 'Liberado' | 'Cuarentena' | 'Retenido' | 'Despachado' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('QUAR')) return 'Cuarentena';
  if (normalized.includes('RETAIN')) return 'Retenido';
  if (normalized.includes('DISPATCH')) return 'Despachado';
  return 'Liberado';
}

function normalizeIncidentPriority(
  value: string | null | undefined,
): 'Alta' | 'Media' | 'Baja' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('HIGH') || normalized.includes('ALTA')) return 'Alta';
  if (normalized.includes('LOW') || normalized.includes('BAJA')) return 'Baja';
  return 'Media';
}

function normalizeIncidentType(
  value: string | null | undefined,
): 'Calidad' | 'Seguridad' | 'Maquinaria' | 'Material' | 'Otro' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('SAFE')) return 'Seguridad';
  if (normalized.includes('MACH')) return 'Maquinaria';
  if (normalized.includes('MATER')) return 'Material';
  if (normalized.includes('OTRO') || normalized.includes('OTHER'))
    return 'Otro';
  return 'Calidad';
}

function normalizeIncidentStatus(
  value: string | null | undefined,
): 'Abierta' | 'En Análisis' | 'Acción Correctiva' | 'Cerrada' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('ANAL')) return 'En Análisis';
  if (normalized.includes('CORRECT')) return 'Acción Correctiva';
  if (normalized.includes('CLOSE') || normalized.includes('CERR'))
    return 'Cerrada';
  return 'Abierta';
}

function normalizeCapaType(
  value: string | null | undefined,
): 'Correctiva' | 'Preventiva' {
  const normalized = String(value || '').toUpperCase();
  return normalized.includes('PREV') ? 'Preventiva' : 'Correctiva';
}

function normalizeProductionStatus(
  value: string | null | undefined,
): 'PARCIAL' | 'TOTAL' {
  return String(value || '')
    .toUpperCase()
    .includes('PAR')
    ? 'PARCIAL'
    : 'TOTAL';
}

function normalizeDieStatus(
  value: string | null | undefined,
): 'OK' | 'Desgaste' | 'Dañado' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('WEAR') || normalized.includes('DESG'))
    return 'Desgaste';
  if (
    normalized.includes('DAM') ||
    normalized.includes('DAÑ') ||
    normalized.includes('DAN')
  )
    return 'Dañado';
  return 'OK';
}

function normalizeHistoryType(
  value: string | null | undefined,
):
  | 'Producción'
  | 'Mantenimiento'
  | 'Reparación'
  | 'Cambio Versión'
  | 'Creación'
  | 'Baja'
  | 'Otro' {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('MAINT')) return 'Mantenimiento';
  if (normalized.includes('REPAIR')) return 'Reparación';
  if (normalized.includes('VERSION')) return 'Cambio Versión';
  if (normalized.includes('CREAT')) return 'Creación';
  if (normalized.includes('DEACT') || normalized.includes('BAJA'))
    return 'Baja';
  if (normalized.includes('PROD')) return 'Producción';
  return 'Otro';
}

export function toFrontendRole(role: any) {
  const permissionEntries = (role.permissions || [])
    .filter((entry: any) => !entry?.deleted_at)
    .map((entry: any) => entry.permission)
    .filter(Boolean);

  return {
    id: role.id,
    code: role.code,
    name: role.name || normalizeRoleName(role.code),
    legacyName: normalizeRoleName(role.name || role.code),
    description: role.description || role.name || '',
    active: role.active !== false,
    permissions: permissionEntries.map((permission: any) => ({
      id: permission.id,
      code: permission.code,
      name: permission.name,
      description: permission.description,
    })),
    permissionCodes: permissionEntries
      .map((permission: any) => permission.code)
      .filter(Boolean),
    assignedUserCount: Array.isArray(role.users)
      ? role.users.filter((user: any) => !user?.deleted_at).length
      : undefined,
  };
}

export function toFrontendUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    active: user.active !== false,
    last_login_at: user.last_login_at || null,
    role: {
      id: user.role?.id || user.role_id || null,
      code: user.role?.code || user.role_code || null,
      name:
        user.role?.name ||
        normalizeRoleName(user.role?.name || user.role?.code || user.role_code),
      permissions: (user.role?.permissions || [])
        .filter((entry: any) => !entry?.deleted_at)
        .map((entry: any) => entry.permission)
        .filter(Boolean)
        .map((permission: any) => ({
          id: permission.id,
          code: permission.code,
          name: permission.name,
          description: permission.description,
        })),
    },
    assignedAreas: user.assignedAreas || [],
  };
}

export function toFrontendMachine(machine: any) {
  return {
    ...machine,
    type: machine.type,
    uiType: normalizeMachineType(
      machine.type,
      machine.area?.name || machine.area_name,
      machine.area?.code || machine.area_code,
    ),
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

export function toFrontendPlanningScheduleEntry(entry: any) {
  const snapshot =
    entry?.snapshot_payload &&
    typeof entry.snapshot_payload === 'object' &&
    !Array.isArray(entry.snapshot_payload)
      ? entry.snapshot_payload
      : {};

  return {
    id: entry.id,
    row_version: entry.row_version,
    workOrderId: entry.work_order_id,
    machineId: entry.machine_id,
    scheduleEntryId: entry.id,
    scheduledDate: toDateString(entry.schedule_date),
    shift: entry.shift,
    area: entry.area,
    start: String(entry.start_time || '').slice(0, 5),
    duration: Number(entry.duration_minutes || 0),
    operator: String(entry.operator_name || snapshot['operator'] || ''),
    notes: String(entry.notes || snapshot['notes'] || ''),
    ot: String(snapshot['ot'] || entry.work_order?.ot_number || ''),
    client: String(
      snapshot['client'] ||
        entry.work_order?.cliente_razon_social ||
        '',
    ),
    description: String(
      snapshot['description'] ||
        entry.work_order?.descripcion ||
        '',
    ),
    meters: toNumber(snapshot['meters']) || 0,
    machineCode: String(
      snapshot['machine_code'] ||
        entry.machine?.code ||
        '',
    ),
    machineName: String(
      snapshot['machine_name'] ||
        entry.machine?.name ||
        '',
    ),
    snapshot_payload: snapshot,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    deleted_at: entry.deleted_at,
  };
}

export function toFrontendWorkOrder(workOrder: any) {
  const rawPayload = normalizeRawPayload(workOrder.raw_payload);

  return {
    ...workOrder,
    ...Object.fromEntries(
      WORK_ORDER_IMPORT_HEADERS.map((header) => [
        header,
        rawPayload[header] ?? '',
      ]),
    ),
    OT: readWorkOrderRawValue(rawPayload, 'OT', workOrder.ot_number),
    descripcion: readWorkOrderRawValue(
      rawPayload,
      'descripcion',
      workOrder.descripcion,
    ),
    'Nro. Cotizacion': readWorkOrderRawValue(
      rawPayload,
      'Nro. Cotizacion',
      workOrder.nro_cotizacion,
    ),
    'Nro. Ficha': readWorkOrderRawValue(
      rawPayload,
      'Nro. Ficha',
      workOrder.nro_ficha,
    ),
    Pedido: readWorkOrderRawValue(rawPayload, 'Pedido', workOrder.pedido),
    'ORDEN COMPRA': readWorkOrderRawValue(
      rawPayload,
      'ORDEN COMPRA',
      workOrder.orden_compra,
    ),
    'Razon Social': readWorkOrderRawValue(
      rawPayload,
      'Razon Social',
      workOrder.cliente_razon_social,
    ),
    Vendedor: readWorkOrderRawValue(rawPayload, 'Vendedor', workOrder.vendedor),
    Glosa: readWorkOrderRawValue(rawPayload, 'Glosa', workOrder.descripcion),
    'MLL Pedido': readWorkOrderRawValue(
      rawPayload,
      'MLL Pedido',
      toNumber(workOrder.cantidad_pedida) ?? '',
    ),
    'FECHA PED': readWorkOrderRawValue(
      rawPayload,
      'FECHA PED',
      toDateString(workOrder.fecha_pedido),
    ),
    'FECHA ENT': readWorkOrderRawValue(
      rawPayload,
      'FECHA ENT',
      toDateString(workOrder.fecha_entrega),
    ),
    'FECHA INGRESO PLANTA': readWorkOrderRawValue(
      rawPayload,
      'FECHA INGRESO PLANTA',
      toDateString(workOrder.fecha_ingreso_planta),
    ),
    'CANT PED': readWorkOrderRawValue(
      rawPayload,
      'CANT PED',
      toNumber(workOrder.cantidad_pedida) ?? '',
    ),
    Und: readWorkOrderRawValue(rawPayload, 'Und', workOrder.unidad),
    Material: readWorkOrderRawValue(rawPayload, 'Material', workOrder.material),
    Ancho: readWorkOrderRawValue(
      rawPayload,
      'Ancho',
      toNumber(workOrder.ancho_mm) ?? '',
    ),
    Drawback: readWorkOrderRawValue(rawPayload, 'Drawback', ''),
    impresion: readWorkOrderRawValue(rawPayload, 'impresion', ''),
    merma: readWorkOrderRawValue(rawPayload, 'merma', ''),
    Medida: readWorkOrderRawValue(rawPayload, 'Medida', ''),
    Avance: readWorkOrderRawValue(
      rawPayload,
      'Avance',
      toNumber(workOrder.avance_mm) ?? '',
    ),
    desarrollo: readWorkOrderRawValue(
      rawPayload,
      'desarrollo',
      toNumber(workOrder.desarrollo_mm) ?? '',
    ),
    sep_avance: readWorkOrderRawValue(rawPayload, 'sep_avance', ''),
    calibre: readWorkOrderRawValue(rawPayload, 'calibre', ''),
    num_colum: readWorkOrderRawValue(
      rawPayload,
      'num_colum',
      workOrder.columnas ?? '',
    ),
    adhesivo: readWorkOrderRawValue(rawPayload, 'adhesivo', workOrder.adhesivo),
    acabado: readWorkOrderRawValue(rawPayload, 'acabado', workOrder.acabado),
    troquel: readWorkOrderRawValue(rawPayload, 'troquel', workOrder.troquel),
    SentidoFinal: readWorkOrderRawValue(rawPayload, 'SentidoFinal', ''),
    diametuco: readWorkOrderRawValue(rawPayload, 'diametuco', ''),
    ObsDes: readWorkOrderRawValue(
      rawPayload,
      'ObsDes',
      workOrder.observaciones_diseno,
    ),
    ObsCot: readWorkOrderRawValue(
      rawPayload,
      'ObsCot',
      workOrder.observaciones_cotizacion,
    ),
    medidavend: readWorkOrderRawValue(rawPayload, 'medidavend', ''),
    maquina: readWorkOrderRawValue(
      rawPayload,
      'maquina',
      workOrder.maquina_texto,
    ),
    anchoEtiq: readWorkOrderRawValue(rawPayload, 'anchoEtiq', ''),
    ancho_mate: readWorkOrderRawValue(rawPayload, 'ancho_mate', ''),
    forma: readWorkOrderRawValue(rawPayload, 'forma', ''),
    tipoimpre1: readWorkOrderRawValue(rawPayload, 'tipoimpre1', ''),
    dispensado: readWorkOrderRawValue(rawPayload, 'dispensado', ''),
    cant_etq_xrollohojas: readWorkOrderRawValue(
      rawPayload,
      'cant_etq_xrollohojas',
      '',
    ),
    fechaPrd: readWorkOrderRawValue(
      rawPayload,
      'fechaPrd',
      toDateString(workOrder.fecha_programada_produccion),
    ),
    codmaquina: readWorkOrderRawValue(rawPayload, 'codmaquina', ''),
    s_merma: readWorkOrderRawValue(rawPayload, 's_merma', ''),
    mtl_sin_merma: readWorkOrderRawValue(rawPayload, 'mtl_sin_merma', ''),
    total_mtl: readWorkOrderRawValue(
      rawPayload,
      'total_mtl',
      toNumber(workOrder.total_metros) ?? '',
    ),
    total_M2: readWorkOrderRawValue(
      rawPayload,
      'total_M2',
      toNumber(workOrder.total_m2) ?? '',
    ),
    LARGO: readWorkOrderRawValue(rawPayload, 'LARGO', ''),
    col_ficha: readWorkOrderRawValue(rawPayload, 'col_ficha', ''),
    prepicado_h: readWorkOrderRawValue(rawPayload, 'prepicado_h', ''),
    prepicado_v: readWorkOrderRawValue(rawPayload, 'prepicado_v', ''),
    semicorte: readWorkOrderRawValue(rawPayload, 'semicorte', ''),
    corte_seguridad: readWorkOrderRawValue(rawPayload, 'corte_seguridad', ''),
    forma_emb: readWorkOrderRawValue(rawPayload, 'forma_emb', ''),
    und_negocio: readWorkOrderRawValue(rawPayload, 'und_negocio', ''),
    Linea_produccion: readWorkOrderRawValue(rawPayload, 'Linea_produccion', ''),
    p_cant_rollo_ficha: readWorkOrderRawValue(
      rawPayload,
      'p_cant_rollo_ficha',
      '',
    ),
    Estado_pedido: readWorkOrderRawValue(
      rawPayload,
      'Estado_pedido',
      workOrder.status,
    ),
    r_ref_ot: readWorkOrderRawValue(rawPayload, 'r_ref_ot', ''),
    logo_tuco: readWorkOrderRawValue(rawPayload, 'logo_tuco', ''),
    troquel_ficha: readWorkOrderRawValue(rawPayload, 'troquel_ficha', ''),
    acabado_ficha: readWorkOrderRawValue(rawPayload, 'acabado_ficha', ''),
    t_acabado: readWorkOrderRawValue(rawPayload, 't_acabado', ''),
    ta_acabado: readWorkOrderRawValue(rawPayload, 'ta_acabado', ''),
    d_max_bob: readWorkOrderRawValue(rawPayload, 'd_max_bob', ''),
  };
}

export function toFrontendClise(clise: any) {
  const activeDieLinks = (clise.die_links || []).filter(
    (link: any) => !link.deleted_at,
  );
  const fallbackColors = Array.isArray(clise.colores_json)
    ? clise.colores_json
    : typeof clise.raw_payload?.colores === 'string'
      ? String(clise.raw_payload.colores)
          .split(',')
          .map((entry: string) => entry.trim())
          .filter(Boolean)
      : [];
  const displayItemCode =
    typeof clise.raw_payload?.display_item_code === 'string'
      ? String(clise.raw_payload.display_item_code).trim()
      : String(clise.item_code || '').trim();
  const hasConflict = Boolean(
    clise.raw_payload?.import_conflict ||
    !displayItemCode ||
    !String(clise.cliente || '').trim(),
  );

  return {
    ...clise,
    item: displayItemCode,
    backend_item_code: clise.item_code,
    hasConflict,
    z: clise.z_value || '',
    medidas:
      clise.raw_payload?.medidas ||
      [clise.ancho_mm, clise.avance_mm]
        .filter((value) => value !== null && value !== undefined)
        .join(' x '),
    troquel:
      activeDieLinks[0]?.die?.raw_payload?.display_serie ||
      activeDieLinks[0]?.die?.serie ||
      clise.raw_payload?.troquel ||
      '',
    linkedDies: activeDieLinks
      .map((link: any) => link.die?.id || link.die_id)
      .filter(Boolean),
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
      ? (clise.color_usage || [])
          .map((usage: any) => usage.color_name)
          .join(', ')
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
  const displaySerie =
    typeof die.raw_payload?.display_serie === 'string'
      ? String(die.raw_payload.display_serie).trim()
      : String(die.serie || '').trim();
  const hasConflict = Boolean(
    die.raw_payload?.import_conflict ||
    !displaySerie ||
    !String(die.cliente || '').trim(),
  );

  return {
    ...die,
    serie: displaySerie,
    backend_serie: die.serie,
    hasConflict,
    linkedClises: (die.clise_links || [])
      .map(
        (link: any) =>
          link.clise?.raw_payload?.display_item_code || link.clise?.item_code,
      )
      .filter(Boolean),
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
    otRef:
      incident.ot_number_snapshot ||
      incident.work_order?.ot_number ||
      undefined,
    machineRef:
      incident.machine_code_snapshot || incident.machine?.code || undefined,
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
      duration: activity.duration_minutes
        ? `${activity.duration_minutes} min`
        : undefined,
    })),
    totalMeters: toNumber(report.total_meters) || 0,
    clise: {
      code: report.clise?.item_code || '',
      status: report.clise_status || '',
    },
    die: {
      status: report.die_status || '',
      type: report.die_type_snapshot || '',
      series: report.die?.serie || report.die_series_snapshot || '',
      location: report.die?.ubicacion || report.die_location_snapshot || '',
    },
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
      observations: activity.observations || '',
    })),
    productionStatus: normalizeProductionStatus(report.production_status),
  };
}

export function toFrontendRewindReport(report: any) {
  if (!report) return report;
  return {
    ...report,
    date: toDate(report.reported_at),
    ot: report.work_order_number_snapshot || report.work_order?.ot_number || '',
    client: report.client_snapshot || '',
    description: report.product_snapshot || '',
    machine: report.machine?.name || '',
    operator: report.operator?.name || report.operator_name_snapshot || '',
    shift: report.shift?.name || '',
    rolls: Number(report.rolls_finished || 0),
    labelsPerRoll: Number(report.labels_per_roll || 0),
    totalLabels: toNumber(report.total_labels) || 0,
    meters: toNumber(report.total_meters) || 0,
    waste: Number(report.waste_rolls || 0),
    qualityCheck: Boolean(report.quality_check),
    observations: report.observations || '',
    productionStatus: normalizeProductionStatus(report.production_status),
    workOrderId: report.work_order_id || null,
  };
}

export function toFrontendPackagingReport(report: any) {
  if (!report) return report;
  return {
    ...report,
    date: toDate(report.reported_at),
    ot: report.work_order_number_snapshot || report.work_order?.ot_number || '',
    client: report.client_snapshot || '',
    description: report.product_snapshot || '',
    operator: report.operator_name_snapshot || report.operator?.name || '',
    shift: report.shift_name_snapshot || report.shift?.name || '',
    status: String(report.lot_status || 'COMPLETE')
      .toUpperCase()
      .includes('PART')
      ? 'Parcial'
      : 'Completo',
    rolls: Number(report.rolls || 0),
    meters: toNumber(report.total_meters) || 0,
    demasiaRolls: Number(report.demasia_rolls || 0),
    demasiaMeters: toNumber(report.demasia_meters) || 0,
    notes: report.notes || '',
    workOrderId: report.work_order_id || null,
  };
}
