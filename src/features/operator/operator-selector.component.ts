
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-operator-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>

    <!-- Main Container: Unified Background, FIXED HEIGHT (h-screen) NO SCROLL -->
    <div class="bg-gradient-mesh font-sans min-h-screen w-full flex flex-col relative overflow-x-hidden selection:bg-blue-500 selection:text-white text-gray-100">
        
        <!-- Background Effects Layer (Overlays on top of mesh) -->
        <div class="fixed inset-0 z-0 pointer-events-none">
            <div class="grid-overlay absolute inset-0 opacity-40"></div>
            
            <!-- Floating Orbs -->
            <div class="orb orb-1"></div>
            <div class="orb orb-2"></div>
            <div class="orb orb-3"></div>
            
            <!-- CRT Scanline Effect -->
            <div class="scanline absolute inset-0 z-50 pointer-events-none opacity-10"></div>
        </div>

        <!-- UI Layer -->
        <div class="relative z-10 flex flex-col h-full">
            
            <!-- Header -->
            <header class="w-full glass-panel h-20 shrink-0 flex items-center justify-between px-8 z-50 border-b border-white/5">
                <div class="flex items-center gap-6">
                    <button (click)="goToModeSelector()" class="w-12 h-12 rounded-2xl glass-button flex items-center justify-center group active:scale-95 transition-all duration-300">
                        <span class="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors text-2xl">arrow_back</span>
                    </button>
                    <div class="flex flex-col">
                        <h1 class="text-2xl font-tech font-bold uppercase tracking-[0.15em] text-white leading-none mb-1 drop-shadow-lg">
                            Terminal 04
                        </h1>
                        <div class="flex items-center gap-3 text-xs font-mono text-blue-200/70 tracking-widest uppercase">
                            <span class="flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[14px]">schedule</span> 
                                {{ state.currentShift() || 'TURNO GENERAL' }}
                            </span>
                            <span class="text-gray-600">|</span>
                            <span class="text-blue-400 font-bold">HOST: {{ state.userName() }}</span>
                        </div>
                    </div>
                </div>
                
                <div class="flex items-center gap-6">
                    <div class="hidden md:flex flex-col items-end mr-2">
                        <span class="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-1">Estado del Sistema</span>
                        <div class="flex items-center gap-2">
                            <div class="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                                <div class="h-full bg-emerald-500 w-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            </div>
                            <span class="text-emerald-400 font-mono text-xs font-bold tracking-wider">NORMAL</span>
                        </div>
                    </div>
                    
                    <button class="flex items-center gap-3 px-5 py-2.5 rounded-xl glass-button group border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 transition-all">
                        <span class="material-symbols-outlined text-red-500 group-hover:text-red-400 transition-colors text-xl animate-pulse">warning</span>
                        <span class="text-sm font-bold tracking-wider text-red-100 group-hover:text-white font-tech uppercase">Incidencia</span>
                    </button>
                    
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center relative shadow-xl">
                        <span class="material-symbols-outlined text-gray-300 text-2xl">person</span>
                        <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#020408] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                    </div>
                </div>
            </header>

            <!-- Main Content (Flex-1 to take remaining height, centered) -->
            <main class="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-[1920px] mx-auto relative min-h-0">
                
                <!-- Decorative Frame Corners -->
                <div class="absolute top-6 left-6 w-24 h-24 border-l-2 border-t-2 border-white/5 rounded-tl-3xl pointer-events-none"></div>
                <div class="absolute bottom-6 right-6 w-24 h-24 border-r-2 border-b-2 border-white/5 rounded-br-3xl pointer-events-none"></div>
                
                <div class="text-center mb-6 relative z-10 shrink-0">
                    <h2 class="font-tech text-4xl font-light tracking-[0.3em] uppercase text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                        Centro de Control
                    </h2>
                    <div class="h-px w-96 mx-auto bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                    <p class="mt-2 text-blue-300/50 font-mono text-sm tracking-[0.2em] uppercase">Seleccione Estación de Trabajo</p>
                </div>

                <div class="w-full max-w-5xl glass-panel rounded-2xl p-5 mb-6 border border-white/10">
                    <div class="flex flex-col lg:flex-row gap-5 lg:items-end">
                        <div class="flex-1 space-y-2">
                            <label class="block text-[11px] font-bold tracking-[0.15em] uppercase text-blue-300/70">Identificación del Operario</label>
                            <div class="flex gap-3">
                                <div class="flex-1 relative">
                                    <span class="material-symbols-outlined absolute left-3 top-3 text-gray-500">badge</span>
                                    <input [(ngModel)]="operatorDni" (ngModelChange)="operatorDni = sanitizeDni($event)" inputmode="numeric" maxlength="12" class="w-full pl-11 pr-4 py-3 rounded-xl bg-[#0a0f18] border border-white/10 text-white font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Ingrese DNI del operario"/>
                                </div>
                                <button type="button" (click)="identifyOperator()" [disabled]="operatorDni.length < 8 || identifyingOperator" class="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-wide transition-all">
                                    {{ identifyingOperator ? 'Validando...' : 'Identificar' }}
                                </button>
                            </div>
                            <p class="text-[11px] text-slate-400">El operario no inicia sesión. Debe ser identificado por DNI desde esta estación anfitriona.</p>
                        </div>

                        <div class="lg:min-w-[320px] rounded-2xl border border-white/10 bg-[#0a0f18]/80 p-4">
                            <div class="flex items-center justify-between gap-3">
                                <div>
                                    <p class="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold">Operario Activo</p>
                                    <p class="text-lg font-bold text-white">{{ state.activeOperatorName() }}</p>
                                    <p class="text-xs text-slate-400 font-mono" *ngIf="state.hasActiveOperator()">DNI: {{ state.activeOperatorDni() }}</p>
                                </div>
                                <button *ngIf="state.hasActiveOperator()" type="button" (click)="clearOperatorContext()" class="px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all text-xs uppercase tracking-wider">
                                    Cambiar
                                </button>
                            </div>
                            <div class="mt-3 flex flex-wrap gap-2" *ngIf="state.hasActiveOperator(); else noAreas">
                                <span *ngFor="let area of state.activeOperatorAreas()" class="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-200 text-[10px] uppercase tracking-wider font-bold">
                                    {{ area }}
                                </span>
                            </div>
                            <ng-template #noAreas>
                                <p class="mt-3 text-xs text-slate-500">Identifica un operario para habilitar solo sus áreas permitidas.</p>
                            </ng-template>
                        </div>
                    </div>
                </div>

                <!-- Cards Grid - Responsive Height using vh -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full px-4 lg:px-12 perspective-1000 items-center justify-center flex-1 max-h-[60vh]">
                    
                    <!-- CARD 1: IMPRESIÓN (Blue) -->
                    <div *ngIf="!state.hasActiveOperator() || isProcessAllowed('print')" (click)="navigateTo('print')" class="group relative h-full max-h-[450px] min-h-[300px] glass-card rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.25)]"
                        [class.cursor-pointer]="canAccessProcess('print')" [class.cursor-not-allowed]="!canAccessProcess('print')" [class.opacity-40]="!canAccessProcess('print')">
                        <!-- Image & Overlay -->
                        <div class="absolute inset-0 bg-blue-900/20 z-10 mix-blend-overlay"></div>
                        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#020408]/60 to-[#020408] z-20"></div>
                        <img class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80 grayscale-[30%] group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCL15Nyg5lDmjbETrcU0Vw7a9Rdkq3Grg9AEG2cFoewzSVlskPSfewpZwnsB-5TghhtVWHCpXJLFx1LsoNu8Ai7hqRUhHTIohSsHem2TkZ38i49Bng0UPFkdx6I5Ei5stJr-KfBGp2GUlgRQWG-_JvbSQFKmNNlshLPP1ZrB77z8gKgG8rk_TCT6bK0e4ql1oZijRIbvNF50p9aY1gvP5xKktBbAaZxNE174gTJYAjojUtIHWpSa6bkEwIOnRdWr16sHwf0ZPunEbk" alt="Impresión" />
                        <div class="absolute inset-0 pattern-grid z-10 opacity-20"></div>
                        
                        <!-- Content -->
                        <div class="absolute inset-0 flex flex-col justify-between p-6 z-30">
                            <div class="flex justify-between items-start">
                                <span class="px-3 py-1.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold tracking-widest backdrop-blur-md">ST-01</span>
                                <div class="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,1)] animate-pulse"></div>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[inset_0_0_30px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transition-all duration-500 group-hover:scale-110 group-hover:border-blue-400/30">
                                    <span class="material-symbols-outlined text-blue-100 text-4xl drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]">print</span>
                                </div>
                                <h3 class="text-white text-2xl font-tech font-bold uppercase tracking-widest drop-shadow-xl group-hover:text-blue-200 transition-colors">Impresión</h3>
                                <div class="mt-4 h-0.5 w-12 bg-blue-500/50 group-hover:w-24 group-hover:bg-blue-400 transition-all duration-500"></div>
                            </div>
                        </div>
                    </div>

                    <!-- CARD 2: TROQUELADO (Purple) -->
                    <div *ngIf="!state.hasActiveOperator() || isProcessAllowed('diecut')" (click)="navigateTo('diecut')" class="group relative h-full max-h-[450px] min-h-[300px] glass-card rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(139,92,246,0.25)]"
                        [class.cursor-pointer]="canAccessProcess('diecut')" [class.cursor-not-allowed]="!canAccessProcess('diecut')" [class.opacity-40]="!canAccessProcess('diecut')">
                        <div class="absolute inset-0 bg-purple-900/20 z-10 mix-blend-overlay"></div>
                        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#020408]/60 to-[#020408] z-20"></div>
                        <img class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80 grayscale-[30%] group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaiyjIfwnha9Zx2Svh3X-_9lnJKSyZOo59hxglKvDhtH2mMoAPrsSllG9_3UBNmbt-Ug1-SsuFIiSHSqajOWCVFiW49ptmh3jSjyuK2BhtVvbZg5kzjLr-piPjflQ563xQI_6sWUibmrF6NASzaOvxev0dOtmdgM6fx-IVbskuE_5bvwQqb5PuSCC4pdZ4jV64psrLT_0UvGl5DEWYpsY4sXgwJZ1H97YNt80sPh-wh4bZwkg_l2WMD9nnlxJbtQ22CJhwQELiCtI" alt="Troquelado" />
                        <div class="absolute inset-0 pattern-grid z-10 opacity-20"></div>
                        
                        <div class="absolute inset-0 flex flex-col justify-between p-6 z-30">
                            <div class="flex justify-between items-start">
                                <span class="px-3 py-1.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold tracking-widest backdrop-blur-md">ST-02</span>
                                <div class="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_12px_rgba(139,92,246,1)] animate-pulse"></div>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[inset_0_0_30px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all duration-500 group-hover:scale-110 group-hover:border-purple-400/30">
                                    <span class="material-symbols-outlined text-purple-100 text-4xl drop-shadow-[0_0_10px_rgba(139,92,246,0.6)]">content_cut</span>
                                </div>
                                <h3 class="text-white text-2xl font-tech font-bold uppercase tracking-widest drop-shadow-xl group-hover:text-purple-200 transition-colors">Troquelado</h3>
                                <div class="mt-4 h-0.5 w-12 bg-purple-500/50 group-hover:w-24 group-hover:bg-purple-400 transition-all duration-500"></div>
                            </div>
                        </div>
                    </div>

                    <!-- CARD 3: REBOBINADO (Orange) -->
                    <div *ngIf="!state.hasActiveOperator() || isProcessAllowed('rewind')" (click)="navigateTo('rewind')" class="group relative h-full max-h-[450px] min-h-[300px] glass-card rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(249,115,22,0.25)]"
                        [class.cursor-pointer]="canAccessProcess('rewind')" [class.cursor-not-allowed]="!canAccessProcess('rewind')" [class.opacity-40]="!canAccessProcess('rewind')">
                        <div class="absolute inset-0 bg-orange-900/20 z-10 mix-blend-overlay"></div>
                        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#020408]/60 to-[#020408] z-20"></div>
                        <img class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80 grayscale-[30%] group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpmNhrMIoRLh9dHdybX9TDRp8SZJOCzk2YrFkBA7VfHlzz0zPWmbs6Tzzx0TpEIIebk0tvxJv6SYYvyGdgKXSNEZgrWwGJAyA-a2AvGXyQ-ZgeVJs5mow36t4zD28SctOLij4eWlSb3c73cXOnIkzCS1-Cah_M78juIrXXkzwotJ2dCIxB0joLa2DtAdkkp7qwdoVaoQHdHqwuSQ1k1tHpoMkeZlEj-op8HiRR4OzYvJ5XvORndCTyEhJvP7wx6U566G3y0qe6s1E" alt="Rebobinado" />
                        <div class="absolute inset-0 pattern-grid z-10 opacity-20"></div>
                        
                        <div class="absolute inset-0 flex flex-col justify-between p-6 z-30">
                            <div class="flex justify-between items-start">
                                <span class="px-3 py-1.5 rounded-md bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-mono font-bold tracking-widest backdrop-blur-md">ST-03</span>
                                <div class="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,1)] animate-pulse"></div>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[inset_0_0_30px_rgba(249,115,22,0.15)] group-hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all duration-500 group-hover:scale-110 group-hover:border-orange-400/30">
                                    <span class="material-symbols-outlined text-orange-100 text-4xl drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]">sync</span>
                                </div>
                                <h3 class="text-white text-2xl font-tech font-bold uppercase tracking-widest drop-shadow-xl group-hover:text-orange-200 transition-colors">Rebobinado</h3>
                                <div class="mt-4 h-0.5 w-12 bg-orange-500/50 group-hover:w-24 group-hover:bg-orange-400 transition-all duration-500"></div>
                            </div>
                        </div>
                    </div>

                    <!-- CARD 4: EMPAQUETADO (Green) -->
                    <div *ngIf="!state.hasActiveOperator() || isProcessAllowed('packaging')" (click)="navigateTo('packaging')" class="group relative h-full max-h-[450px] min-h-[300px] glass-card rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(16,185,129,0.25)]"
                        [class.cursor-pointer]="canAccessProcess('packaging')" [class.cursor-not-allowed]="!canAccessProcess('packaging')" [class.opacity-40]="!canAccessProcess('packaging')">
                        <div class="absolute inset-0 bg-emerald-900/20 z-10 mix-blend-overlay"></div>
                        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#020408]/60 to-[#020408] z-20"></div>
                        <img class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80 grayscale-[30%] group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7HlTG0KYb7VkuSqPJ6wr5CMkrAjHAI76So-ttwplu2jGY08YiKsxmjkQzMqTmqpIpxaGH8oL9QRVWeMWniAW_QHX41Hv0rdDyyRw3XiUM0AEpvSVhwLEPabFYBsvVIJHFB9E6gkqexCm1At3z_BK45UCKmLO5BxsRXKTEvoO5lhBCD8ijhRwnzcJwJEGlOKm9MBUtlXADPCqjvIFqYB0uWe7pOtJZ3H_33dGagO0rnWkV5FuizeuRMmYZ1KE9TH35SHOo9YCgbT0" alt="Empaquetado" />
                        <div class="absolute inset-0 pattern-grid z-10 opacity-20"></div>
                        
                        <div class="absolute inset-0 flex flex-col justify-between p-6 z-30">
                            <div class="flex justify-between items-start">
                                <span class="px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold tracking-widest backdrop-blur-md">ST-04</span>
                                <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,1)] animate-pulse"></div>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[inset_0_0_30px_rgba(16,185,129,0.15)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-500 group-hover:scale-110 group-hover:border-emerald-400/30">
                                    <span class="material-symbols-outlined text-emerald-100 text-4xl drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">inventory_2</span>
                                </div>
                                <h3 class="text-white text-2xl font-tech font-bold uppercase tracking-widest drop-shadow-xl group-hover:text-emerald-200 transition-colors">Empaquetado</h3>
                                <div class="mt-4 h-0.5 w-12 bg-emerald-500/50 group-hover:w-24 group-hover:bg-emerald-400 transition-all duration-500"></div>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Notification Panel (Compact) -->
                <div class="w-full max-w-5xl glass-panel relative rounded-2xl p-0.5 overflow-hidden shadow-[0_0_50px_-20px_rgba(234,179,8,0.15)] group mt-4 shrink-0">
                    <div class="absolute -top-[100%] -left-[100%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/5 to-transparent rotate-45 transition-all duration-1000 group-hover:top-[100%] group-hover:left-[100%]"></div>
                    <div class="bg-[#0f172a]/90 rounded-[14px] p-4 flex flex-col md:flex-row items-center gap-4 backdrop-blur-2xl relative z-10 border border-yellow-500/10 shadow-[inset_0_0_30px_rgba(234,179,8,0.02)]">
                        <div class="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                            <span class="material-symbols-outlined text-xl">mail</span>
                        </div>
                        <div class="flex-1 text-center md:text-left">
                            <div class="inline-flex items-center gap-2 mb-1">
                                <h4 class="text-yellow-500 font-tech font-bold uppercase text-sm tracking-widest">Mensaje del Supervisor</h4>
                                <span class="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-900/40 text-yellow-200 rounded border border-yellow-700/50 tracking-wider">NUEVO</span>
                            </div>
                            <p class="text-gray-300 text-xs leading-relaxed font-light tracking-wide truncate">
                                {{ state.config().operatorMessage }}
                            </p>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    </div>
  `,
  styles: [`
    .font-tech { font-family: var(--app-font-stack); }
    
    .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        z-index: 0;
        opacity: 0.4;
    }
    .orb-1 {
        top: -10%;
        left: 20%;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(29, 78, 216, 0.15) 0%, transparent 70%);
    }
    .orb-2 {
        bottom: -10%;
        right: 10%;
        width: 700px;
        height: 700px;
        background: radial-gradient(circle, rgba(88, 28, 135, 0.15) 0%, transparent 70%);
    }
    .orb-3 {
        top: 40%;
        left: 40%;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(15, 23, 42, 0.5) 0%, transparent 70%);
    }
    
    .grid-overlay {
        background-image: 
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
        background-size: 80px 80px;
        mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
    }
    
    .glass-panel {
        background: rgba(2, 4, 8, 0.6);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
    }
    
    .glass-card {
        background: linear-gradient(160deg, rgba(30, 41, 59, 0.3) 0%, rgba(15, 23, 42, 0.4) 100%);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    
    .glass-button {
        background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255,255,255,0.05);
    }
    
    .scanline {
        background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.3) 51%);
        background-size: 100% 4px;
    }

    .pattern-grid {
      background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CiAgPHBhdGggZD0iTTEgMWgxVjFIMXptMCAxOXYxaDF2LTFIMUMxeiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgLz4KPC9zdmc+');
    }
  `]
})
export class OperatorSelectorComponent {
  state = inject(StateService);
  router: Router = inject(Router);
  notifications = inject(NotificationService);
  operatorDni = '';
  identifyingOperator = false;

  goToModeSelector() {
    void this.router.navigate(['/mode-selector']);
  }

  navigateTo(type: string) {
    if (!this.state.hasActiveOperator()) {
        this.notifications.showWarning('Identifica primero al operario con su DNI.');
        return;
    }

    if (!this.state.canCreateProcessReport(type)) {
        this.notifications.showError('La sesión anfitriona no tiene permiso para registrar reportes en esta área.');
        return;
    }

    if (!this.isProcessAllowed(type)) {
        this.notifications.showError('El operario no tiene permisos para acceder a esta área.');
        return;
    }

    if (type === 'packaging') {
        this.router.navigate(['/operator/packaging']);
    } else {
        this.router.navigate(['/operator/select-machine', type]);
    }
  }

  canAccessProcess(type: string) {
    return this.state.hasActiveOperator() && this.state.canCreateProcessReport(type) && this.isProcessAllowed(type);
  }

  isProcessAllowed(type: string) {
    return this.state.isProcessAllowedForActiveOperator(type);
  }

  sanitizeDni(value: string) {
    return String(value || '').replace(/\D/g, '');
  }

  async identifyOperator() {
    if (this.operatorDni.length < 8) {
      this.notifications.showWarning('Ingresa un DNI válido de al menos 8 dígitos.');
      return;
    }

    try {
      this.identifyingOperator = true;
      await this.state.identifyOperatorByDni(this.operatorDni);
      this.notifications.showSuccess(`Operario ${this.state.activeOperatorName()} identificado correctamente.`);
    } catch (error: any) {
      this.notifications.showError(error?.message || 'No fue posible identificar al operario.');
    } finally {
      this.identifyingOperator = false;
    }
  }

  clearOperatorContext() {
    this.state.clearActiveOperatorContext();
    this.operatorDni = '';
  }
}
