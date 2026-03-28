import { BadRequestException } from '@nestjs/common';

export const DNI_REGEX = /^\d{8,}$/;

export function normalizeDni(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .replace(/\D/g, '');
}

export function isValidDni(value: string | null | undefined): boolean {
  return DNI_REGEX.test(normalizeDni(value));
}

export function assertValidDni(value: string | null | undefined, fieldLabel = 'DNI'): string {
  const normalized = normalizeDni(value);
  if (!DNI_REGEX.test(normalized)) {
    throw new BadRequestException(`${fieldLabel} debe contener al menos 8 digitos numericos.`);
  }
  return normalized;
}
