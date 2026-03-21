
import { Component, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../services/inventory.service';
import { StockItem } from '../models/inventory.models';
import { ExcelService } from '../../../services/excel.service';

@Component({
  selector: 'app-inventory-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex-1 flex flex-col p-6 max-w-[1920px] mx-auto w-full overflow-hidden h-full bg-[#0f172a] text-slate-200">
          
      <!-- HEADER -->
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 flex-shrink-0">
        <div>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
               <span class="material-icons text-indigo-500 text-2xl">check_circle</span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-white">Stock Producto Terminado</h1>
          </div>
          <p class="text-slate-400 text-sm mt-1 ml-12">Gestión de despacho, cuarentena y almacenamiento final</p>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div class="relative group w-full sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="material-icons text-slate-500 group-focus-within:text-indigo-500 text-xl transition-colors">search</span>
            </div>
            <input [(ngModel)]="searchTerm" 
                   class="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg bg-[#1e293b] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all shadow-sm" 
                   placeholder="Buscar OT, Cliente..." type="text"/>
          </div>
          
          <input #fileInputStock type="file" (change)="handleImport($event)" accept=".xlsx, .xls, .csv" class="hidden">
          <button (click)="fileInputStock.click()" [disabled]="isLoading" 
                  class="inline-flex justify-center items-center px-4 py-2 border border-slate-700 shadow-sm text-sm font-medium rounded-lg text-slate-300 bg-[#1e293b] hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-indigo-500 transition-all disabled:opacity-50">
            <span class="material-icons text-lg mr-2">upload_file</span> Importar
          </button>

          <button (click)="openModal(null)" 
                  class="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-lg shadow-indigo-500/20 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a] focus:ring-indigo-500 transition-all">
            <span class="material-icons text-lg mr-2">add_task</span> Ingreso PT
          </button>
        </div>
      </header>

      <!-- KPI STATS -->
      <section class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 shrink-0">
         <div class="bg-[#1e293b] p-5 rounded-xl border border-slate-700/50 shadow-md">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Millares</span>
                <span class="material-icons text-indigo-500">inventory</span>
            </div>
            <p class="text-3xl font-black text-white">{{ stats.totalMillares | number:'1.0-2' }}</p>
         </div>
         
         <div class="bg-[#1e293b] p-5 rounded-xl border border-slate-700/50 shadow-md">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Cuarentena</span>
                <span class="material-icons text-yellow-500">biotech</span>
            </div>
            <p class="text-3xl font-black text-yellow-500">{{ stats.quarantine }}</p>
            <p class="text-[10px] text-yellow-400/70 mt-1" *ngIf="stats.quarantine > 0">Requiere liberación de Calidad</p>
         </div>

         <div class="bg-[#1e293b] p-5 rounded-xl border border-slate-700/50 shadow-md">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disponibles (OK)</span>
                <span class="material-icons text-emerald-500">verified</span>
            </div>
            <p class="text-3xl font-black text-white">{{ stats.released | number }}</p>
         </div>

         <div class="bg-[#1e293b] p-5 rounded-xl border border-slate-700/50 shadow-md">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retenidos</span>
                <span class="material-icons text-red-500">block</span>
            </div>
            <p class="text-3xl font-black text-white">{{ stats.held }}</p>
         </div>
      </section>

      <!-- TABLE -->
      <div class="bg-[#1e293b] rounded-xl shadow-lg border border-slate-700/60 overflow-hidden flex-1 flex flex-col relative">
        <div class="overflow-auto custom-scrollbar flex-1">
          <table class="w-full text-sm text-left">
            <thead class="bg-[#020617]/50 text-slate-400 font-bold sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700">OT / Pallet</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700">Cliente / Producto</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700 text-center">Ubicación</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700 text-right">Cantidad</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700 text-center">Estado</th>
                <th class="px-6 py-4 text-[10px] uppercase tracking-widest border-b border-slate-700 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50 bg-[#1e293b]">
              <tr *ngFor="let item of filteredItems" 
                  class="hover:bg-slate-700/30 transition-colors group cursor-default">
                <td class="px-6 py-4">
                   <div class="flex flex-col">
                      <span class="text-sm font-bold text-indigo-400 font-mono">OT-{{ item.ot }}</span>
                      <span class="text-[10px] text-slate-500 font-mono mt-0.5">{{ item.palletId || 'S/N' }}</span>
                   </div>
                </td>
                <td class="px-6 py-4 text-slate-300 font-medium">
                   <div class="text-xs font-bold text-slate-400 uppercase mb-0.5">{{ item.client }}</div>
                   {{ item.product }}
                   <div class="text-[10px] text-slate-500 mt-0.5">Ingreso: {{ item.entryDate | date:'dd/MM/yyyy HH:mm' }}</div>
                </td>
                <td class="px-6 py-4 text-center">
                   <span class="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-xs font-mono text-slate-300">
                      {{ item.location }}
                   </span>
                </td>
                
                <!-- NEW QUANTITY COLUMN (Rollos & Millares) -->
                <td class="px-6 py-4 text-right">
                   <div class="flex flex-col items-end gap-1">
                      <div class="text-base font-bold text-white flex items-center gap-1.5">
                        {{ item.rolls || 0 | number }} <span class="text-[10px] font-normal text-slate-500 uppercase tracking-wide">Rollos</span>
                      </div>
                      <div class="text-xs font-medium text-indigo-300 flex items-center gap-1.5 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        {{ item.millares || 0 | number:'1.2-2' }} <span class="text-[9px] text-indigo-400/70 uppercase tracking-wide">Millares</span>
                      </div>
                   </div>
                </td>

                <td class="px-6 py-4 text-center">
                   <span class="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                      [ngClass]="getStatusClass(item.status)">
                      {{ item.status }}
                   </span>
                </td>
                <td class="px-6 py-4 text-right">
                   <button (click)="openModal(item)" class="text-slate-400 hover:text-indigo-400 transition-colors p-2 hover:bg-slate-700/50 rounded-lg">
                      <span class="material-icons">edit_note</span>
                   </button>
                </td>
              </tr>
              <tr *ngIf="filteredItems.length === 0">
                 <td colspan="6" class="p-12 text-center text-slate-500 italic">No se encontraron productos terminados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL: FINISHED GOODS FORM -->
      <div *ngIf="showModal" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog">
          <div class="bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-2xl border border-slate-700 flex flex-col overflow-hidden animate-fadeIn">
             <div class="px-6 py-4 border-b border-slate-700 bg-[#0f172a] flex justify-between items-center">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                   <span class="material-icons text-indigo-500">local_shipping</span>
                   {{ editingItem ? 'Gestionar Producto Terminado' : 'Ingreso a Almacén PT' }}
                </h3>
                <button (click)="showModal = false" class="text-slate-400 hover:text-white transition-colors"><span class="material-icons">close</span></button>
             </div>
             
             <div class="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                <div class="grid grid-cols-2 gap-4">
                   <div>
                      <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Orden de Trabajo (OT)</label>
                      <input [(ngModel)]="tempItem.ot" class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors" placeholder="Ej: 45001">
                   </div>
                   <div>
                      <label class="block text-xs font-bold text-slate-400 uppercase mb-2">ID Pallet / Lote</label>
                      <input [(ngModel)]="tempItem.palletId" class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors" placeholder="Generado Auto">
                   </div>
                </div>

                <div>
                   <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Cliente</label>
                   <input [(ngModel)]="tempItem.client" class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors">
                </div>

                <div>
                   <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Producto</label>
                   <input [(ngModel)]="tempItem.product" class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors">
                </div>

                <!-- DUAL INPUT FOR QUANTITY -->
                <div class="grid grid-cols-2 gap-4">
                   <div>
                      <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Cantidad de Rollos</label>
                      <div class="relative">
                          <input type="number" [(ngModel)]="tempItem.rolls" class="w-full bg-[#0f172a] border border-slate-600 rounded-lg pl-3 pr-12 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors font-mono">
                          <span class="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">UND</span>
                      </div>
                   </div>
                   <div>
                      <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Cantidad de Millares</label>
                      <div class="relative">
                          <input type="number" [(ngModel)]="tempItem.millares" class="w-full bg-[#0f172a] border border-slate-600 rounded-lg pl-3 pr-12 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors font-mono">
                          <span class="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">MLL</span>
                      </div>
                   </div>
                </div>

                <div>
                   <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Ubicación</label>
                   <input [(ngModel)]="tempItem.location" class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors" placeholder="Ej: DES-A-01">
                </div>

                <div>
                   <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Estado Calidad</label>
                   <div class="grid grid-cols-4 gap-2">
                      <button (click)="tempItem.status = 'Liberado'" class="py-2 rounded border text-xs font-bold transition-all" 
                         [ngClass]="tempItem.status === 'Liberado' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-500'">
                         LIBERADO
                      </button>
                      <button (click)="tempItem.status = 'Cuarentena'" class="py-2 rounded border text-xs font-bold transition-all"
                         [ngClass]="tempItem.status === 'Cuarentena' ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-500'">
                         CUARENTENA
                      </button>
                      <button (click)="tempItem.status = 'Retenido'" class="py-2 rounded border text-xs font-bold transition-all"
                         [ngClass]="tempItem.status === 'Retenido' ? 'bg-red-600 text-white border-red-500' : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-500'">
                         RETENIDO
                      </button>
                      <button (click)="tempItem.status = 'Despachado'" class="py-2 rounded border text-xs font-bold transition-all"
                         [ngClass]="tempItem.status === 'Despachado' ? 'bg-blue-600 text-white border-blue-500' : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-500'">
                         DESPACHADO
                      </button>
                   </div>
                </div>

                <div>
                   <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Notas / Observaciones</label>
                   <textarea [(ngModel)]="tempItem.notes" rows="2" class="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 outline-none resize-none"></textarea>
                </div>
             </div>

             <div class="px-6 py-4 bg-[#0f172a] border-t border-slate-700 flex justify-end gap-3">
                <button (click)="showModal = false" class="px-4 py-2 rounded-lg text-slate-300 font-bold hover:bg-slate-800 transition-colors">Cancelar</button>
                <button (click)="saveItem()" class="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-lg flex items-center gap-2 transition-all">
                   <span class="material-icons text-sm">save</span> Guardar
                </button>
             </div>
          </div>
      </div>

      <!-- IMPORT MODAL -->
      <div *ngIf="showImportPreviewModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true">
         <div class="bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-700 animate-fadeIn">
            
            <!-- Header -->
            <div class="bg-[#0f172a] px-6 py-4 border-b border-slate-700 flex justify-between items-center shrink-0">
               <div>
                   <h3 class="font-bold text-white text-lg flex items-center gap-2">
                       <span class="material-icons text-blue-500">upload_file</span>
                       Previsualización de Importación (Stock PT)
                   </h3>
                   <p class="text-xs text-slate-400 mt-1">
                       Se han procesado {{ previewData.length + conflictsData.length }} registros en total.
                   </p>
               </div>
               <button (click)="cancelImport()" class="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                   <span class="material-icons">close</span>
               </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-hidden flex flex-col bg-[#1e293b]">
                
                <!-- Tabs/Summary -->
                <div class="px-6 py-3 bg-[#1e293b] border-b border-slate-700 flex gap-4 items-center">
                    <div class="px-4 py-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-2">
                        <span class="material-icons text-sm">check_circle</span>
                        {{ previewData.length }} Válidos
                    </div>
                    <div class="px-4 py-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-2" [class.animate-pulse]="conflictsData.length > 0">
                        <span class="material-icons text-sm">warning</span>
                        {{ conflictsData.length }} Conflictos Detectados
                    </div>
                    <p class="text-xs text-slate-500 ml-auto italic">
                        Los registros con conflictos (falta de OT o Cliente) se marcarán para revisión manual.
                    </p>
                </div>

                <!-- Table Preview -->
                <div class="flex-1 overflow-auto custom-scrollbar p-6">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="text-xs text-slate-400 uppercase bg-[#0f172a] sticky top-0 z-10 font-bold tracking-wider">
                            <tr>
                                <th class="px-4 py-3 border-b border-slate-700 w-16 text-center">#</th>
                                <th class="px-4 py-3 border-b border-slate-700 w-32 text-center">Estado Imp.</th>
                                <th class="px-4 py-3 border-b border-slate-700">OT</th>
                                <th class="px-4 py-3 border-b border-slate-700">Cliente</th>
                                <th class="px-4 py-3 border-b border-slate-700">Producto</th>
                                <th class="px-4 py-3 border-b border-slate-700 text-right">Rollos</th>
                                <th class="px-4 py-3 border-b border-slate-700 text-right">Millares</th>
                                <th class="px-4 py-3 border-b border-slate-700 text-center">Estado Calidad</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-700">
                            <!-- Conflicts First -->
                            <tr *ngFor="let item of conflictsData; let i = index" class="bg-red-500/5 hover:bg-red-500/10 transition-colors">
                                <td class="px-4 py-2 text-slate-500 font-mono text-xs text-center">{{ i + 1 }}</td>
                                <td class="px-4 py-2 text-center">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wide">
                                        Falta Dato
                                    </span>
                                </td>
                                <td class="px-4 py-2 font-mono font-bold" [ngClass]="item.ot ? 'text-white' : 'text-red-500 italic'">{{ item.ot || '(VACÍO)' }}</td>
                                <td class="px-4 py-2" [ngClass]="item.client ? 'text-slate-300' : 'text-red-500 italic'">{{ item.client || '(VACÍO)' }}</td>
                                <td class="px-4 py-2 text-slate-400">{{ item.product || '---' }}</td>
                                <td class="px-4 py-2 text-right text-slate-300">{{ item.rolls | number }}</td>
                                <td class="px-4 py-2 text-right text-slate-300">{{ item.millares | number }}</td>
                                <td class="px-4 py-2 text-center text-slate-400 text-xs">{{ item.status }}</td>
                            </tr>
                            <!-- Valid Items -->
                            <tr *ngFor="let item of previewData; let i = index" class="hover:bg-slate-700/30 transition-colors">
                                <td class="px-4 py-2 text-slate-500 font-mono text-xs text-center">{{ conflictsData.length + i + 1 }}</td>
                                <td class="px-4 py-2 text-center">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">OK</span>
                                </td>
                                <td class="px-4 py-2 font-mono text-white font-bold">{{ item.ot }}</td>
                                <td class="px-4 py-2 text-slate-300">{{ item.client }}</td>
                                <td class="px-4 py-2 text-slate-400">{{ item.product }}</td>
                                <td class="px-4 py-2 text-right text-slate-300 font-mono">{{ item.rolls | number }}</td>
                                <td class="px-4 py-2 text-right text-slate-300 font-mono">{{ item.millares | number }}</td>
                                <td class="px-4 py-2 text-center">
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">{{ item.status }}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Footer -->
            <div class="bg-[#0f172a] px-6 py-4 border-t border-slate-700 flex justify-end gap-4 shrink-0">
               <button (click)="cancelImport()" class="px-6 py-2.5 rounded-lg border border-slate-600 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-colors">
                   Cancelar Importación
               </button>
               <button (click)="confirmImport()" class="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all">
                   <span class="material-icons text-sm">save_alt</span>
                   Importar Todo (Resolver Conflictos Después)
               </button>
            </div>
         </div>
      </div>

    </div>
  `,
  styles: [`
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #121921; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
  `]
})
export class InventoryStockComponent {
  inventoryService = inject(InventoryService);
  excelService = inject(ExcelService);
  cdr = inject(ChangeDetectorRef);
  ngZone = inject(NgZone);
  
  stockItems: StockItem[] = [];
  searchTerm = '';
  
  // Modal
  showModal = false;
  editingItem: boolean = false;
  tempItem: Partial<StockItem> = {};

  // Import State
  isLoading = false;
  showImportPreviewModal = false;
  previewData: StockItem[] = [];
  conflictsData: StockItem[] = [];

  constructor() {
    this.inventoryService.stockItems$.subscribe(items => this.stockItems = items);
  }

  get filteredItems() {
     const term = this.searchTerm.toLowerCase();
     return this.stockItems.filter(i => 
        !term || 
        i.ot.toLowerCase().includes(term) || 
        i.client.toLowerCase().includes(term) ||
        i.product.toLowerCase().includes(term)
     );
  }

  get stats() {
     return {
        totalMillares: this.stockItems.reduce((acc, i) => acc + (i.millares || 0), 0),
        quarantine: this.stockItems.filter(i => i.status === 'Cuarentena').length,
        released: this.stockItems.filter(i => i.status === 'Liberado').length,
        held: this.stockItems.filter(i => i.status === 'Retenido').length
     };
  }

  getStatusClass(status: string): string {
     switch(status) {
        case 'Liberado': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        case 'Cuarentena': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
        case 'Retenido': return 'bg-red-500/10 text-red-400 border border-red-500/20';
        case 'Despachado': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20 line-through decoration-blue-500';
        default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
     }
  }

  openModal(item: StockItem | null) {
     this.editingItem = !!item;
     this.tempItem = item ? { ...item } : { 
        id: Math.random().toString(36).substr(2, 9),
        ot: '',
        client: '',
        product: '',
        status: 'Cuarentena',
        rolls: 0,
        millares: 0,
        palletId: `PAL-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`
     };
     this.showModal = true;
  }

  saveItem() {
     if(!this.tempItem.ot || !this.tempItem.client) {
        alert('Complete la OT y el Cliente.');
        return;
     }
     
     const item = this.tempItem as StockItem;
     
     if (!this.editingItem) {
        item.entryDate = new Date().toISOString();
     }

     if (this.editingItem) {
        this.inventoryService.updateStock(item);
     } else {
        this.inventoryService.addStock(item);
     }
     this.showModal = false;
  }

  // --- IMPORT ---
  async handleImport(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    this.ngZone.runOutsideAngular(async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 300)); 
        const rawData = await this.excelService.readExcel(file);
        
        this.ngZone.run(() => {
            const { valid, conflicts } = this.inventoryService.normalizeStockData(rawData);
            this.previewData = valid;
            this.conflictsData = conflicts;
            this.showImportPreviewModal = true;
            this.isLoading = false;
            event.target.value = '';
        });
      } catch (error: any) {
        this.ngZone.run(() => {
            console.error('Error importing:', error);
            alert(`Error al leer el archivo: ${error.message}`);
            this.isLoading = false;
            event.target.value = '';
        });
      }
    });
  }

  confirmImport() {
      this.inventoryService.addStocks([...this.previewData, ...this.conflictsData]);
      alert(`Se importaron ${this.previewData.length + this.conflictsData.length} registros.`);
      this.cancelImport();
  }

  cancelImport() {
      this.showImportPreviewModal = false;
      this.previewData = [];
      this.conflictsData = [];
  }
}
