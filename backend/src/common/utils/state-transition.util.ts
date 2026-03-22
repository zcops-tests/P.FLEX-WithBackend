import { ConflictException } from '@nestjs/common';

export function assertAllowedTransition(
  currentStatus: string,
  nextStatus: string,
  allowedTransitions: Record<string, string[]>,
  entityLabel = 'Transition',
) {
  if (allowedTransitions[currentStatus]?.includes(nextStatus)) {
    return;
  }

  throw new ConflictException(`${entityLabel} from ${currentStatus} to ${nextStatus} is not allowed`);
}
