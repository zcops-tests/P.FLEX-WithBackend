import { ConflictException } from '@nestjs/common';

const LOCK_TTL_MS = 15 * 60 * 1000;

export function assertReportLockAvailable(
  currentLockUserId: string | null | undefined,
  currentLockAt: Date | string | null | undefined,
  requesterUserId: string,
) {
  if (!currentLockUserId || currentLockUserId === requesterUserId) {
    return;
  }

  const lockTimestamp = currentLockAt ? new Date(currentLockAt).getTime() : 0;
  const isFreshLock = Date.now() - lockTimestamp < LOCK_TTL_MS;

  if (isFreshLock) {
    throw new ConflictException('Report is locked by another user');
  }
}
