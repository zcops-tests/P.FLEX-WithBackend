export type ProductionMachineProcess =
  | 'PRINT'
  | 'DIECUT'
  | 'REWIND'
  | 'PACKAGING';

interface MachineAreaSnapshot {
  type?: string | null;
  area?:
    | {
        name?: string | null;
        code?: string | null;
      }
    | null
    | undefined;
}

function normalizeToken(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function resolveProductionMachineProcess(
  machineType?: string | null,
  areaName?: string | null,
  areaCode?: string | null,
): ProductionMachineProcess | null {
  const combined = `${normalizeToken(machineType)} ${normalizeToken(areaName)} ${normalizeToken(areaCode)}`;

  if (combined.includes('TROQ') || combined.includes('DIECUT')) {
    return 'DIECUT';
  }

  if (combined.includes('REBOB') || combined.includes('REWIND')) {
    return 'REWIND';
  }

  if (combined.includes('EMPAQ') || combined.includes('PACK')) {
    return 'PACKAGING';
  }

  if (combined.includes('IMP') || combined.includes('PRINT')) {
    return 'PRINT';
  }

  return null;
}

export function machineSupportsProcess(
  machine: MachineAreaSnapshot | null | undefined,
  expectedProcess: ProductionMachineProcess,
) {
  if (!machine) {
    return false;
  }

  return (
    resolveProductionMachineProcess(
      machine.type,
      machine.area?.name,
      machine.area?.code,
    ) === expectedProcess
  );
}
