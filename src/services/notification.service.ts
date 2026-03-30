import { Injectable, signal } from '@angular/core';

export type NotificationTone = 'success' | 'error' | 'warning' | 'info';
export type ConfirmTone = 'primary' | 'danger';

export interface NotificationOptions {
  title?: string;
  durationMs?: number;
}

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

export interface NotificationToast {
  id: string;
  tone: NotificationTone;
  title: string;
  message: string;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmTone;
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextToastId = 0;
  private readonly toastTimers = new Map<string, number>();
  private readonly toastState = signal<NotificationToast[]>([]);
  private readonly confirmState = signal<ConfirmDialogState | null>(null);

  readonly toasts = this.toastState.asReadonly();
  readonly confirmDialog = this.confirmState.asReadonly();

  showError(message: string, options: NotificationOptions = {}) {
    this.enqueueToast('error', message, {
      title: options.title || 'Operacion no completada',
      durationMs: options.durationMs ?? 5200,
    });
  }

  showWarning(message: string, options: NotificationOptions = {}) {
    this.enqueueToast('warning', message, {
      title: options.title || 'Atencion requerida',
      durationMs: options.durationMs ?? 4600,
    });
  }

  showSuccess(message: string, options: NotificationOptions = {}) {
    this.enqueueToast('success', message, {
      title: options.title || 'Operacion completada',
      durationMs: options.durationMs ?? 3600,
    });
  }

  showInfo(message: string, options: NotificationOptions = {}) {
    this.enqueueToast('info', message, {
      title: options.title || 'Informacion',
      durationMs: options.durationMs ?? 3600,
    });
  }

  confirm(message: string, options: ConfirmOptions = {}) {
    const activeDialog = this.confirmState();
    if (activeDialog) {
      activeDialog.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      this.confirmState.set({
        title: options.title || 'Confirmar accion',
        message,
        confirmLabel: options.confirmLabel || 'Confirmar',
        cancelLabel: options.cancelLabel || 'Cancelar',
        tone: options.tone || 'primary',
        resolve,
      });
    });
  }

  dismissToast(id: string) {
    const timeout = this.toastTimers.get(id);
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
      this.toastTimers.delete(id);
    }

    this.toastState.update((current) => current.filter((toast) => toast.id !== id));
  }

  resolveConfirm(accepted: boolean) {
    const dialog = this.confirmState();
    if (!dialog) return;

    this.confirmState.set(null);
    dialog.resolve(accepted);
  }

  private enqueueToast(tone: NotificationTone, message: string, options: Required<NotificationOptions>) {
    const normalizedMessage = String(message || '').trim();
    if (!normalizedMessage) return;

    const id = `toast-${++this.nextToastId}`;
    const toast: NotificationToast = {
      id,
      tone,
      title: options.title,
      message: normalizedMessage,
    };

    this.toastState.update((current) => [...current, toast]);

    if (options.durationMs > 0) {
      const timeout = window.setTimeout(() => this.dismissToast(id), options.durationMs);
      this.toastTimers.set(id, timeout);
    }
  }
}
