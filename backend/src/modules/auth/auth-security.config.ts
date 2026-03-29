import { normalizeDni } from '../../common/utils/dni.util';

export const DUMMY_PASSWORD_HASH =
  '$2b$10$ugMAMRbJPnvjsw/.SbcrGOlUtnCOEieYpooLkpMa.HC7j5kWhLOki';

const DEFAULT_AUTH_LOGIN_MAX_ATTEMPTS = 5;
const DEFAULT_AUTH_LOGIN_LOCK_MINUTES = 15;
const DEFAULT_AUTH_LOGIN_THROTTLE_LIMIT = 12;
const DEFAULT_AUTH_LOGIN_THROTTLE_TTL_MS = 60_000;
const DEFAULT_AUTH_LOGIN_THROTTLE_BLOCK_MS = 120_000;
const DEFAULT_AUTH_REFRESH_THROTTLE_LIMIT = 30;
const DEFAULT_AUTH_REFRESH_THROTTLE_TTL_MS = 60_000;
const DEFAULT_AUTH_REFRESH_THROTTLE_BLOCK_MS = 60_000;

function readPositiveIntegerFromEnv(key: string, fallback: number): number {
  const rawValue = process.env[key];
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

type ThrottleRequestLike = {
  ip?: string;
  socket?: {
    remoteAddress?: string | null;
  };
  body?: {
    username?: string | null;
  };
};

function resolveRequestIp(req: ThrottleRequestLike): string {
  const socketIp = req.socket?.remoteAddress;
  return typeof req.ip === 'string' && req.ip.trim() !== ''
    ? req.ip
    : typeof socketIp === 'string' && socketIp.trim() !== ''
      ? socketIp
      : '0.0.0.0';
}

export function getAuthLoginMaxAttempts(): number {
  return readPositiveIntegerFromEnv(
    'AUTH_LOGIN_MAX_ATTEMPTS',
    DEFAULT_AUTH_LOGIN_MAX_ATTEMPTS,
  );
}

export function getAuthLoginLockMinutes(): number {
  return readPositiveIntegerFromEnv(
    'AUTH_LOGIN_LOCK_MINUTES',
    DEFAULT_AUTH_LOGIN_LOCK_MINUTES,
  );
}

export function getAuthLoginThrottleLimit(): number {
  return readPositiveIntegerFromEnv(
    'AUTH_LOGIN_THROTTLE_LIMIT',
    DEFAULT_AUTH_LOGIN_THROTTLE_LIMIT,
  );
}

export function getAuthLoginThrottleTtlMs(): number {
  return readPositiveIntegerFromEnv(
    'AUTH_LOGIN_THROTTLE_TTL_MS',
    DEFAULT_AUTH_LOGIN_THROTTLE_TTL_MS,
  );
}

export function getAuthLoginThrottleBlockMs(): number {
  return readPositiveIntegerFromEnv(
    'AUTH_LOGIN_THROTTLE_BLOCK_MS',
    DEFAULT_AUTH_LOGIN_THROTTLE_BLOCK_MS,
  );
}

export function getAuthRefreshThrottleLimit(): number {
  return readPositiveIntegerFromEnv(
    'AUTH_REFRESH_THROTTLE_LIMIT',
    DEFAULT_AUTH_REFRESH_THROTTLE_LIMIT,
  );
}

export function getAuthRefreshThrottleTtlMs(): number {
  return readPositiveIntegerFromEnv(
    'AUTH_REFRESH_THROTTLE_TTL_MS',
    DEFAULT_AUTH_REFRESH_THROTTLE_TTL_MS,
  );
}

export function getAuthRefreshThrottleBlockMs(): number {
  return readPositiveIntegerFromEnv(
    'AUTH_REFRESH_THROTTLE_BLOCK_MS',
    DEFAULT_AUTH_REFRESH_THROTTLE_BLOCK_MS,
  );
}

export function buildLoginThrottleTracker(req: ThrottleRequestLike): string {
  const username = normalizeDni(req.body?.username);
  const ipAddress = resolveRequestIp(req);
  return username ? `${ipAddress}:${username}` : ipAddress;
}

export function buildIpThrottleTracker(req: ThrottleRequestLike): string {
  return resolveRequestIp(req);
}
