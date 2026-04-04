
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StateService, Shift } from '../../services/state.service';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="h-screen w-full overflow-hidden flex font-sans antialiased selection:bg-primary selection:text-white bg-background-dark text-slate-200">
      
      <!-- Background & Overlay -->
      <div class="absolute inset-0 z-0">
        <img alt="Industrial factory interior blurred" class="w-full h-full object-cover object-center opacity-60 grayscale brightness-75" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_I2K26LEAIDL40CaaDkYrDMdYzWK6fix6B6EpIhQn40d2IGTUN_9YRJjnn7bqC8Q0qklvZj48-uOC1VML799bLeR_dXhN4siuq-dYXMzzBKSLKy9hO4ydYymT1cy8U6_HEIzU7siOZMJn6dstzIpU2p0zB9Pg2LD6fgZ1Mog4cSZRVFgDFKSVGwVE-ZsgM4BWvm9rOHeFN6RIArFSBU3fibvFD3qsA1OQt_sGfb74nb-fnq_0aYcYsVSAPh0gilW5NPMDJ5xQRwA"/>
        <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-slate-900/80 to-blue-900/60 mix-blend-multiply"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"></div>
        <div class="absolute inset-0 scanlines z-10 opacity-30"></div>
      </div>

      <!-- Main Layout -->
      <div class="relative z-20 w-full h-full flex flex-col lg:flex-row">
        
        <!-- Left Panel: Text & Branding -->
        <div class="hidden lg:flex flex-col justify-end p-12 lg:w-5/12 xl:w-1/3 relative">
          <div class="space-y-8 mb-12">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center shadow-lg relative overflow-hidden group">
                <div class="absolute inset-0 bg-blue-500/20 blur-xl group-hover:bg-blue-400/30 transition-all duration-500"></div>
                <span class="material-icons text-blue-400 text-3xl relative z-10">precision_manufacturing</span>
              </div>
              <div class="flex flex-col">
                <h1 class="text-3xl font-bold tracking-tight text-white">
                  P<span class="text-primary">.FLEX</span>
                </h1>
              </div>
            </div>
            <div class="space-y-4 max-w-md">
              <p class="text-slate-300 text-lg leading-relaxed font-light">
                Acceso de alta seguridad para supervisores de planta. Gestión de inventarios y control de producción con resiliencia de red.
              </p>
            </div>
            <div class="flex items-center gap-6 pt-4 border-t border-white/10">
              <div class="flex items-center gap-2 text-green-400 text-sm font-medium">
                <span class="material-icons text-lg">verified_user</span>
                <span>Conexión Encriptada</span>
              </div>
              <div class="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <span class="material-icons text-lg">cloud_off</span>
                <span>Modo Offline Activo</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Form -->
        <div class="flex-1 flex flex-col items-center justify-center p-4 lg:p-12 relative">
          
          <!-- Login Card -->
          <div class="w-full max-w-md glass-panel rounded-2xl p-8 md:p-10 shadow-glass relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-50"></div>
            
            <!-- System Status Badge (Moved Inside) -->
            <div class="flex flex-col items-center gap-2 mb-8">
              <div class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 backdrop-blur-sm">
                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <span class="text-xs font-semibold tracking-wider text-green-400 uppercase">Sistema: En Línea</span>
              </div>
              <span class="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Sincronización de datos persistente habilitada</span>
            </div>

            <div class="mb-8">
              <h2 class="text-3xl font-bold text-white mb-2">Acceso Anfitrión</h2>
              <p class="text-slate-400 text-sm font-medium tracking-wide uppercase">Estación de Trabajo Autorizada</p>
            </div>

            <form class="space-y-6" (ngSubmit)="onLogin()">
              
              <!-- Username -->
              <div class="space-y-2">
                <label class="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">DNI del Usuario</label>
                <div class="input-glass rounded-lg flex items-center px-4 py-3 group">
                  <span class="material-icons text-slate-500 mr-3 group-focus-within:text-primary transition-colors">badge</span>
                  <input type="text" [(ngModel)]="username" (ngModelChange)="username = sanitizeDni($event)" name="username" inputmode="numeric" autocomplete="username"
                         class="bg-transparent border-none text-white placeholder-slate-500 w-full focus:ring-0 text-sm font-mono h-full p-0 outline-none" 
                         placeholder="Ingrese DNI numerico (min. 8 digitos)">
                </div>
                <p class="text-[10px] text-slate-500 ml-1">Solo supervisores o encargados autorizados pueden iniciar sesión en la terminal.</p>
              </div>

              <!-- Password -->
              <div class="space-y-2">
                <label class="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Contraseña de Seguridad</label>
                <div class="input-glass rounded-lg flex items-center px-4 py-3 group border-primary/50 relative overflow-hidden">
                  <div class="absolute inset-0 bg-blue-500/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity"></div>
                  <span class="material-icons text-slate-500 mr-3 group-focus-within:text-primary transition-colors">lock</span>
                  <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" name="password"
                         class="bg-transparent border-none text-white placeholder-slate-500 w-full focus:ring-0 text-sm tracking-[0.2em] font-mono h-full p-0 outline-none" 
                         placeholder="••••••••">
                  <span class="w-[1px] h-5 bg-blue-500 animate-pulse ml-1"></span> 
                  <button type="button" (click)="showPassword = !showPassword" class="text-slate-500 hover:text-white transition-colors">
                    <span class="material-icons text-lg">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
                  </button>
                </div>
                <div class="flex justify-end pt-1">
                  <a href="#" class="text-xs text-primary hover:text-blue-300 transition-colors font-medium">Solicitar Restablecimiento</a>
                </div>
              </div>

              <!-- Shift Selection -->
              <div class="space-y-2 pt-2">
                <div class="flex items-center gap-1 ml-1 mb-2">
                  <label class="text-xs font-bold text-slate-300 uppercase tracking-wider">Asignación de Turno</label>
                  <span class="w-1 h-1 rounded-full bg-red-500"></span>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <button type="button" (click)="selectedShiftCode = 'T1'"
                          [ngClass]="selectedShiftCode === 'T1' ? 'active-shift' : 'inactive-shift'"
                          class="rounded-xl p-4 flex flex-col items-center justify-center text-center relative group transition-all">
                    <div *ngIf="selectedShiftCode === 'T1'" class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
                    <span class="material-icons text-blue-400 mb-2 text-xl" [class.text-slate-500]="selectedShiftCode !== 'T1'">{{ loginShifts[0].icon }}</span>
                    <span class="text-sm font-semibold" [ngClass]="selectedShiftCode === 'T1' ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-200'">{{ loginShifts[0].name }}</span>
                    <span class="text-xs font-mono mt-1" [ngClass]="selectedShiftCode === 'T1' ? 'text-blue-300/60' : 'text-slate-600 group-hover:text-slate-500'">{{ loginShifts[0].start }}<ng-container *ngIf="loginShifts[0].end"> - {{ loginShifts[0].end }}</ng-container></span>
                  </button>

                  <button type="button" (click)="selectedShiftCode = 'T2'"
                          [ngClass]="selectedShiftCode === 'T2' ? 'active-shift' : 'inactive-shift'"
                          class="rounded-xl p-4 flex flex-col items-center justify-center text-center relative group transition-all">
                    <div *ngIf="selectedShiftCode === 'T2'" class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
                    <span class="material-icons text-blue-400 mb-2 text-xl" [class.text-slate-500]="selectedShiftCode !== 'T2'">{{ loginShifts[1].icon }}</span>
                    <span class="text-sm font-semibold" [ngClass]="selectedShiftCode === 'T2' ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-200'">{{ loginShifts[1].name }}</span>
                    <span class="text-xs font-mono mt-1" [ngClass]="selectedShiftCode === 'T2' ? 'text-blue-300/60' : 'text-slate-600 group-hover:text-slate-500'">{{ loginShifts[1].start }}<ng-container *ngIf="loginShifts[1].end"> - {{ loginShifts[1].end }}</ng-container></span>
                  </button>
                </div>
              </div>

              <!-- Submit -->
              <button type="submit" 
                      [disabled]="username.length < 8 || !selectedShift || !password"
                      class="w-full bg-button-gradient hover:brightness-110 text-white font-bold py-3.5 px-4 rounded-xl shadow-glow transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                <span>AUTENTICAR SISTEMA</span>
                <span class="material-icons group-hover:translate-x-1 transition-transform">login</span>
              </button>

              <!-- Footer Info -->
              <div class="mt-6 rounded-lg bg-slate-800/40 border border-slate-700/50 p-3 flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-slate-700/50 flex items-center justify-center border border-slate-600/30">
                  <span class="material-icons text-slate-400 text-sm">terminal</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-[10px] font-bold text-slate-200 uppercase tracking-wide">Soporte Operativo IT</span>
                  <div class="flex items-center gap-2 text-[9px] font-mono text-slate-400">
                    <span>Terminal ID: W9M-04-A</span>
                    <span class="text-slate-600">|</span>
                    <span>Nodo Local: 10.0.4.12</span>
                  </div>
                </div>
              </div>

            </form>
          </div>

          <!-- Bottom Bar -->
          <div class="w-full absolute bottom-4 px-8 lg:px-12 flex justify-between text-[10px] font-mono text-slate-600 uppercase tracking-wider">
            <div>Build v2.4.1-stable</div>
            <div class="hidden md:flex gap-8">
              <span class="flex items-center gap-2"><span class="material-icons text-[10px]">hub</span> INDUSTRIAL MESH NETWORK</span>
            </div>
            <div>Región: {{ regionCode }}</div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .glass-panel {
      background: rgba(17, 25, 40, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .input-glass {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }
    .input-glass:focus-within {
      border-color: #0EA5E9;
      box-shadow: 0 0 0 1px rgba(14, 165, 233, 0.3), 0 0 20px rgba(14, 165, 233, 0.1);
      background: rgba(0, 0, 0, 0.4);
    }
    .active-shift {
      border: 1px solid #0EA5E9;
      background: linear-gradient(180deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%);
      box-shadow: 0 0 15px rgba(14, 165, 233, 0.1) inset;
    }
    .inactive-shift {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.02);
    }
    .inactive-shift:hover {
      border-color: rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
    }
    .scanlines {
      background: linear-gradient(
        to bottom,
        rgba(255,255,255,0),
        rgba(255,255,255,0) 50%,
        rgba(0,0,0,0.02) 50%,
        rgba(0,0,0,0.02)
      );
      background-size: 100% 4px;
      pointer-events: none;
    }
    .bg-button-gradient {
      background-image: linear-gradient(to right, #0EA5E9, #3B82F6);
    }
    .shadow-glow {
      box-shadow: 0 0 20px rgba(14, 165, 233, 0.3);
    }
    .shadow-glass {
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.36);
    }
  `]
})
export class LoginComponent {
  state = inject(StateService);
  router: Router = inject(Router);
  notifications = inject(NotificationService);
  
  username = '';
  password = '';
  selectedShiftCode: 'T1' | 'T2' = 'T1';
  showPassword = false;

  get regionCode(): string {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Simple mapping to mimic cloud region codes based on timezone
        if (tz.includes('Lima') || tz.includes('Bogota')) return 'SA-WEST-1';
        if (tz.includes('Santiago') || tz.includes('La_Paz')) return 'SA-WEST-2';
        if (tz.includes('Sao_Paulo') || tz.includes('Buenos_Aires')) return 'SA-EAST-1';
        if (tz.includes('New_York') || tz.includes('Virginia')) return 'US-EAST-1';
        if (tz.includes('Los_Angeles') || tz.includes('San_Francisco')) return 'US-WEST-1';
        if (tz.includes('London') || tz.includes('Dublin')) return 'EU-WEST-1';
        if (tz.includes('Madrid') || tz.includes('Paris') || tz.includes('Berlin')) return 'EU-CENTRAL-1';
        if (tz.includes('Tokyo')) return 'AP-NORTHEAST-1';
        
        // Fallback to formatted TZ name
        return tz.split('/').pop()?.toUpperCase().replace(/_/g, '-') || 'GLOBAL-NODE';
    } catch {
        return 'UNKNOWN-REGION';
    }
  }

  get loginShifts() {
    const contractShifts = this.state.systemConfigContract()?.shifts || [];
    const byCode = new Map(
      contractShifts.map((shift) => [String(shift.code || '').toUpperCase(), shift]),
    );

    const t1 = byCode.get('T1');
    const t2 = byCode.get('T2');

    return [
      {
        code: 'T1' as const,
        name: t1?.name || this.state.config().shiftName1,
        start: t1?.startTime || this.state.config().shiftTime1,
        end: t1?.endTime || '',
        icon: 'wb_sunny',
      },
      {
        code: 'T2' as const,
        name: t2?.name || this.state.config().shiftName2,
        start: t2?.startTime || this.state.config().shiftTime2,
        end: t2?.endTime || '',
        icon: 'nights_stay',
      },
    ];
  }

  get selectedShift(): Shift {
    return this.loginShifts.find((shift) => shift.code === this.selectedShiftCode)?.name || null;
  }

  async onLogin() {
    if (this.username.length >= 8 && this.selectedShift && this.password) {
      try {
        await this.state.login(this.username, this.selectedShift, this.password);
        this.router.navigate([this.state.postLoginRoute()]);
      } catch (error: any) {
        this.notifications.showError(error?.message || 'No fue posible iniciar sesion.');
      }
    }
  }

  sanitizeDni(value: string) {
    return String(value || '').replace(/\D/g, '');
  }
}
