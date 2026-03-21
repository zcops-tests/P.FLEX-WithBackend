
import { Component, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OT } from '../models/orders.models';

@Component({
  selector: 'app-ot-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" (click)="cancel.emit()"></div>

      <div class="relative bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-700 text-slate-200 font-sans">
        
        <!-- Header -->
        <div class="px-8 py-6 border-b border-slate-700/50 flex justify-between items-start shrink-0 bg-[#1e293b]">
          <div class="flex gap-4">
             <div class="mt-1">
                <div class="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                   <span class="material-icons text-xl">add_circle</span>
                </div>
             </div>
             <div>
                <h2 class="text-xl font-bold text-white tracking-tight">
                  {{ otToEdit() ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo' }}
                </h2>
                <p class="text-sm text-slate-400 mt-1">Complete los campos requeridos para registrar la orden en el sistema.</p>
             </div>
          </div>
          <button (click)="cancel.emit()" class="text-slate-400 hover:text-white transition-colors">
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- Tabs -->
        <div class="px-8 border-b border-slate-700/50 flex gap-8 shrink-0 bg-[#1e293b]">
          <button (click)="activeTab = 'general'" 
             class="py-4 text-sm font-medium border-b-2 transition-colors focus:outline-none"
             [class.border-blue-500]="activeTab === 'general'"
             [class.text-blue-400]="activeTab === 'general'"
             [class.border-transparent]="activeTab !== 'general'"
             [class.text-slate-400]="activeTab !== 'general'"
             [class.hover:text-slate-200]="activeTab !== 'general'">
             <span class="material-icons text-base mr-2 align-text-bottom">description</span>
             Datos Generales
          </button>
          <button (click)="activeTab = 'specs'" 
             class="py-4 text-sm font-medium border-b-2 transition-colors focus:outline-none"
             [class.border-blue-500]="activeTab === 'specs'"
             [class.text-blue-400]="activeTab === 'specs'"
             [class.border-transparent]="activeTab !== 'specs'"
             [class.text-slate-400]="activeTab !== 'specs'"
             [class.hover:text-slate-200]="activeTab !== 'specs'">
             Especificaciones
          </button>
          <button (click)="activeTab = 'production'" 
             class="py-4 text-sm font-medium border-b-2 transition-colors focus:outline-none"
             [class.border-blue-500]="activeTab === 'production'"
             [class.text-blue-400]="activeTab === 'production'"
             [class.border-transparent]="activeTab !== 'production'"
             [class.text-slate-400]="activeTab !== 'production'"
             [class.hover:text-slate-200]="activeTab !== 'production'">
             Producción y Máquina
          </button>
          <button (click)="activeTab = 'other'" 
             class="py-4 text-sm font-medium border-b-2 transition-colors focus:outline-none"
             [class.border-blue-500]="activeTab === 'other'"
             [class.text-blue-400]="activeTab === 'other'"
             [class.border-transparent]="activeTab !== 'other'"
             [class.text-slate-400]="activeTab !== 'other'"
             [class.hover:text-slate-200]="activeTab !== 'other'">
             Otros / Obs
          </button>
        </div>

        <!-- Content -->
        <div class="p-8 overflow-y-auto flex-1 custom-scrollbar bg-[#1e293b]">
          
          <!-- GENERAL TAB -->
          <div *ngIf="activeTab === 'general'" class="grid grid-cols-12 gap-x-6 gap-y-8">
              
              <!-- Row 1 -->
              <div class="col-span-12 md:col-span-3">
                <label class="block text-xs font-bold text-slate-300 mb-2">Número OT <span class="text-red-500">*</span></label>
                <input type="text" [(ngModel)]="formData.OT" 
                       class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                       [readonly]="!!otToEdit()"
                       placeholder="Ej: OT-2023-001">
              </div>

              <div class="col-span-12 md:col-span-3">
                 <label class="block text-xs font-bold text-slate-300 mb-2">Estado <span class="text-red-500">*</span></label>
                 <div class="relative">
                    <select [(ngModel)]="formData.Estado_pedido" 
                            [disabled]="!otToEdit()"
                            class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="EN PROCESO">EN PROCESO</option>
                        <option value="PAUSADA">PAUSADA</option>
                        <option value="FINALIZADO">FINALIZADO</option>
                    </select>
                    <span class="absolute right-3 top-3.5 pointer-events-none text-slate-400 material-icons text-lg">expand_more</span>
                 </div>
                 <p *ngIf="!otToEdit()" class="text-[11px] text-slate-500 mt-2 italic">Las OTs nuevas inician como Pendientes.</p>
              </div>

              <div class="col-span-12 md:col-span-6">
                 <label class="block text-xs font-bold text-slate-300 mb-2">Razón Social (Cliente) <span class="text-red-500">*</span></label>
                 <div class="relative">
                    <input type="text" [(ngModel)]="formData['Razon Social']" 
                           class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg pl-4 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                    <span class="absolute right-3 top-3 text-slate-500 material-icons text-lg">search</span>
                 </div>
              </div>

              <!-- Row 2 -->
              <div class="col-span-12">
                 <label class="block text-xs font-bold text-slate-300 mb-2">Descripción del Producto <span class="text-red-500">*</span></label>
                 <input type="text" [(ngModel)]="formData.descripcion" 
                        class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
              </div>

              <!-- Row 3 -->
              <div class="col-span-12 md:col-span-4">
                 <label class="block text-xs font-bold text-slate-300 mb-2">Cantidad Pedida</label>
                 <input type="number" [(ngModel)]="formData['CANT PED']" 
                        class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
              </div>

              <div class="col-span-12 md:col-span-4">
                 <label class="block text-xs font-bold text-slate-300 mb-2">Unidad (Und)</label>
                 <input type="text" [(ngModel)]="formData.Und" 
                        class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
              </div>
          </div>

          <!-- SPECS TAB (Adapted to Dark Mode) -->
          <div *ngIf="activeTab === 'specs'" class="grid grid-cols-12 gap-6">
              <div class="col-span-12">
                 <label class="block text-xs font-bold text-slate-300 mb-2">Material / Sustrato</label>
                 <input type="text" [(ngModel)]="formData.Material" class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500">
              </div>
              <div class="col-span-12 md:col-span-6">
                 <label class="block text-xs font-bold text-slate-300 mb-2">Medida</label>
                 <input type="text" [(ngModel)]="formData.Medida" class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
              </div>
              <div class="col-span-12 md:col-span-6">
                 <label class="block text-xs font-bold text-slate-300 mb-2">Avance</label>
                 <input type="text" [(ngModel)]="formData.Avance" class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
              </div>
          </div>

          <!-- PRODUCTION TAB (Adapted to Dark Mode) -->
          <div *ngIf="activeTab === 'production'" class="grid grid-cols-12 gap-6">
               <div class="col-span-12 md:col-span-6">
                 <label class="block text-xs font-bold text-slate-300 mb-2">Máquina Asignada</label>
                 <div class="relative">
                    <select [(ngModel)]="formData.maquina" class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-blue-500">
                        <option value="">-- Sin Asignar --</option>
                        <option value="SUPERPRINT 1">SUPERPRINT 1</option>
                        <option value="SUPERPRINT 2">SUPERPRINT 2</option>
                        <option value="MARK ANDY 4120">MARK ANDY 4120</option>
                        <option value="TROQUELADORA 1">TROQUELADORA 1</option>
                        <option value="REBOBINADORA 1">REBOBINADORA 1</option>
                    </select>
                    <span class="absolute right-3 top-3.5 pointer-events-none text-slate-400 material-icons text-lg">expand_more</span>
                 </div>
              </div>
              <div class="col-span-12 md:col-span-6">
                 <label class="block text-xs font-bold text-blue-400 mb-2">Fecha Ingreso Planta</label>
                 <input type="date" [(ngModel)]="formData['FECHA INGRESO PLANTA']" class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500">
              </div>
          </div>

          <!-- OTHER TAB (Adapted to Dark Mode) -->
          <div *ngIf="activeTab === 'other'" class="grid grid-cols-12 gap-6">
               <div class="col-span-12">
                 <label class="block text-xs font-bold text-slate-300 mb-2">Glosa</label>
                 <textarea [(ngModel)]="formData.Glosa" rows="4" class="w-full bg-[#334155]/50 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"></textarea>
               </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-8 py-5 border-t border-slate-700/50 flex justify-end gap-3 shrink-0 bg-[#1e293b]">
          <button (click)="cancel.emit()" class="px-6 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 font-medium text-sm transition-colors">
            Cancelar
          </button>
          <button (click)="saveForm()" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all">
            <span class="material-icons text-lg">save</span> Guardar OT
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
  `]
})
export class OtFormComponent {
  otToEdit = input<OT | null>(null);
  save = output<Partial<OT>>();
  cancel = output<void>();

  activeTab: 'general' | 'specs' | 'production' | 'other' = 'general';
  formData: Partial<OT> = {};

  constructor() {
    effect(() => {
        const ot = this.otToEdit();
        if (ot) {
            this.formData = { ...ot };
        } else {
            this.formData = {
               OT: '',
               Estado_pedido: 'PENDIENTE',
               'Razon Social': '',
               descripcion: '',
               Und: 'MLL',
               'FECHA INGRESO PLANTA': new Date().toISOString().split('T')[0]
            };
        }
    });
  }

  saveForm() {
    if (!this.formData.OT || !this.formData.descripcion || !this.formData['Razon Social']) {
      alert('Por favor complete los campos obligatorios (OT, Cliente, Descripción).');
      return;
    }
    this.save.emit(this.formData);
  }
}
