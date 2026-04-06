import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import { StateService } from '../../../services/state.service';
import { ConfigAuditPreviewItem, SystemConfig } from '../models/admin.models';
import { AdminService } from '../services/admin.service';

const BACKUP_FREQUENCY_OPTIONS = [
  { value: 'HOURLY', label: 'Cada 1 Hora' },
  { value: 'EVERY_4_HOURS', label: 'Cada 4 Horas' },
  { value: 'DAILY', label: 'Diario' },
] as const;

const CONFLICT_RESOLUTION_OPTIONS = [
  { value: 'SERVER_WINS', label: 'Servidor gana' },
  { value: 'CLIENT_WINS', label: 'Dispositivo gana' },
  { value: 'MANUAL_REVIEW', label: 'Manual' },
] as const;

const FAILED_LOGIN_ALERT_OPTIONS = [
  { value: 'AUDIT_ONLY', label: 'Solo auditoría' },
  { value: 'NOTIFY_AND_AUDIT', label: 'Notificar y auditar' },
] as const;

type ConfigOptionValue<TOptions extends readonly { value: string }[]> =
  TOptions[number]['value'];

type BackupFrequencyValue = ConfigOptionValue<typeof BACKUP_FREQUENCY_OPTIONS>;
type ConflictResolutionValue =
  ConfigOptionValue<typeof CONFLICT_RESOLUTION_OPTIONS>;
type FailedLoginAlertValue =
  ConfigOptionValue<typeof FAILED_LOGIN_ALERT_OPTIONS>;

