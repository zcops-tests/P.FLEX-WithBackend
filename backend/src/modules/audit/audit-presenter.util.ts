import { Prisma } from '@prisma/client';

type AuditJson = Prisma.JsonValue | null | undefined;

export interface AuditRecordLike {
  id: bigint | number | string;
  created_at: Date | string;
  user_name_snapshot?: string | null;
  role_code_snapshot?: string | null;
  entity: string;
  entity_id?: string | null;
  action: string;
  old_values?: AuditJson;
  new_values?: AuditJson;
  ip_address?: string | null;
  correlation_id?: string | null;
}

const ENTITY_LABELS: Record<string, string> = {
  areas: 'areas de produccion',
  auth: 'autenticacion',
  capa_actions: 'acciones CAPA',
  clises: 'cliches',
  contract: 'contrato operativo',
  dies: 'troqueles',
  files: 'archivos',
  incidents: 'incidentes de calidad',
  login: 'inicio de sesion',
  machines: 'maquinas',
  packaging_reports: 'reportes de empaquetado',
  permissions: 'permisos',
  planning_schedules: 'programacion',
  print_reports: 'reportes de impresion',
  rewind_reports: 'reportes de rebobinado',
  roles: 'roles',
  shifts: 'turnos',
  stock_items: 'stock',
  system_config: 'configuracion del sistema',
  user_areas: 'asignaciones de area',
  users: 'usuarios',
  work_orders: 'ordenes de trabajo',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creacion',
  DELETE: 'Eliminacion',
  LOGIN: 'Inicio de sesion',
  LOGIN_FAILED: 'Intento fallido',
  LOGIN_LOCKED: 'Bloqueo de acceso',
  LOGOUT: 'Cierre de sesion',
  LOGOUT_ALL: 'Cierre global',
  REVOKE_SESSION: 'Revocacion',
  UPDATE: 'Actualizacion',
};

const FIELD_LABELS: Record<string, string> = {
  active: 'estado',
  area_id: 'area',
  areaId: 'area',
  assignedAreas: 'areas asignadas',
  autoLogoutMinutes: 'cierre automatico',
  backupFrequency: 'frecuencia de backup',
  code: 'codigo',
  conflictResolutionPolicy: 'politica de conflictos',
  dni: 'dni',
  endTime: 'hora de fin',
  failedLoginAlertMode: 'modo de alerta',
  failedLoginMaxAttempts: 'intentos fallidos maximos',
  maintenanceMessage: 'mensaje de mantenimiento',
  maintenanceModeEnabled: 'modo mantenimiento',
  name: 'nombre',
  offlineRetentionDays: 'retencion offline',
  operatorMessage: 'mensaje al operario',
  ot: 'OT',
  otAllowCloseWithWaste: 'cierre con merma',
  otAllowForcedClose: 'cierre forzado',
  otAllowPartialClose: 'cierre parcial',
  otForcedCloseRequiresReason: 'motivo obligatorio',
  passwordExpiryWarningDays: 'alerta de expiracion',
  passwordPolicyDays: 'politica de contrasenas',
  permissions: 'permisos',
  permissionCodes: 'permisos',
  plantName: 'nombre de planta',
  productionAssistantMessage: 'mensaje a produccion',
  reason: 'motivo',
  role: 'rol',
  roleCode: 'rol',
  shiftName1: 'turno T1',
  shiftName2: 'turno T2',
  shiftTime1: 'inicio T1',
  shiftTime2: 'inicio T2',
  shiftEndTime1: 'fin T1',
  shiftEndTime2: 'fin T2',
  startTime: 'hora de inicio',
  timezoneName: 'zona horaria',
  username: 'usuario',
};

