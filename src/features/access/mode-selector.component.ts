import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../../services/state.service';

interface WorkspaceCard {
  id: 'manager' | 'operator';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: string;
  route: string;
  badge: string;
}

@Component({
  selector: 'app-mode-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#050913] text-slate-100 font-sans relative overflow-hidden selection:bg-cyan-400/30">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 left-[-8%] h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl"></div>
        <div class="absolute top-[24%] right-[-8%] h-96 w-96 rounded-full bg-blue-500/15 blur-3xl"></div>
        <div class="absolute bottom-[-10%] left-[28%] h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30"></div>
      </div>

      <div class="relative z-10 min-h-screen flex flex-col">
        <header class="px-6 py-5 md:px-10 border-b border-white/5 bg-slate-950/40 backdrop-blur-xl">
          <div class="mx-auto max-w-6xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-4">
              <button
                type="button"
                (click)="logout()"
                class="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Cerrar sesion">
                <span class="material-icons text-xl">logout</span>
              </button>
              <div>
                <p class="text-[11px] uppercase tracking-[0.22em] text-cyan-300/70">Selector de Entorno</p>
                <h1 class="text-2xl md:text-3xl font-black tracking-tight text-white">P.FLEX Workspace Router</h1>
              </div>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
              <p class="text-[10px] uppercase tracking-[0.18em] text-slate-500">Sesion Anfitriona</p>
              <p class="text-sm font-bold text-white">{{ state.userName() }}</p>
              <p class="text-xs text-slate-400">{{ state.userRole() || 'Acceso autorizado' }} · {{ state.currentShift() || 'Sin turno' }}</p>
            </div>
          </div>
        </header>

        <main class="flex-1 px-6 py-10 md:px-10 md:py-14">
          <div class="mx-auto max-w-6xl space-y-10">
            <section class="max-w-3xl">
              <p class="text-[11px] uppercase tracking-[0.22em] text-slate-500">Enrutamiento de sesion</p>
              <h2 class="mt-3 text-3xl md:text-5xl font-black leading-tight text-white">
                Elige el entorno operativo para esta sesion.
              </h2>
              <p class="mt-4 text-sm md:text-base leading-7 text-slate-300">
                Este acceso ya no duplica el panel del operador. Aqui solo decides si trabajaras en el centro de gestion
                o en la terminal operaria segun los permisos reales de la sesion actual.
              </p>
            </section>

            @if (workspaceCards().length > 0) {
              <section class="grid gap-6 lg:grid-cols-2">
                @for (card of workspaceCards(); track card.id) {
                  <button
                    type="button"
                    (click)="navigate(card.route)"
                    class="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                    <div class="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" [style.background]="card.accent"></div>
                    <div class="relative flex h-full flex-col gap-8">
                      <div class="flex items-start justify-between gap-4">
                        <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60">
                          <span class="material-icons text-3xl text-white">{{ card.icon }}</span>
                        </div>
                        <span class="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                          {{ card.badge }}
                        </span>
                      </div>

                      <div>
                        <p class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{{ card.subtitle }}</p>
                        <h3 class="mt-3 text-2xl font-black text-white">{{ card.title }}</h3>
                        <p class="mt-3 text-sm leading-7 text-slate-300">{{ card.description }}</p>
                      </div>

                      <div class="mt-auto flex items-center justify-between pt-4">
                        <span class="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Abrir entorno</span>
                        <span class="material-icons text-xl text-white transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
                      </div>
                    </div>
                  </button>
                }
              </section>
            } @else {
              <section class="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
                <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Sin entorno disponible</p>
                <p class="mt-3 text-sm leading-7 text-slate-300">
                  La sesion actual no tiene un workspace interactivo asignado. Cierra sesion o revisa la configuracion de permisos.
                </p>
              </section>
            }

            <section class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div class="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-xl">
                <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">Mensaje Operativo</p>
                <p class="mt-3 text-sm leading-7 text-slate-200">
                  {{ state.config().operatorMessage }}
                </p>
              </div>

              <div class="rounded-3xl border border-white/10 bg-slate-950/40 p-5 backdrop-blur-xl">
                <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Disponibilidad</p>
                <div class="mt-4 space-y-3 text-sm">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-300">Centro de gestion</span>
                    <span class="font-bold" [class.text-emerald-400]="state.canAccessManagerWorkspace()" [class.text-slate-500]="!state.canAccessManagerWorkspace()">
                      {{ state.canAccessManagerWorkspace() ? 'Habilitado' : 'Sin acceso' }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-300">Terminal operaria</span>
                    <span class="font-bold" [class.text-emerald-400]="state.canHostOperatorPanel()" [class.text-slate-500]="!state.canHostOperatorPanel()">
                      {{ state.canHostOperatorPanel() ? 'Habilitado' : 'Sin acceso' }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-slate-300">Cambio de entorno</span>
                    <span class="font-bold" [class.text-cyan-400]="state.canSwitchWorkspace()" [class.text-slate-500]="!state.canSwitchWorkspace()">
                      {{ state.canSwitchWorkspace() ? 'Disponible' : 'No aplica' }}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  `,
})
export class ModeSelectorComponent {
  state = inject(StateService);
  router = inject(Router);

  readonly workspaceCards = computed<WorkspaceCard[]>(() => {
    const cards: WorkspaceCard[] = [];

    if (this.state.canAccessManagerWorkspace()) {
      cards.push({
        id: 'manager',
        title: 'Centro de Gestion',
        subtitle: 'Workspace gerencial',
        description:
          'Accede al dashboard, OTs, programacion, reportes y modulos administrativos segun los permisos activos de tu sesion.',
        icon: 'space_dashboard',
        accent: 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(59,130,246,0.05))',
        route: this.state.managerHomeRoute(),
        badge: 'Gestion',
      });
    }

    if (this.state.canHostOperatorPanel()) {
      cards.push({
        id: 'operator',
        title: 'Terminal Operaria',
        subtitle: 'Workspace de captura',
        description:
          'Identifica al operario activo, selecciona el proceso y registra produccion desde la terminal anfitriona.',
        icon: 'precision_manufacturing',
        accent: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,182,212,0.05))',
        route: this.state.homeRoute(),
        badge: 'Operacion',
      });
    }

    return cards;
  });

  navigate(route: string) {
    void this.navigateWithRecovery(route);
  }

  async logout() {
    await this.state.logout();
    this.state.redirectToLogin();
  }

  private async navigateWithRecovery(route: string) {
    try {
      const navigated = await this.router.navigateByUrl(route);
      if (!navigated) {
        this.hardRedirect(route);
      }
    } catch (error: any) {
      const message = String(error?.message || error || '');
      if (
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed') ||
        message.includes('Loading chunk')
      ) {
        this.hardRedirect(route);
        return;
      }

      throw error;
    }
  }

  private hardRedirect(route: string) {
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
    const { origin, pathname, search } = window.location;
    window.location.assign(`${origin}${pathname}${search}#${normalizedRoute}`);
  }
}
