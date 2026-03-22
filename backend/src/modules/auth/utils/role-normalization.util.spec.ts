import { getRoleCapabilities, hasRequiredRole, normalizeRoleName } from './role-normalization.util';

describe('role-normalization.util', () => {
  it('normalizes legacy backend role codes into frontend roles', () => {
    expect(normalizeRoleName('ADMIN')).toBe('Sistemas');
    expect(normalizeRoleName('PLANNER')).toBe('Asistente');
    expect(normalizeRoleName('WAREHOUSE')).toBe('Encargado');
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
      'Asistente',
      'Operario',
      'Encargado',
    ]);

    expect(getRoleCapabilities('Jefatura')).toEqual([
      'Jefatura',
      'Supervisor',
      'Asistente',
      'Operario',
      'Encargado',
    ]);
  });

  it('matches required roles using normalized capabilities', () => {
    expect(hasRequiredRole('Sistemas', ['ADMIN'])).toBe(true);
    expect(hasRequiredRole('Jefatura', ['SUPERVISOR'])).toBe(true);
    expect(hasRequiredRole('Supervisor', ['OPERARIO'])).toBe(true);
    expect(hasRequiredRole('Operario', ['SUPERVISOR'])).toBe(false);
  });
});
