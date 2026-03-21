
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-mode-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Load Fonts specifically for this view -->
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>

    <div class="terminal-body font-sans min-h-screen flex flex-col relative overflow-x-hidden selection:bg-blue-500 selection:text-white">
        
        <!-- Background Effects -->
        <div class="mesh-background"></div>
        <div class="grid-overlay"></div>
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
        <div class="scanline"></div>

        <!-- Header -->
        <header class="w-full glass-panel h-20 flex items-center justify-between px-6 z-50 sticky top-0 border-b border-white/5">
            <div class="flex items-center gap-6">
                <button (click)="logout()" class="w-12 h-12 rounded-xl glass-button flex items-center justify-center group active:scale-95 cursor-pointer">
                    <span class="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors">arrow_back</span>
                </button>
                <div class="flex flex-col">
                    <h1 class="text-2xl font-tech font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 leading-none mb-1">Terminal del operador</h1>
                    <div class="flex items-center gap-3 text-xs font-mono text-gray-400 tracking-wider">
                        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[10px]">schedule</span> {{ state.currentShift() || 'TURNO GENERAL' }}</span>
                        <span class="text-gray-600">|</span>
                        <span class="text-blue-400">ID: {{ state.userName() }}</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <div class="hidden md:flex flex-col items-end mr-4">
                    <span class="text-[10px] uppercase text-gray-500 font-bold tracking-widest mb-0.5">Estado del Sistema</span>
                    <div class="flex items-center gap-2">
                        <div class="h-1.5 w-16 bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-emerald-500 w-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        </div>
                        <span class="text-emerald-400 font-mono text-xs font-bold">NORMAL</span>
                    </div>
                </div>
                <button class="flex items-center gap-2 px-5 py-2.5 rounded-lg glass-button group border-red-500/20 hover:border-red-500/50 cursor-pointer">
                    <span class="material-symbols-outlined text-red-500 group-hover:text-red-400 transition-colors text-xl">warning</span>
                    <span class="text-sm font-bold tracking-wider text-red-100/90 group-hover:text-white font-tech">INCIDENCIA</span>
                </button>
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center relative shadow-lg">
                    <span class="material-symbols-outlined text-gray-300">person</span>
                    <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#050b14] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="flex-grow flex flex-col items-center justify-center p-6 lg:p-12 w-full max-w-[1920px] mx-auto pb-24 relative z-10">
            
            <!-- Decorative Corners -->
            <div class="absolute top-10 left-10 w-32 h-32 border-l border-t border-white/5 opacity-50 rounded-tl-3xl pointer-events-none"></div>
            <div class="absolute bottom-10 right-10 w-32 h-32 border-r border-b border-white/5 opacity-50 rounded-br-3xl pointer-events-none"></div>
            
            <div class="text-center mb-12 relative">
                <h2 class="font-tech text-3xl md:text-4xl font-light tracking-[0.2em] uppercase text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    Centro de Control
                </h2>
                <div class="h-px w-64 mx-auto bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                <p class="mt-3 text-blue-300/60 font-mono text-sm tracking-widest">SELECCIONE ESTACIÓN DE TRABAJO</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full mb-12 perspective-1000">
                
                <!-- IMPRESIÓN -->
                <div (click)="navigateTo('print')" class="group relative h-[460px] glass-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(59,130,246,0.2)]">
                    <div class="absolute inset-0 bg-blue-500/5 z-20 mix-blend-overlay pointer-events-none"></div>
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-blue-950/90 z-20"></div>
                    <img alt="Impresión Industrial" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80 filter grayscale-[20%] group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCL15Nyg5lDmjbETrcU0Vw7a9Rdkq3Grg9AEG2cFoewzSVlskPSfewpZwnsB-5TghhtVWHCpXJLFx1LsoNu8Ai7hqRUhHTIohSsHem2TkZ38i49Bng0UPFkdx6I5Ei5stJr-KfBGp2GUlgRQWG-_JvbSQFKmNNlshLPP1ZrB77z8gKgG8rk_TCT6bK0e4ql1oZijRIbvNF50p9aY1gvP5xKktBbAaZxNE174gTJYAjojUtIHWpSa6bkEwIOnRdWr16sHwf0ZPunEbk"/>
                    <div class="absolute inset-0 pattern-grid z-10 opacity-30"></div>
                    <div class="absolute inset-0 flex flex-col justify-between p-6 z-30">
                        <div class="flex justify-between items-start">
                            <span class="px-2 py-1 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-mono tracking-widest backdrop-blur-sm">ST-01</span>
                            <div class="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"></div>
                        </div>
                        <div class="flex flex-col items-center">
                            <div class="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-filter backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all duration-300 group-hover:scale-110">
                                <span class="material-symbols-outlined text-blue-200 text-4xl drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">print</span>
                            </div>
                            <h3 class="text-white text-2xl font-tech font-bold uppercase tracking-widest drop-shadow-md group-hover:text-blue-200 transition-colors">Impresión</h3>
                            <div class="mt-4 h-0.5 w-12 bg-blue-500/50 group-hover:w-24 transition-all duration-500"></div>
                        </div>
                    </div>
                </div>

                <!-- TROQUELADO -->
                <div (click)="navigateTo('diecut')" class="group relative h-[460px] glass-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(139,92,246,0.2)]">
                    <div class="absolute inset-0 bg-purple-500/5 z-20 mix-blend-overlay pointer-events-none"></div>
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-purple-950/90 z-20"></div>
                    <img alt="Troquelado Industrial" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80 filter grayscale-[20%] group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaiyjIfwnha9Zx2Svh3X-_9lnJKSyZOo59hxglKvDhtH2mMoAPrsSllG9_3UBNmbt-Ug1-SsuFIiSHSqajOWCVFiW49ptmh3jSjyuK2BhtVvbZg5kzjLr-piPjflQ563xQI_6sWUibmrF6NASzaOvxev0dOtmdgM6fx-IVbskuE_5bvwQqb5PuSCC4pdZ4jV64psrLT_0UvGl5DEWYpsY4sXgwJZ1H97YNt80sPh-wh4bZwkg_l2WMD9nnlxJbtQ22CJhwQELiCtI"/>
                    <div class="absolute inset-0 pattern-grid z-10 opacity-30"></div>
                    <div class="absolute inset-0 flex flex-col justify-between p-6 z-30">
                        <div class="flex justify-between items-start">
                            <span class="px-2 py-1 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-mono tracking-widest backdrop-blur-sm">ST-02</span>
                            <div class="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.8)] animate-pulse"></div>
                        </div>
                        <div class="flex flex-col items-center">
                            <div class="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-filter backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(139,92,246,0.2)] group-hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] transition-all duration-300 group-hover:scale-110">
                                <span class="material-symbols-outlined text-purple-200 text-4xl drop-shadow-[0_0_5px_rgba(139,92,246,0.8)]">content_cut</span>
                            </div>
                            <h3 class="text-white text-2xl font-tech font-bold uppercase tracking-widest drop-shadow-md group-hover:text-purple-200 transition-colors">Troquelado</h3>
                            <div class="mt-4 h-0.5 w-12 bg-purple-500/50 group-hover:w-24 transition-all duration-500"></div>
                        </div>
                    </div>
                </div>

                <!-- REBOBINADO -->
                <div (click)="navigateTo('rewind')" class="group relative h-[460px] glass-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(249,115,22,0.2)]">
                    <div class="absolute inset-0 bg-orange-500/5 z-20 mix-blend-overlay pointer-events-none"></div>
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-orange-950/90 z-20"></div>
                    <img alt="Rebobinado Industrial" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80 filter grayscale-[20%] group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpmNhrMIoRLh9dHdybX9TDRp8SZJOCzk2YrFkBA7VfHlzz0zPWmbs6Tzzx0TpEIIebk0tvxJv6SYYvyGdgKXSNEZgrWwGJAyA-a2AvGXyQ-ZgeVJs5mow36t4zD28SctOLij4eWlSb3c73cXOnIkzCS1-Cah_M78juIrXXkzwotJ2dCIxB0joLa2DtAdkkp7qwdoVaoQHdHqwuSQ1k1tHpoMkeZlEj-op8HiRR4OzYvJ5XvORndCTyEhJvP7wx6U566G3y0qe6s1E"/>
                    <div class="absolute inset-0 pattern-grid z-10 opacity-30"></div>
                    <div class="absolute inset-0 flex flex-col justify-between p-6 z-30">
                        <div class="flex justify-between items-start">
                            <span class="px-2 py-1 rounded bg-orange-500/20 border border-orange-500/30 text-orange-300 text-[10px] font-mono tracking-widest backdrop-blur-sm">ST-03</span>
                            <div class="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse"></div>
                        </div>
                        <div class="flex flex-col items-center">
                            <div class="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-filter backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(249,115,22,0.2)] group-hover:shadow-[0_0_25px_rgba(249,115,22,0.4)] transition-all duration-300 group-hover:scale-110">
                                <span class="material-symbols-outlined text-orange-200 text-4xl drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]">sync</span>
                            </div>
                            <h3 class="text-white text-2xl font-tech font-bold uppercase tracking-widest drop-shadow-md group-hover:text-orange-200 transition-colors">Rebobinado</h3>
                            <div class="mt-4 h-0.5 w-12 bg-orange-500/50 group-hover:w-24 transition-all duration-500"></div>
                        </div>
                    </div>
                </div>

                <!-- EMPAQUETADO -->
                <div (click)="navigateTo('packaging')" class="group relative h-[460px] glass-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.2)]">
                    <div class="absolute inset-0 bg-green-500/5 z-20 mix-blend-overlay pointer-events-none"></div>
                    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-emerald-950/90 z-20"></div>
                    <img alt="Empaquetado Industrial" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-80 filter grayscale-[20%] group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7HlTG0KYb7VkuSqPJ6wr5CMkrAjHAI76So-ttwplu2jGY08YiKsxmjkQzMqTmqpIpxaGH8oL9QRVWeMWniAW_QHX41Hv0rdDyyRw3XiUM0AEpvSVhwLEPabFYBsvVIJHFB9E6gkqexCm1At3z_BK45UCKmLO5BxsRXKTEvoO5lhBCD8ijhRwnzcJwJEGlOKm9MBUtlXADPCqjvIFqYB0uWe7pOtJZ3H_33dGagO0rnWkV5FuizeuRMmYZ1KE9TH35SHOo9YCgbT0"/>
                    <div class="absolute inset-0 pattern-grid z-10 opacity-30"></div>
                    <div class="absolute inset-0 flex flex-col justify-between p-6 z-30">
                        <div class="flex justify-between items-start">
                            <span class="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono tracking-widest backdrop-blur-sm">ST-04</span>
                            <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                        </div>
                        <div class="flex flex-col items-center">
                            <div class="mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-filter backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[inset_0_0_20px_rgba(16,185,129,0.2)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all duration-300 group-hover:scale-110">
                                <span class="material-symbols-outlined text-emerald-200 text-4xl drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">inventory_2</span>
                            </div>
                            <h3 class="text-white text-2xl font-tech font-bold uppercase tracking-widest drop-shadow-md group-hover:text-emerald-200 transition-colors">Empaquetado</h3>
                            <div class="mt-4 h-0.5 w-12 bg-emerald-500/50 group-hover:w-24 transition-all duration-500"></div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Notification Panel -->
            <div class="w-full max-w-5xl glass-panel relative rounded-xl p-0.5 overflow-hidden shadow-[0_0_40px_-10px_rgba(234,179,8,0.1)] group mb-20">
                <div class="absolute -top-[100%] -left-[100%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/5 to-transparent rotate-45 transition-all duration-1000 group-hover:top-[100%] group-hover:left-[100%]"></div>
                <div class="bg-[#0f172a]/80 rounded-[10px] p-6 flex items-start gap-6 backdrop-blur-xl relative z-10 border border-yellow-500/10 shadow-[inset_0_0_20px_rgba(234,179,8,0.05)]">
                    <div class="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                        <span class="material-symbols-outlined text-2xl">mail</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <h4 class="text-yellow-500 font-tech font-bold uppercase text-lg tracking-widest">Mensaje del Supervisor</h4>
                            <span class="text-[10px] px-2 py-0.5 bg-yellow-900/40 text-yellow-200 rounded border border-yellow-700/50">NUEVO</span>
                        </div>
                        <p class="text-gray-300 text-sm leading-relaxed font-light tracking-wide max-w-3xl">
                            Recordar verificar el estado de los clichés y troqueles al finalizar el turno noche. Reportar cualquier daño en la sección de Incidencias antes de cerrar sesión. El módulo de Empaquetado ya se encuentra activo para pruebas.
                        </p>
                    </div>
                </div>
            </div>

        </main>

        <!-- Admin Button -->
        <div class="fixed bottom-8 right-8 z-50">
            <button (click)="goToManager()" class="flex items-center gap-3 px-8 py-4 rounded-xl glass-button group shadow-[0_0_20px_rgba(0,0,0,0.5)] border-blue-400/20 hover:border-blue-400/40 cursor-pointer">
                <div class="relative">
                    <span class="material-symbols-outlined text-2xl text-blue-300 group-hover:text-white group-hover:rotate-180 transition-transform duration-700">settings</span>
                    <span class="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                </div>
                <div class="flex flex-col items-start">
                    <span class="text-[10px] text-blue-300 font-mono leading-none mb-1">PANEL ADMIN</span>
                    <span class="font-bold text-sm tracking-widest text-white font-tech">GESTIÓN DE PRODUCCIÓN</span>
                </div>
            </button>
        </div>

    </div>
  `,
  styles: [`
    .font-tech { font-family: 'Rajdhani', sans-serif; }
    
    .terminal-body {
        background-color: #020408;
        background-image: 
            radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
            radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), 
            radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%);
        color: #f3f4f6;
    }

    .mesh-background {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0;
        background-color: #0f172a;
        background-image: 
            radial-gradient(at 80% 0%, hsla(242, 60%, 25%, 0.6) 0px, transparent 50%),
            radial-gradient(at 0% 50%, hsla(260, 50%, 20%, 0.6) 0px, transparent 50%),
            radial-gradient(at 80% 50%, hsla(210, 50%, 20%, 0.6) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(242, 60%, 25%, 0.6) 0px, transparent 50%),
            radial-gradient(at 80% 100%, hsla(280, 50%, 15%, 0.6) 0px, transparent 50%),
            radial-gradient(at 0% 0%, hsla(210, 50%, 15%, 0.6) 0px, transparent 50%);
        filter: blur(40px);
    }
    
    .orb { position: absolute; border-radius: 50%; filter: blur(60px); z-index: 0; opacity: 0.6; }
    .orb-1 { top: 10%; left: 20%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%); }
    .orb-2 { bottom: 10%; right: 15%; width: 500px; height: 500px; background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%); }
    .orb-3 { top: 40%; left: 60%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%); }
    
    .grid-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        background-size: 60px 60px; z-index: 0; pointer-events: none;
        mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
    }
    
    .glass-panel {
        background: rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    
    .glass-card {
        background: linear-gradient(145deg, rgba(30, 41, 59, 0.3) 0%, rgba(15, 23, 42, 0.2) 100%);
        backdrop-filter: blur(12px);
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        border-left: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.5);
    }
    
    .glass-button {
        background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 6px rgba(0,0,0,0.3);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255,255,255,0.05);
        transition: all 0.2s ease;
    }
    
    .glass-button:hover {
        background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.2), 0 6px 12px rgba(0,0,0,0.4), 0 0 15px rgba(59, 130, 246, 0.2);
    }
    
    .scanline {
        position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
        background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.1) 51%);
        background-size: 100% 4px; pointer-events: none; z-index: 9999; opacity: 0.15;
    }

    .pattern-grid {
      background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CiAgPHBhdGggZD0iTTEgMWgxVjFIMXptMCAxOXYxaDF2LTFIMUMxeiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgLz4KPC9zdmc+');
    }
  `]
})
export class ModeSelectorComponent {
  state = inject(StateService);
  router: Router = inject(Router);

  logout() {
    this.state.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(type: string) {
    if (type === 'packaging') {
        this.router.navigate(['/operator/packaging']);
    } else {
        this.router.navigate(['/operator/select-machine', type]);
    }
  }

  goToManager() {
    this.router.navigate(['/dashboard']);
  }
}