@Component({
  selector: 'app-admin-config',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <section class="glassmorphism-card rounded-3xl overflow-hidden bg-white/5 border border-white/10 shadow-lg backdrop-blur-md">
        <div class="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-industrial-orange/10 border border-industrial-orange/20">
              <span class="material-symbols-outlined text-industrial-orange">factory</span>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white">Configuración de Planta</h3>
              <p class="text-xs text-slate-400 uppercase tracking-[0.24em] mt-1">Contrato operativo</p>
            </div>
          </div>
          <span class="px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
            {{ tempConfig.plantName || 'Planta configurada' }}
          </span>
        </div>

        <div class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="space-y-2">
              <span class="field-label">Nombre de Planta</span>
              <input
                [(ngModel)]="tempConfig.plantName"
                class="field-input"
                type="text"
                placeholder="Nombre visible de planta"
              />
            </label>
            <label class="space-y-2">
              <span class="field-label">Zona Horaria</span>
              <input
                [(ngModel)]="tempConfig.timezoneName"
                class="field-input"
                type="text"
                placeholder="America/Lima"
              />
            </label>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="space-y-2">
              <span class="field-label">Cierre Automático</span>
              <div class="relative">
                <input [(ngModel)]="tempConfig.autoLogoutMinutes" class="field-input pr-14" type="number" min="5" />
                <span class="unit-badge">min</span>
              </div>
            </label>
            <label class="space-y-2">
              <span class="field-label">Advertencia de Expiración</span>
              <div class="relative">
                <input [(ngModel)]="tempConfig.passwordExpiryWarningDays" class="field-input pr-14" type="number" min="1" />
                <span class="unit-badge">días</span>
              </div>
            </label>
          </div>

          <div class="rounded-2xl border border-white/10 bg-[#0f172a]/90 p-4 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-sm font-semibold text-white">Turnos Activos</h4>
                <p class="text-xs text-slate-400">Configura nombre, inicio y fin de T1 y T2.</p>
              </div>
              <span class="text-[10px] uppercase tracking-[0.2em] text-slate-500">2 turnos fijos</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">T1</span>
                  <span class="text-[10px] uppercase tracking-wider text-slate-500">Turno base</span>
                </div>
                <input [(ngModel)]="tempConfig.shiftName1" class="field-input" type="text" placeholder="Nombre del turno" />
                <div class="grid grid-cols-2 gap-3">
                  <label class="space-y-1">
                    <span class="field-mini">Inicio</span>
                    <input [(ngModel)]="tempConfig.shiftTime1" class="field-input" type="time" />
                  </label>
                  <label class="space-y-1">
                    <span class="field-mini">Fin</span>
                    <input [(ngModel)]="tempConfig.shiftEndTime1" class="field-input" type="time" />
                  </label>
                </div>
              </div>

              <div class="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">T2</span>
                  <span class="text-[10px] uppercase tracking-wider text-slate-500">Turno base</span>
                </div>
                <input [(ngModel)]="tempConfig.shiftName2" class="field-input" type="text" placeholder="Nombre del turno" />
                <div class="grid grid-cols-2 gap-3">
                  <label class="space-y-1">
                    <span class="field-mini">Inicio</span>
                    <input [(ngModel)]="tempConfig.shiftTime2" class="field-input" type="time" />
                  </label>
                  <label class="space-y-1">
                    <span class="field-mini">Fin</span>
                    <input [(ngModel)]="tempConfig.shiftEndTime2" class="field-input" type="time" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-sm font-semibold text-white">Modo Mantenimiento</h4>
                <p class="text-xs text-slate-400">Bloquea el acceso general y solo permite ingreso al rol SISTEMAS durante mantenimiento.</p>
              </div>
              <button
                type="button"
                (click)="tempConfig.maintenanceModeEnabled = !tempConfig.maintenanceModeEnabled"
                class="relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-200"
                [ngClass]="tempConfig.maintenanceModeEnabled ? 'border-amber-400/40 bg-amber-500/20' : 'border-white/10 bg-white/5'"
              >
                <span
                  class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-all duration-200"
                  [ngClass]="tempConfig.maintenanceModeEnabled ? 'translate-x-8 bg-amber-300' : 'translate-x-1'"
                ></span>
              </button>
            </div>
            <textarea
              [(ngModel)]="tempConfig.maintenanceMessage"
              rows="3"
              class="field-textarea"
              placeholder="Mensaje que verán los usuarios cuando el sistema entre en mantenimiento."
            ></textarea>
          </div>
        </div>
      </section>

      <section class="glassmorphism-card rounded-3xl overflow-hidden bg-white/5 border border-white/10 shadow-lg backdrop-blur-md">
        <div class="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center gap-3">
          <div class="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <span class="material-symbols-outlined text-primary">cloud_sync</span>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white">Sincronización y Seguridad</h3>
            <p class="text-xs text-slate-400 uppercase tracking-[0.24em] mt-1">Persistencia real</p>
          </div>
        </div>

        <div class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="space-y-2">
              <span class="field-label">Frecuencia de Backup</span>
              <select [(ngModel)]="tempConfig.backupFrequency" class="field-input">
                <option *ngFor="let option of backupFrequencyOptions" [value]="option.value">{{ option.label }}</option>
              </select>
            </label>
            <label class="space-y-2">
              <span class="field-label">Retención Offline</span>
              <div class="relative">
                <input [(ngModel)]="tempConfig.offlineRetentionDays" class="field-input pr-14" type="number" min="1" />
                <span class="unit-badge">días</span>
              </div>
            </label>
          </div>

          <label class="space-y-2">
            <span class="field-label">Política de Conflictos</span>
            <select [(ngModel)]="tempConfig.conflictResolutionPolicy" class="field-input">
              <option *ngFor="let option of conflictResolutionOptions" [value]="option.value">{{ option.label }}</option>
            </select>
          </label>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="space-y-2">
              <span class="field-label">Caducidad de Contraseñas</span>
              <div class="relative">
                <input [(ngModel)]="tempConfig.passwordPolicyDays" class="field-input pr-14" type="number" min="30" />
                <span class="unit-badge">días</span>
              </div>
            </label>
            <label class="space-y-2">
              <span class="field-label">Intentos Fallidos</span>
              <div class="relative">
                <input [(ngModel)]="tempConfig.failedLoginMaxAttempts" class="field-input pr-14" type="number" min="1" />
                <span class="unit-badge">max</span>
              </div>
            </label>
          </div>

          <label class="space-y-2">
            <span class="field-label">Modo de Alerta por Intentos Fallidos</span>
            <select [(ngModel)]="tempConfig.failedLoginAlertMode" class="field-input">
              <option *ngFor="let option of failedLoginAlertOptions" [value]="option.value">{{ option.label }}</option>
            </select>
          </label>

          <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <h4 class="text-sm font-semibold text-white">Mensajes Operativos</h4>
            <textarea [(ngModel)]="tempConfig.operatorMessage" rows="2" class="field-textarea" placeholder="Mensaje visible en terminales de operarios."></textarea>
            <textarea [(ngModel)]="tempConfig.productionAssistantMessage" rows="2" class="field-textarea" placeholder="Mensaje global para Asistente de Producción."></textarea>
            <textarea [(ngModel)]="tempConfig.finishingManagerMessage" rows="2" class="field-textarea" placeholder="Mensaje global para Troquelado y Rebobinado."></textarea>
            <textarea [(ngModel)]="tempConfig.managementMessage" rows="2" class="field-textarea" placeholder="Mensaje global para Jefatura o gestión."></textarea>
          </div>
        </div>
      </section>

      <section class="xl:col-span-2 glassmorphism-card rounded-3xl overflow-hidden bg-white/5 border border-white/10 shadow-lg backdrop-blur-md">
        <div class="px-6 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <span class="material-symbols-outlined text-red-400">security</span>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white">Auditoría y Cierre OT</h3>
              <p class="text-xs text-slate-400 uppercase tracking-[0.24em] mt-1">Datos reales del backend</p>
            </div>
          </div>
          <button
            type="button"
            (click)="goToAudit()"
            class="px-4 py-2 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-[0.22em] hover:bg-primary/15 hover:text-blue-300 transition-colors"
          >
            Ver Logs Completos
          </button>
        </div>

        <div class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <label class="toggle-card">
              <span class="field-label">Permitir cierre parcial</span>
              <input [(ngModel)]="tempConfig.otAllowPartialClose" type="checkbox" />
            </label>
            <label class="toggle-card">
              <span class="field-label">Permitir cierre con merma</span>
              <input [(ngModel)]="tempConfig.otAllowCloseWithWaste" type="checkbox" />
            </label>
            <label class="toggle-card">
              <span class="field-label">Permitir cierre forzado</span>
              <input [(ngModel)]="tempConfig.otAllowForcedClose" type="checkbox" />
            </label>
            <label class="toggle-card">
              <span class="field-label">Motivo obligatorio</span>
              <input [(ngModel)]="tempConfig.otForcedCloseRequiresReason" type="checkbox" />
            </label>
          </div>

          <div class="rounded-2xl border border-white/10 bg-[#0f172a]/85 overflow-hidden">
            <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h4 class="text-sm font-semibold text-white">Última Actividad de Auditoría</h4>
              <span class="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {{ auditPreview().length }} registros
              </span>
            </div>

            <div *ngIf="auditPreview().length; else emptyAudit" class="divide-y divide-white/5">
              <div *ngFor="let log of auditPreview()" class="px-4 py-3 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1fr] gap-3 hover:bg-white/[0.03] transition-colors">
                <div>
                  <p class="text-sm font-semibold text-white">{{ log.user || 'Sistema' }}</p>
                  <p class="text-xs text-slate-500 uppercase tracking-[0.18em]">{{ log.role || 'N/A' }}</p>
                </div>
                <div>
                  <p class="text-sm text-slate-200">{{ log.summary }}</p>
                  <p class="text-xs text-slate-500">{{ log.target }}</p>
                </div>
                <div class="lg:text-right">
                  <p class="text-sm text-slate-300">{{ log.createdAt | date:'dd/MM/yyyy HH:mm' }}</p>
                  <p class="text-xs text-slate-500">{{ log.details }}</p>
                </div>
              </div>
            </div>

            <ng-template #emptyAudit>
              <div class="px-4 py-8 text-center text-sm text-slate-400">
                No hay registros recientes disponibles para esta configuración.
              </div>
            </ng-template>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div>
              <p class="text-sm font-medium text-white">
                {{ isSaving ? 'Guardando cambios...' : 'Contrato listo para persistir' }}
              </p>
              <p class="text-xs text-slate-500">
                El guardado usa system-config/contract y mantiene sincronizados system_config, T1 y T2.
              </p>
            </div>

            <button
              type="button"
              (click)="saveConfig()"
              [disabled]="isSaving"
              class="flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-button-gradient text-white font-semibold shadow-glow transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-outlined">{{ isSaving ? 'progress_activity' : 'save' }}</span>
              {{ isSaving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .field-label {
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgb(148 163 184);
      }

      .field-mini {
        display: block;
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgb(100 116 139);
      }

      .field-input,
      .field-textarea {
        width: 100%;
        border-radius: 0.95rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(15, 23, 42, 0.92);
        color: white;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }

      .field-input {
        padding: 0.78rem 0.95rem;
        font-size: 0.9rem;
      }

      .field-textarea {
        min-height: 4.5rem;
        padding: 0.9rem 1rem;
        font-size: 0.9rem;
        resize: vertical;
      }

      .field-input:focus,
      .field-textarea:focus {
        border-color: rgba(59, 130, 246, 0.5);
        box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.18), 0 0 24px rgba(59, 130, 246, 0.08);
        background: rgba(15, 23, 42, 1);
      }

      .unit-badge {
        position: absolute;
        right: 0.85rem;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgb(148 163 184);
      }

      .toggle-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem;
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
      }

      .toggle-card input[type='checkbox'] {
        width: 1rem;
        height: 1rem;
        accent-color: #3b82f6;
      }

      .bg-button-gradient {
        background-image: linear-gradient(135deg, #0ea5e9, #3b82f6 55%, #2563eb);
      }

      .shadow-glow {
        box-shadow: 0 0 24px rgba(59, 130, 246, 0.22);
      }
    `,
  ],
})
export class AdminConfigComponent {
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly state = inject(StateService);
  readonly adminService = inject(AdminService);
  readonly backupFrequencyOptions = BACKUP_FREQUENCY_OPTIONS;
  readonly conflictResolutionOptions = CONFLICT_RESOLUTION_OPTIONS;
  readonly failedLoginAlertOptions = FAILED_LOGIN_ALERT_OPTIONS;

  tempConfig: SystemConfig = this.cloneConfig(this.adminService.config());
  isSaving = false;
  private lastSyncedConfig: SystemConfig = this.cloneConfig(this.adminService.config());

  readonly auditPreview = computed<ConfigAuditPreviewItem[]>(() =>
    this.state.systemConfigContract()?.audit_preview || [],
  );
  private readonly syncDraftWithContract = effect(() => {
    const nextConfig = this.cloneConfig(this.adminService.config());
    const shouldHydrateDraft = !this.isDraftDirty();

    this.lastSyncedConfig = nextConfig;
    if (shouldHydrateDraft) {
      this.tempConfig = this.cloneConfig(nextConfig);
    }
  });

  async saveConfig() {
    if (this.isSaving) return;

    const validationError = this.validateConfig(this.tempConfig);
    if (validationError) {
      this.notifications.showWarning(validationError);
      return;
    }

    this.isSaving = true;
    try {
      await this.adminService.updateConfig(this.tempConfig);
      this.tempConfig = this.cloneConfig(this.adminService.config());
      this.lastSyncedConfig = this.cloneConfig(this.adminService.config());
      this.notifications.showSuccess('La configuración se guardó correctamente.');
    } catch (error: any) {
      this.tempConfig = this.cloneConfig(this.adminService.config());
      this.lastSyncedConfig = this.cloneConfig(this.adminService.config());
      this.notifications.showError(
        error?.message || 'No se pudo guardar la configuración. Se recargó el estado real.',
      );
    } finally {
      this.isSaving = false;
    }
  }

  async goToAudit() {
    try {
      const navigated = await this.router.navigate(['/audit']);
      if (!navigated) {
        this.notifications.showError(
          'No fue posible abrir la pantalla de auditoría.',
        );
      }
    } catch {
      this.notifications.showError(
        'No fue posible abrir la pantalla de auditoría.',
      );
    }
  }

  private isDraftDirty() {
    return (
      this.createConfigFingerprint(this.tempConfig) !==
      this.createConfigFingerprint(this.lastSyncedConfig)
    );
  }

  private cloneConfig(config: SystemConfig): SystemConfig {
    return {
      ...config,
      backupFrequency: this.normalizeBackupFrequency(config.backupFrequency),
      conflictResolutionPolicy: this.normalizeConflictResolutionPolicy(
        config.conflictResolutionPolicy,
      ),
      failedLoginAlertMode: this.normalizeFailedLoginAlertMode(
        config.failedLoginAlertMode,
      ),
    };
  }

  private createConfigFingerprint(config: SystemConfig) {
    return JSON.stringify({
      ...config,
      plantName: String(config.plantName || '').trim(),
      timezoneName: String(config.timezoneName || '').trim(),
      maintenanceMessage: String(config.maintenanceMessage || '').trim(),
      operatorMessage: String(config.operatorMessage || '').trim(),
      productionAssistantMessage: String(
        config.productionAssistantMessage || '',
      ).trim(),
      finishingManagerMessage: String(
        config.finishingManagerMessage || '',
      ).trim(),
      managementMessage: String(config.managementMessage || '').trim(),
      shiftName1: String(config.shiftName1 || '').trim(),
      shiftName2: String(config.shiftName2 || '').trim(),
      shiftTime1: String(config.shiftTime1 || '').trim(),
      shiftEndTime1: String(config.shiftEndTime1 || '').trim(),
      shiftTime2: String(config.shiftTime2 || '').trim(),
      shiftEndTime2: String(config.shiftEndTime2 || '').trim(),
      backupFrequency: this.normalizeBackupFrequency(config.backupFrequency),
      conflictResolutionPolicy: this.normalizeConflictResolutionPolicy(
        config.conflictResolutionPolicy,
      ),
      failedLoginAlertMode: this.normalizeFailedLoginAlertMode(
        config.failedLoginAlertMode,
      ),
    });
  }

  private validateConfig(config: SystemConfig) {
    if (!String(config.plantName || '').trim()) {
      return 'Ingresa el nombre visible de la planta.';
    }

    if (!this.isValidTime(config.shiftTime1) || !this.isValidTime(config.shiftEndTime1)) {
      return 'Define una hora válida para inicio y fin del turno T1.';
    }

    if (!this.isValidTime(config.shiftTime2) || !this.isValidTime(config.shiftEndTime2)) {
      return 'Define una hora válida para inicio y fin del turno T2.';
    }

    if (!String(config.shiftName1 || '').trim() || !String(config.shiftName2 || '').trim()) {
      return 'Asigna un nombre a los turnos T1 y T2 antes de guardar.';
    }

    if (!Number.isInteger(config.autoLogoutMinutes) || config.autoLogoutMinutes < 5 || config.autoLogoutMinutes > 1440) {
      return 'El cierre automático debe estar entre 5 y 1440 minutos.';
    }

    if (!Number.isInteger(config.passwordExpiryWarningDays) || config.passwordExpiryWarningDays < 1) {
      return 'La advertencia de expiración debe ser de al menos 1 día.';
    }

    if (!Number.isInteger(config.passwordPolicyDays) || config.passwordPolicyDays < 30) {
      return 'La caducidad de contraseñas debe ser de al menos 30 días.';
    }

    if (!Number.isInteger(config.offlineRetentionDays) || config.offlineRetentionDays < 1) {
      return 'La retención offline debe ser de al menos 1 día.';
    }

    if (!Number.isInteger(config.failedLoginMaxAttempts) || config.failedLoginMaxAttempts < 1 || config.failedLoginMaxAttempts > 20) {
      return 'Los intentos fallidos deben estar entre 1 y 20.';
    }

    return '';
  }

  private isValidTime(value: unknown) {
    return /^\d{2}:\d{2}$/.test(String(value || '').trim());
  }

  private normalizeBackupFrequency(value: unknown): BackupFrequencyValue {
    const normalized = String(value || '').trim().toUpperCase();
    return this.backupFrequencyOptions.some((option) => option.value === normalized)
      ? (normalized as BackupFrequencyValue)
      : 'DAILY';
  }

  private normalizeConflictResolutionPolicy(
    value: unknown,
  ): ConflictResolutionValue {
    const normalized = String(value || '').trim().toUpperCase();
    return this.conflictResolutionOptions.some(
      (option) => option.value === normalized,
    )
      ? (normalized as ConflictResolutionValue)
      : 'MANUAL_REVIEW';
  }

  private normalizeFailedLoginAlertMode(value: unknown): FailedLoginAlertValue {
    const normalized = String(value || '').trim().toUpperCase();
    return this.failedLoginAlertOptions.some((option) => option.value === normalized)
      ? (normalized as FailedLoginAlertValue)
      : 'AUDIT_ONLY';
  }
}
