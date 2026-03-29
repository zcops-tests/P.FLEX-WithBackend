import {
  getRoleCapabilities,
  hasRequiredRole,
  normalizeRoleName,
} from './role-normalization.util';

describe('role-normalization.util', () => {
  it('normalizes legacy backend role codes into frontend roles', () => {
    expect(normalizeRoleName('ADMIN')).toBe('Sistemas');
    expect(normalizeRoleName('PLANNER')).toBe('Asistente');
    expect(normalizeRoleName('WAREHOUSE')).toBe(
      'Encargado de Clisés, Troqueles y Tintas',
    );
    expect(normalizeRoleName('QUALITY_MANAGER')).toBe('Jefe de Calidad');
    expect(normalizeRoleName('AUDITOR')).toBe('Auditor');
  });

  it('preserves frontend role names as canonical values', () => {
    expect(normalizeRoleName('Supervisor')).toBe('Supervisor');
    expect(normalizeRoleName('Sistemas')).toBe('Sistemas');
    expect(normalizeRoleName('Jefatura')).toBe('Jefatura');
  });

  it('expands managerial roles into their supported capabilities', () => {
    expect(getRoleCapabilities('Sistemas')).toEqual([
      'Sistemas',
      'Jefatura',
      'Supervisor',
      'Operario',
      'Asistente',
      'Asistente de Producción',
      'Encargado de Clisés, Troqueles y Tintas',
      'Encargado de Clisés y Troqueles',
      'Encargado de Tintas',
      'Encargado de Troquelado y Rebobinado',
      'Jefe de Calidad',
      'Auditor',
    ]);

    expect(getRoleCapabilities('Asistente de Producción')).toEqual([
      'Asistente de Producción',
      'Asistente',
      'Operario',
    ]);
  });

  it('matches required roles using normalized capabilities', () => {
    expect(hasRequiredRole('Sistemas', ['ADMIN'])).toBe(true);
    expect(hasRequiredRole('Supervisor', ['OPERARIO'])).toBe(true);
    expect(hasRequiredRole('Asistente de Producción', ['PLANNER'])).toBe(true);
    expect(hasRequiredRole('Operario', ['SUPERVISOR'])).toBe(false);
    expect(hasRequiredRole('Auditor', ['SUPERVISOR'])).toBe(false);
  });
});
