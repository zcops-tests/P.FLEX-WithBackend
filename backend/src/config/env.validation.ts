export interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  REQUEST_BODY_LIMIT_MB: number;
  DATABASE_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRATION: string;
  JWT_REFRESH_EXPIRATION: string;
  AUTH_LOGIN_MAX_ATTEMPTS: number;
  AUTH_LOGIN_LOCK_MINUTES: number;
  AUTH_LOGIN_THROTTLE_LIMIT: number;
  AUTH_LOGIN_THROTTLE_TTL_MS: number;
  AUTH_LOGIN_THROTTLE_BLOCK_MS: number;
  AUTH_REFRESH_THROTTLE_LIMIT: number;
  AUTH_REFRESH_THROTTLE_TTL_MS: number;
  AUTH_REFRESH_THROTTLE_BLOCK_MS: number;
}

function requireString(value: unknown, key: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

function requireNumber(value: unknown, key: string, fallback?: number): number {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Environment variable ${key} is required`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }

  return parsed;
}

export function validateEnv(config: Record<string, unknown>): AppConfig {
  return {
    NODE_ENV:
      typeof config.NODE_ENV === 'string' ? config.NODE_ENV : 'development',
    PORT: requireNumber(config.PORT, 'PORT', 3000),
    REQUEST_BODY_LIMIT_MB: requireNumber(
      config.REQUEST_BODY_LIMIT_MB,
      'REQUEST_BODY_LIMIT_MB',
      25,
    ),
    DATABASE_URL: requireString(config.DATABASE_URL, 'DATABASE_URL'),
    REDIS_HOST:
      typeof config.REDIS_HOST === 'string' && config.REDIS_HOST.trim() !== ''
        ? config.REDIS_HOST
        : 'localhost',
    REDIS_PORT: requireNumber(config.REDIS_PORT, 'REDIS_PORT', 6379),
    JWT_ACCESS_SECRET: requireString(
      config.JWT_ACCESS_SECRET,
      'JWT_ACCESS_SECRET',
    ),
    JWT_REFRESH_SECRET: requireString(
      config.JWT_REFRESH_SECRET,
      'JWT_REFRESH_SECRET',
    ),
    JWT_ACCESS_EXPIRATION:
      typeof config.JWT_ACCESS_EXPIRATION === 'string' &&
      config.JWT_ACCESS_EXPIRATION.trim() !== ''
        ? config.JWT_ACCESS_EXPIRATION
        : '15m',
    JWT_REFRESH_EXPIRATION:
      typeof config.JWT_REFRESH_EXPIRATION === 'string' &&
      config.JWT_REFRESH_EXPIRATION.trim() !== ''
        ? config.JWT_REFRESH_EXPIRATION
        : '7d',
    AUTH_LOGIN_MAX_ATTEMPTS: requireNumber(
      config.AUTH_LOGIN_MAX_ATTEMPTS,
      'AUTH_LOGIN_MAX_ATTEMPTS',
      5,
    ),
    AUTH_LOGIN_LOCK_MINUTES: requireNumber(
      config.AUTH_LOGIN_LOCK_MINUTES,
      'AUTH_LOGIN_LOCK_MINUTES',
      15,
    ),
    AUTH_LOGIN_THROTTLE_LIMIT: requireNumber(
      config.AUTH_LOGIN_THROTTLE_LIMIT,
      'AUTH_LOGIN_THROTTLE_LIMIT',
      12,
    ),
    AUTH_LOGIN_THROTTLE_TTL_MS: requireNumber(
      config.AUTH_LOGIN_THROTTLE_TTL_MS,
      'AUTH_LOGIN_THROTTLE_TTL_MS',
      60000,
    ),
    AUTH_LOGIN_THROTTLE_BLOCK_MS: requireNumber(
      config.AUTH_LOGIN_THROTTLE_BLOCK_MS,
      'AUTH_LOGIN_THROTTLE_BLOCK_MS',
      120000,
    ),
    AUTH_REFRESH_THROTTLE_LIMIT: requireNumber(
      config.AUTH_REFRESH_THROTTLE_LIMIT,
      'AUTH_REFRESH_THROTTLE_LIMIT',
      30,
    ),
    AUTH_REFRESH_THROTTLE_TTL_MS: requireNumber(
      config.AUTH_REFRESH_THROTTLE_TTL_MS,
      'AUTH_REFRESH_THROTTLE_TTL_MS',
      60000,
    ),
    AUTH_REFRESH_THROTTLE_BLOCK_MS: requireNumber(
      config.AUTH_REFRESH_THROTTLE_BLOCK_MS,
      'AUTH_REFRESH_THROTTLE_BLOCK_MS',
      60000,
    ),
  };
}