export function presentAuditLog(item: AuditRecordLike) {
  const entity = normalizeEntity(item.entity);
  const action = normalizeAction(item.action);
  const payload = toRecord(item.new_values) ?? toRecord(item.old_values);
  const entityId = normalizeEntityId(item.entity_id);
  const target = resolveTargetLabel(entity, action, entityId, payload);
  const summary = buildSummary(action, target);

  return {
    id: String(item.id),
    timestamp: item.created_at,
    createdAt: item.created_at,
    user: item.user_name_snapshot || 'Sistema',
    role: item.role_code_snapshot || 'N/A',
    module: entity.toUpperCase(),
    moduleLabel: toTitleCase(ENTITY_LABELS[entity] || entity.replace(/_/g, ' ')),
    entityId,
    action,
    actionLabel: ACTION_LABELS[action] || toTitleCase(action.toLowerCase()),
    summary,
    target,
    details: buildDetails(action, entityId, payload, item.old_values),
    ip: item.ip_address || 'N/A',
    correlationId: item.correlation_id || null,
  };
}

function normalizeEntity(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

function normalizeAction(value: string): string {
  const action = String(value || '').trim().toUpperCase();
  const methodMap: Record<string, string> = {
    PATCH: 'UPDATE',
    POST: 'CREATE',
    PUT: 'UPDATE',
  };
  return methodMap[action] || action;
}

function normalizeEntityId(value?: string | null): string | null {
  const normalized = String(value || '').trim();
  if (!normalized || normalized.toLowerCase() === 'unknown') {
    return null;
  }
  return normalized;
}

function toRecord(value: AuditJson): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function resolveTargetLabel(
  entity: string,
  action: string,
  entityId: string | null,
  payload: Record<string, unknown> | null,
): string {
  if (action === 'LOGIN') return 'su acceso al sistema';
  if (action === 'LOGOUT') return 'su sesion actual';
  if (action === 'LOGOUT_ALL') return 'todas sus sesiones';
  if (action === 'REVOKE_SESSION') return 'una sesion activa';
  if (action === 'LOGIN_FAILED') {
    return describeLoginTarget(payload, entityId);
  }
  if (action === 'LOGIN_LOCKED') {
    return `${describeLoginTarget(payload, entityId)} por seguridad`;
  }

  if (entity === 'system_config' || entity === 'contract') {
    return describeConfigTarget(payload);
  }

  if (entity === 'auth') {
    const username = firstMeaningfulValue(payload, ['username', 'name']);
    return username ? `la autenticacion del usuario ${username}` : 'un evento de autenticacion';
  }

  if (entity === 'login') {
    return 'un inicio de sesion';
  }

  if (entity === 'users' || entity === 'user_areas') {
    const label = firstMeaningfulValue(payload, ['name', 'username']);
    if (label) {
      return `el usuario ${label}`;
    }
    if (entityId) {
      return `el usuario ${shortId(entityId)}`;
    }
    return entity === 'user_areas' ? 'las areas de un usuario' : 'un usuario';
  }

  if (entity === 'roles') {
    const label = firstMeaningfulValue(payload, ['name', 'code']);
    return label ? `el rol ${label}` : 'un rol';
  }

  if (entity === 'areas') {
    const label = firstMeaningfulValue(payload, ['name', 'code']);
    return label ? `el area ${label}` : 'un area';
  }

  if (entity === 'machines') {
    const label = firstMeaningfulValue(payload, ['name', 'code']);
    return label ? `la maquina ${label}` : 'una maquina';
  }

  if (entity === 'shifts') {
    const label = firstMeaningfulValue(payload, ['name', 'code']);
    return label ? `el turno ${label}` : 'un turno';
  }

  if (entity === 'work_orders') {
    const ot = firstMeaningfulValue(payload, ['ot', 'OT', 'otNumber']);
    if (ot) return `la OT ${ot}`;
    if (entityId) return `la OT ${shortId(entityId)}`;
    return 'una orden de trabajo';
  }

  if (entity.endsWith('_reports')) {
    const ot = firstMeaningfulValue(payload, ['ot', 'OT', 'otNumber']);
    if (ot) return `el reporte de la OT ${ot}`;
    if (entityId) return `el reporte ${shortId(entityId)}`;
    return 'un reporte de produccion';
  }

  if (entity === 'clises') {
    const label = firstMeaningfulValue(payload, ['code', 'name', 'serie']);
    return label ? `el cliche ${label}` : 'un cliche';
  }

  if (entity === 'dies') {
    const label = firstMeaningfulValue(payload, ['code', 'name', 'serie']);
    return label ? `el troquel ${label}` : 'un troquel';
  }

  if (entity === 'stock_items') {
    const label = firstMeaningfulValue(payload, ['code', 'name', 'sku']);
    return label ? `el item ${label}` : 'un item de stock';
  }

  if (entity === 'incidents') {
    const label = firstMeaningfulValue(payload, ['code', 'title', 'name']);
    return label ? `el incidente ${label}` : 'un incidente';
  }

  if (entity === 'capa_actions') {
    const label = firstMeaningfulValue(payload, ['title', 'name', 'code']);
    return label ? `la accion ${label}` : 'una accion CAPA';
  }

  if (entityId) {
    return `${ENTITY_LABELS[entity] || entity.replace(/_/g, ' ')} ${shortId(entityId)}`;
  }

  return `un registro de ${ENTITY_LABELS[entity] || entity.replace(/_/g, ' ')}`;
}

function describeConfigTarget(payload: Record<string, unknown> | null): string {
  const keys = payload ? Object.keys(payload) : [];

  if (!keys.length) {
    return 'la configuracion general';
  }
  if (keys.every((key) => key.startsWith('shift'))) {
    return 'la configuracion de turnos';
  }
  if (keys.every((key) => key.startsWith('ot'))) {
    return 'las reglas de cierre de OT';
  }
  if (keys.every((key) => key.startsWith('failedLogin') || key.startsWith('password'))) {
    return 'las politicas de seguridad';
  }
  if (
    keys.every(
      (key) =>
        key === 'offlineRetentionDays' ||
        key === 'backupFrequency' ||
        key === 'conflictResolutionPolicy',
    )
  ) {
    return 'las reglas de sincronizacion';
  }
  return 'la configuracion del contrato operativo';
}

function describeLoginTarget(
  payload: Record<string, unknown> | null,
  entityId: string | null,
): string {
  const username = firstMeaningfulValue(payload, ['username', 'name']);
  if (username) return `el usuario ${username}`;
  if (entityId) return `el usuario ${shortId(entityId)}`;
  return 'un usuario';
}

function buildSummary(action: string, target: string): string {
  const verbByAction: Record<string, string> = {
    CREATE: 'Creo',
    DELETE: 'Elimino',
    LOGIN: 'Inicio sesion en',
    LOGIN_FAILED: 'Registro un intento fallido de acceso para',
    LOGIN_LOCKED: 'Bloqueo el acceso de',
    LOGOUT: 'Cerro sesion en',
    LOGOUT_ALL: 'Cerro',
    REVOKE_SESSION: 'Revoco',
    UPDATE: 'Actualizo',
  };

  const verb = verbByAction[action] || 'Ejecuto cambios sobre';
  return `${verb} ${target}`.trim();
}

function buildDetails(
  action: string,
  entityId: string | null,
  payload: Record<string, unknown> | null,
  oldValues: AuditJson,
): string {
  const details: string[] = [];

  if (entityId && entityId !== 'GLOBAL') {
    details.push(`ID ${shortId(entityId)}`);
  }

  const changedFields = payload
    ? Object.keys(payload)
        .map((key) => FIELD_LABELS[key] || humanizeKey(key))
        .filter((value, index, list) => Boolean(value) && list.indexOf(value) === index)
        .slice(0, 4)
    : [];

  if (changedFields.length) {
    details.push(`Campos: ${changedFields.join(', ')}`);
  } else if (toRecord(oldValues)) {
    details.push('Incluye estado previo');
  }

  if (action === 'LOGIN_FAILED' || action === 'LOGIN_LOCKED') {
    const reason = firstMeaningfulValue(payload, ['reason']);
    if (reason) {
      details.push(`Motivo: ${humanizeReason(reason)}`);
    }
  }

  return details.join(' | ') || 'Sin detalle adicional';
}

function firstMeaningfulValue(
  payload: Record<string, unknown> | null,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = payload?.[key];
    const normalized = String(value ?? '').trim();
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
}

function humanizeReason(reason: string): string {
  return String(reason)
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
}

function shortId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
