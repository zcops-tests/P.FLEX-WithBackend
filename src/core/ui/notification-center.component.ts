import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationToast } from '../../services/notification.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-end px-4 py-4 sm:px-6">
      <div class="flex w-full max-w-md flex-col gap-3">
        @for (toast of notifications.toasts(); track toast.id) {
          <article
            class="pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl"
            [ngClass]="toastClasses(toast)">
            <div class="flex items-start gap-3 p-4">
              <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/40">
                <span class="material-icons text-lg">{{ toastIcon(toast) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-black uppercase tracking-[0.18em] text-white/75">{{ toast.title }}</p>
                <p class="mt-1 text-sm leading-6 text-slate-100 whitespace-pre-line">{{ toast.message }}</p>
              </div>
              <button
                type="button"
                (click)="notifications.dismissToast(toast.id)"
                class="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Cerrar notificacion">
                <span class="material-icons text-lg">close</span>
              </button>
            </div>
          </article>
        }
      </div>
    </div>

    @if (notifications.confirmDialog(); as dialog) {
      <div class="fixed inset-0 z-[130] flex items-center justify-center p-4">
        <button
          type="button"
          class="absolute inset-0 bg-black/70 backdrop-blur-sm"
          (click)="notifications.resolveConfirm(false)"
          aria-label="Cerrar confirmacion">
        </button>

        <section class="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#07101d]/95 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div class="border-b border-white/10 bg-white/5 px-6 py-5">
            <p class="text-[11px] font-black uppercase tracking-[0.2em]" [class.text-cyan-300]="dialog.tone === 'primary'" [class.text-red-300]="dialog.tone === 'danger'">
              Confirmacion requerida
            </p>
            <h2 class="mt-2 text-2xl font-black text-white">{{ dialog.title }}</h2>
          </div>

          <div class="px-6 py-5">
            <p class="text-sm leading-7 text-slate-200 whitespace-pre-line">{{ dialog.message }}</p>
          </div>

          <div class="flex flex-col-reverse gap-3 border-t border-white/10 bg-white/5 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              (click)="notifications.resolveConfirm(false)"
              class="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
              {{ dialog.cancelLabel }}
            </button>
            <button
              type="button"
              (click)="notifications.resolveConfirm(true)"
              class="rounded-2xl px-5 py-3 text-sm font-black text-slate-950 transition-all"
              [ngClass]="dialog.tone === 'danger'
                ? 'bg-gradient-to-r from-red-400 to-red-500 shadow-[0_12px_30px_rgba(239,68,68,0.3)]'
                : 'bg-gradient-to-r from-cyan-300 to-emerald-300 shadow-[0_12px_30px_rgba(45,212,191,0.22)]'">
              {{ dialog.confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
})
export class NotificationCenterComponent {
  notifications = inject(NotificationService);

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.notifications.confirmDialog()) {
      this.notifications.resolveConfirm(false);
    }
  }

  toastIcon(toast: NotificationToast) {
    switch (toast.tone) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  }

  toastClasses(toast: NotificationToast) {
    switch (toast.tone) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-400/20 text-emerald-100';
      case 'warning':
        return 'bg-amber-500/10 border-amber-400/20 text-amber-100';
      case 'error':
        return 'bg-red-500/10 border-red-400/20 text-red-100';
      default:
        return 'bg-cyan-500/10 border-cyan-400/20 text-cyan-100';
    }
  }
}
