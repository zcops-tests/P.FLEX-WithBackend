
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { OrdersService } from '../../orders/services/orders.service';
import { OT } from '../../orders/models/orders.models';

@Component({
  selector: 'app-reports-packaging',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- MAIN LIST VIEW -->
    <div *ngIf="!showForm" class="p-6 min-h-full bg-[#121921] text-gray-100 font-sans pb-20">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-3">
            <div class="p-2 bg-teal-500/10 rounded-lg border border-teal-500/20">
                <span class="material-icons text-teal-500">inventory_2</span>
            </div>
            Reportes de Empaquetado
          </h1>
          <p class="text-sm text-gray-400 mt-1 ml-14">Gestión de palletizado, demasías y producto terminado</p>
        </div>
        <div class="flex gap-3">
           <div class="relative group">
              <span class="material-icons absolute left-3 top-2.5 text-gray-500 group-focus-within:text-teal-500 transition-colors text-sm">search</span>
              <input type="text" placeholder="Buscar OT, Lote..." 
                class="pl-9 pr-4 py-2 bg-[#1a2332] border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none w-64 transition-all placeholder-gray-600">
           </div>
           <button (click)="createNewReport()" class="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-teal-500 shadow-lg shadow-teal-900/20 transition-all active:scale-95 border border-teal-500">
              <span class="material-icons text-sm">add</span> Nuevo Registro
           </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
         <div class="bg-[#1a2332] p-5 rounded-xl border border-gray-700/50 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span class="material-icons text-6xl text-teal-500">check_circle</span>
            </div>
            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Rollos Terminados</p>
            <p class="text-3xl font-black text-white">2,450 <span class="text-sm text-gray-500 font-medium">und</span></p>
         </div>
         <div class="bg-[#1a2332] p-5 rounded-xl border border-gray-700/50 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span class="material-icons text-6xl text-blue-500">straighten</span>
            </div>
            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Metros Lineales</p>
            <p class="text-3xl font-black text-white">145.2 <span class="text-sm text-gray-500 font-medium">km</span></p>
         </div>
         <div class="bg-[#1a2332] p-5 rounded-xl border border-gray-700/50 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span class="material-icons text-6xl text-purple-500">add_circle</span>
            </div>
            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Demasía Recuperada</p>
            <p class="text-3xl font-black text-purple-400">12.5 <span class="text-sm text-purple-500/70 font-medium">%</span></p>
         </div>
         <div class="bg-[#1a2332] p-5 rounded-xl border border-gray-700/50 shadow-sm relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <span class="material-icons text-6xl text-yellow-500">timelapse</span>
            </div>
            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Lotes Parciales</p>
            <p class="text-3xl font-black text-yellow-500">3 <span class="text-sm text-yellow-600/70 font-medium">lotes</span></p>
         </div>
      </div>

      <!-- Reports Table -->
      <div class="bg-[#1a2332] rounded-xl border border-gray-700 shadow-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-[#151e2b] text-gray-400 font-bold border-b border-gray-700 text-xs uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Fecha</th>
                <th class="px-6 py-4">OT</th>
                <th class="px-6 py-4">Cliente / Producto</th>
                <th class="px-6 py-4 text-center">Estado Lote</th>
                <th class="px-6 py-4 text-right">Cant. Rollos</th>
                <th class="px-6 py-4 text-right">Metros (MLL)</th>
                <th class="px-6 py-4 text-center">Demasía</th>
                <th class="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700/50 text-gray-300">
              <tr *ngFor="let report of reports" class="hover:bg-[#202b3d] transition-colors group cursor-pointer" (click)="editReport(report)">
                  <td class="px-6 py-4 font-medium">
                    <div class="text-white">{{ report.date | date:'dd/MM/yyyy' }}</div>
                    <div class="text-[10px] text-gray-500 font-mono">{{ report.date | date:'HH:mm' }}</div>
                  </td>
                  <td class="px-6 py-4">
                     <span class="font-bold text-teal-400 bg-teal-500/10 px-2 py-1 rounded border border-teal-500/20 font-mono">{{ report.ot }}</span>
                  </td>
                  <td class="px-6 py-4">
                     <div class="font-bold text-gray-200">{{ report.client }}</div>
                     <div class="text-xs text-gray-500 truncate max-w-[200px]">{{ report.description }}</div>
                  </td>
                  <td class="px-6 py-4 text-center">
                     <span *ngIf="report.status === 'Completo'" class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span class="material-icons text-[10px]">check_circle</span> COMPLETO
                     </span>
                     <span *ngIf="report.status === 'Parcial'" class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <span class="material-icons text-[10px]">timelapse</span> PARCIAL
                     </span>
                  </td>
                  <td class="px-6 py-4 text-right font-bold text-white text-base">
                     {{ report.rolls | number }}
                  </td>
                  <td class="px-6 py-4 text-right font-mono text-gray-400">
                     {{ report.meters | number }}
                  </td>
                  <td class="px-6 py-4 text-center">
                     <span *ngIf="report.demasiaRolls > 0" class="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                        {{ report.demasiaRolls }} und
                     </span>
                     <span *ngIf="report.demasiaRolls === 0" class="text-gray-600 text-xs">-</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button class="text-gray-500 hover:text-teal-400 p-2 hover:bg-teal-500/10 rounded-lg transition-all"><span class="material-icons">edit</span></button>
                  </td>
                </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- FORM VIEW (FULL SCREEN OVERLAY) -->
    <div *ngIf="showForm" class="fixed inset-0 z-50 bg-[#121921] text-gray-100 font-sans flex flex-col overflow-auto animate-fadeIn">
        
        <!-- Header -->
        <header class="w-full bg-[#1a2332] border-b border-gray-800 h-20 flex items-center justify-between px-6 shadow-md z-50 sticky top-0 shrink-0">
            <div class="flex items-center gap-4">
                <button (click)="closeForm()" class="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors group border border-gray-600">
                    <span class="material-icons text-gray-300 group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                </button>
                <div class="flex flex-col">
                    <h1 class="text-xl font-bold uppercase tracking-tight text-white leading-tight">Reporte de Empaquetado</h1>
                    <div class="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                        <span class="text-blue-400 font-bold">Estación 4</span>
                        <span class="w-1 h-1 rounded-full bg-gray-500"></span>
                        <span>Registro Final</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <div class="hidden md:flex flex-col items-end mr-2">
                    <span class="text-sm font-bold text-gray-200">{{ isOperatorMode ? state.activeOperatorName() : state.userName() }}</span>
                    <span class="text-xs text-gray-500 uppercase tracking-wider">{{ state.currentShift() || 'Turno A' }}</span>
                </div>
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-lg border border-blue-500/30">
                    {{ getInitials(isOperatorMode ? state.activeOperatorName() : state.userName()) }}
                </div>
                <div class="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-900/30 border border-emerald-500/30 text-emerald-400">
                    <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span class="text-xs font-bold tracking-wide">ONLINE</span>
                </div>
            </div>
        </header>

        <!-- Content -->
        <main class="flex-grow w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            
            <!-- Datos Maestros -->
            <section class="bg-[#1a2332]/90 backdrop-blur-sm rounded-xl p-6 border border-gray-800 shadow-xl relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h2 class="text-blue-400 text-xs font-bold tracking-[0.15em] uppercase mb-4 flex items-center gap-2">
                    <span class="material-icons text-sm">assignment</span>
                    Datos Maestros de Producción
                </h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                    <!-- Fecha (Editable) -->
                    <div class="group">
                        <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Fecha</label>
                        <input type="date" [(ngModel)]="currentReport.date" 
                               class="w-full bg-[#121921] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                    </div>

                    <!-- Empaquetador (Editable) -->
                    <div class="group">
                        <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Empaquetador</label>
                        <input type="text" [(ngModel)]="currentReport.operator" 
                               class="w-full bg-[#121921] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                    </div>

                    <!-- Turno (Editable) -->
                    <div class="group">
                        <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Turno</label>
                        <select [(ngModel)]="currentReport.shift" 
                                class="w-full bg-[#121921] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none">
                            <option value="Día - A">Día - A</option>
                            <option value="Noche - B">Noche - B</option>
                            <option value="Día - C">Día - C</option>
                            <option value="Noche - D">Noche - D</option>
                        </select>
                    </div>

                    <!-- Orden de Trabajo (Searchable) -->
                    <div class="group relative">
                        <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Orden de Trabajo (OT)</label>
                        <div class="relative">
                            <input type="text" [(ngModel)]="currentReport.ot" (input)="searchOt($event)" (focus)="searchOt($event)" (blur)="hideSuggestions()"
                                   class="w-full bg-[#121921] border border-blue-500/50 rounded-lg pl-3 pr-8 py-2.5 text-white text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase placeholder-gray-600" 
                                   placeholder="BUSCAR OT...">
                            <span class="absolute right-2.5 top-2.5 material-icons text-gray-500 text-sm">search</span>
                        </div>
                        
                        <!-- Suggestions Dropdown -->
                        <div *ngIf="showOtSuggestions && otSuggestions.length > 0" 
                             class="absolute z-50 left-0 right-0 mt-1 bg-[#1a2332] border border-gray-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                            <div *ngFor="let suggestion of otSuggestions" (mousedown)="selectOt(suggestion)"
                                 class="p-3 hover:bg-blue-600/20 cursor-pointer border-b border-gray-800 last:border-0 flex flex-col group">
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-blue-400 text-sm group-hover:text-blue-300">{{ suggestion.OT }}</span>
                                    <span class="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{{ suggestion.Estado_pedido }}</span>
                                </div>
                                <span class="text-xs text-gray-300 font-medium truncate mt-0.5">{{ suggestion['Razon Social'] }}</span>
                                <span class="text-[10px] text-gray-500 truncate">{{ suggestion.descripcion }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Cliente (Editable) -->
                    <div class="group lg:col-span-2">
                        <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Cliente</label>
                        <input type="text" [(ngModel)]="currentReport.client" 
                               class="w-full bg-[#121921] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all truncate" placeholder="Razón Social">
                    </div>

                    <!-- Descripción (Editable) -->
                    <div class="group lg:col-span-6">
                        <label class="block text-xs text-gray-500 uppercase font-semibold mb-1">Descripción del Producto</label>
                        <input type="text" [(ngModel)]="currentReport.description" 
                               class="w-full bg-[#121921] border border-gray-700 rounded-lg p-2.5 text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all flex items-center gap-2" placeholder="Detalle del producto...">
                    </div>
                </div>
            </section>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- Left Column: Status & Packaging Data -->
                <div class="lg:col-span-2 space-y-6">
                    
                    <!-- Lote Status -->
                    <section class="bg-[#1a2332] rounded-xl p-6 border border-gray-800 shadow-xl">
                        <h3 class="text-gray-400 text-xs font-bold tracking-[0.15em] uppercase mb-4">Estado del Lote</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <!-- Complete Radio -->
                            <div (click)="currentReport.status = 'Completo'" 
                                 class="cursor-pointer w-full p-4 rounded-lg border transition-all flex items-center gap-4 group"
                                 [ngClass]="currentReport.status === 'Completo' ? 'bg-[#064e3b]/20 border-emerald-500/50' : 'bg-[#121921] border-gray-700 hover:border-gray-600'">
                                <div class="w-12 h-12 rounded-full flex items-center justify-center border transition-colors"
                                     [ngClass]="currentReport.status === 'Completo' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-gray-800 border-gray-600 text-gray-500'">
                                    <span class="material-icons text-2xl">check_circle</span>
                                </div>
                                <div>
                                    <div class="font-bold text-lg" [class.text-emerald-400]="currentReport.status === 'Completo'" [class.text-gray-300]="currentReport.status !== 'Completo'">Completo</div>
                                    <div class="text-xs uppercase tracking-wider font-semibold" 
                                         [ngClass]="currentReport.status === 'Completo' ? 'text-emerald-500/70' : 'text-gray-500'">
                                         Producción Finalizada
                                    </div>
                                </div>
                                <div class="ml-auto" *ngIf="currentReport.status === 'Completo'">
                                    <span class="material-icons text-emerald-500">radio_button_checked</span>
                                </div>
                            </div>

                            <!-- Partial Radio -->
                            <div (click)="currentReport.status = 'Parcial'" 
                                 class="cursor-pointer w-full p-4 rounded-lg border transition-all flex items-center gap-4 group"
                                 [ngClass]="currentReport.status === 'Parcial' ? 'bg-[#78350f]/20 border-amber-500/50' : 'bg-[#121921] border-gray-700 hover:border-gray-600'">
                                <div class="w-12 h-12 rounded-full flex items-center justify-center border transition-colors"
                                     [ngClass]="currentReport.status === 'Parcial' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-gray-800 border-gray-600 text-gray-500'">
                                    <span class="material-icons text-2xl">timelapse</span>
                                </div>
                                <div>
                                    <div class="font-bold text-lg" [class.text-amber-400]="currentReport.status === 'Parcial'" [class.text-gray-300]="currentReport.status !== 'Parcial'">Parcial</div>
                                    <div class="text-xs uppercase tracking-wider font-semibold"
                                         [ngClass]="currentReport.status === 'Parcial' ? 'text-amber-500/70' : 'text-gray-500'">
                                         Cierre de Turno
                                    </div>
                                </div>
                                <div class="ml-auto" *ngIf="currentReport.status === 'Parcial'">
                                    <span class="material-icons text-amber-500">radio_button_checked</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- Packaging Data -->
                    <section class="bg-[#1a2332] rounded-xl border border-gray-800 shadow-xl overflow-hidden">
                        <div class="bg-gray-800/50 p-4 border-b border-gray-700 flex items-center gap-3">
                            <div class="p-2 bg-teal-900/40 rounded-lg border border-teal-500/30">
                                <span class="material-icons text-teal-400">inventory_2</span>
                            </div>
                            <h3 class="text-white font-bold text-lg">EMPAQUETADO</h3>
                        </div>
                        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">Cantidad de Rollos</label>
                                <div class="relative">
                                    <input type="number" [(ngModel)]="currentReport.rolls" placeholder="000"
                                           class="w-full bg-[#121921] border border-gray-600 rounded-lg p-3 pl-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-mono text-lg outline-none">
                                    <span class="absolute right-4 top-3.5 text-xs text-gray-500 font-bold">UND</span>
                                </div>
                                <p class="text-xs text-gray-500 mt-1 ml-1">Total de unidades paletizadas</p>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">Metros Lineales (mll)</label>
                                <div class="relative">
                                    <input type="number" [(ngModel)]="currentReport.meters" placeholder="0000.00"
                                           class="w-full bg-[#121921] border border-gray-600 rounded-lg p-3 pl-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-mono text-lg outline-none">
                                    <span class="absolute right-4 top-3.5 text-xs text-gray-500 font-bold">MLL/ROLLO</span>
                                </div>
                                <p class="text-xs text-gray-500 mt-1 ml-1">Longitud promedio por unidad</p>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- Right Column: Demasia -->
                <div class="space-y-6">
                    <section class="bg-[#1a2332] rounded-xl border border-gray-800 shadow-xl overflow-hidden h-full flex flex-col">
                        <div class="bg-gray-800/50 p-4 border-b border-gray-700 flex items-center gap-3">
                            <div class="p-2 bg-purple-900/40 rounded-lg border border-purple-500/30">
                                <span class="material-icons text-purple-400">add_circle_outline</span>
                            </div>
                            <h3 class="text-white font-bold text-lg">DEMASÍA</h3>
                        </div>
                        <div class="p-6 flex flex-col gap-6 flex-grow">
                            <div class="p-3 bg-purple-900/10 border border-purple-800/30 rounded-lg">
                                <p class="text-purple-300 text-xs leading-relaxed flex items-start gap-2">
                                    <span class="material-icons text-sm mt-0.5">info</span>
                                    <span>Registrar aquí el material sobrante recuperable que no cumple con el estándar de rollo completo.</span>
                                </p>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">Cantidad de Rollos</label>
                                <div class="relative">
                                    <input type="number" [(ngModel)]="currentReport.demasiaRolls" placeholder="0"
                                           class="w-full bg-[#121921] border border-gray-600 rounded-lg p-3 pl-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-mono text-lg outline-none">
                                    <span class="absolute right-4 top-3.5 text-xs text-gray-500 font-bold">UND</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">Metros Lineales (mll)</label>
                                <div class="relative">
                                    <input type="number" [(ngModel)]="currentReport.demasiaMeters" placeholder="0.00"
                                           class="w-full bg-[#121921] border border-gray-600 rounded-lg p-3 pl-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-mono text-lg outline-none">
                                    <span class="absolute right-4 top-3.5 text-xs text-gray-500 font-bold">MLL TOTAL</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <!-- Footer Section -->
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 pb-8">
                <section class="lg:col-span-3 bg-[#1a2332] rounded-xl p-6 border border-gray-800 shadow-xl">
                    <label class="flex items-center gap-2 text-xs text-gray-400 uppercase font-bold mb-3 ml-1">
                        <span class="material-icons text-sm">edit_note</span>
                        Observaciones Generales
                    </label>
                    <textarea [(ngModel)]="currentReport.notes" 
                              class="w-full bg-[#121921] border border-gray-600 rounded-lg p-4 text-gray-300 placeholder-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none h-24 outline-none" 
                              placeholder="Ingrese comentarios adicionales sobre el proceso de empaquetado, incidencias menores o notas para el siguiente turno..."></textarea>
                </section>
                <section class="lg:col-span-1 flex flex-col justify-end gap-4">
                    <button (click)="closeForm()" class="w-full py-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition-all font-bold uppercase tracking-wide text-sm">
                        Cancelar
                    </button>
                    <button (click)="saveReport()" class="w-full py-4 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white shadow-lg shadow-blue-900/50 transition-all transform active:scale-95 font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 group">
                        <span class="material-icons group-hover:rotate-12 transition-transform">save</span>
                        Guardar Reporte
                    </button>
                </section>
            </div>

        </main>
    </div>
  `,
  styles: [`
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #121921; }
    ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
  `]
})
export class ReportsPackagingComponent implements OnInit {
  state = inject(StateService);
  ordersService = inject(OrdersService);
  router: Router = inject(Router);

  showForm = false;
  isOperatorMode = false;
  
  // Current Form Data
  currentReport: any = {};

  // Search Logic
  otSuggestions: any[] = [];
  showOtSuggestions = false;

  ngOnInit() {
    // Check if accessed directly via operator route
    this.isOperatorMode = this.router.url.includes('/operator/packaging');
    if (this.isOperatorMode) {
        if (!this.state.hasActiveOperator() || !this.state.isProcessAllowedForActiveOperator('packaging')) {
            this.router.navigate(['/operator']);
            return;
        }
        this.createNewReport();
        this.showForm = true;
    }
  }

  createNewReport() {
     // Default initialization with current date and user info
     // Pre-filling with a suggested OT for convenience, but it is editable
     const ot = this.ordersService.ots.find(o => o.Estado_pedido === 'EN PROCESO' || o.Estado_pedido === 'PENDIENTE') || null;
     
     this.currentReport = {
        id: null,
        date: new Date().toISOString().split('T')[0], // yyyy-MM-dd string for input[type=date]
        operator: this.isOperatorMode ? this.state.activeOperatorName() : this.state.userName(),
        shift: this.state.currentShift() || 'Día - A', // Fix: Call signal
        ot: ot ? ot.OT : '',
        client: ot ? ot['Razon Social'] : '',
        description: ot ? (ot.descripcion || '') : '',
        status: 'Completo', // Completo | Parcial
        rolls: null,
        meters: null,
        demasiaRolls: null,
        demasiaMeters: null,
        notes: ''
     };
     this.showForm = true;
  }

  editReport(report: any) {
     this.currentReport = { 
         ...report,
         date: new Date(report.date).toISOString().split('T')[0], // Convert Date obj to string
         operator: report.operator || (this.isOperatorMode ? this.state.activeOperatorName() : this.state.userName()),
         shift: report.shift || this.state.currentShift() || 'Día - A' // Fix: Call signal
     };
     this.showForm = true;
  }

  // --- SEARCH LOGIC ---
  searchOt(event: any) {
      const query = (event.target.value || '').toLowerCase();
      this.showOtSuggestions = true;
      
      if (!query) {
          // Show recent OTs if query is empty
          this.otSuggestions = this.ordersService.ots.slice(0, 5); 
          return;
      }
      
      this.otSuggestions = this.ordersService.ots.filter(ot => 
          String(ot.OT).toLowerCase().includes(query) || 
          String(ot['Razon Social']).toLowerCase().includes(query)
      ).slice(0, 8);
  }

  selectOt(ot: any) {
      this.currentReport.ot = ot.OT;
      this.currentReport.client = ot['Razon Social'];
      this.currentReport.description = ot.descripcion;
      this.showOtSuggestions = false;
  }

  hideSuggestions() {
      // Small delay to allow click event on suggestion to fire first
      setTimeout(() => {
          this.showOtSuggestions = false;
      }, 200);
  }

  closeForm() {
      if (this.isOperatorMode) {
          this.router.navigate(['/operator']);
      } else {
          this.showForm = false;
      }
  }

  saveReport() {
     if(!this.currentReport.rolls) {
        alert("Debe ingresar la cantidad de rollos.");
        return;
     }
     
     // Save logic would go here (update service/backend)
     alert("Reporte guardado exitosamente.");
     this.closeForm();
  }

  getInitials(name: string): string {
     return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
  }

  // Mock Reports for List
  get reports() {
     const ots = this.ordersService.ots.slice(0, 10);
     return ots.map((ot, i) => ({
        id: `PKG-${1000+i}`,
        date: new Date(new Date().getTime() - i * 86400000),
        ot: ot.OT,
        client: ot['Razon Social'],
        description: ot.descripcion,
        status: i % 3 === 0 ? 'Parcial' : 'Completo',
        rolls: Math.floor(Math.random() * 50) + 10,
        meters: Math.floor(Math.random() * 5000) + 1000,
        demasiaRolls: i % 4 === 0 ? Math.floor(Math.random() * 5) : 0,
        demasiaMeters: i % 4 === 0 ? Math.floor(Math.random() * 500) : 0,
        notes: ''
     }));
  }
}
