
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OT } from '../models/orders.models';

@Component({
  selector: 'app-ot-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-gray-900/70 backdrop-blur-sm transition-opacity" (click)="close.emit()"></div>

      <!-- Modal Container -->
      <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all border border-gray-300">
        
        <!-- Header -->
        <div class="bg-white border-b border-gray-200 p-6 flex justify-between items-start flex-shrink-0">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h2 class="text-2xl font-black text-gray-900 font-mono tracking-tight">OT #{{ ot().OT }}</h2>
              <span [ngClass]="{
                'bg-blue-100 text-blue-800 border border-blue-200': ot().Estado_pedido === 'EN PROCESO',
                'bg-gray-100 text-gray-800 border border-gray-300': ot().Estado_pedido === 'PENDIENTE',
                'bg-green-100 text-green-800 border border-green-200': ot().Estado_pedido === 'FINALIZADO',
                'bg-yellow-100 text-yellow-800 border border-yellow-200': ot().Estado_pedido === 'PAUSADA'
              }" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                {{ ot().Estado_pedido }}
              </span>
            </div>
            <p class="text-gray-700 font-semibold text-lg">{{ ot()['Razon Social'] }} <span class="text-gray-400 font-normal mx-2">|</span> {{ ot().descripcion }}</p>
          </div>
          <button (click)="close.emit()" class="text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors border border-transparent hover:border-red-100" title="Cerrar ventana">
            <span class="material-icons text-2xl">close</span>
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="bg-gray-50 border-b border-gray-200 px-6 flex gap-8 flex-shrink-0 overflow-x-auto">
          <button (click)="activeTab = 'resumen'" 
            [class.text-brand-action]="activeTab === 'resumen'" 
            [class.border-brand-action]="activeTab === 'resumen'"
            [class.text-gray-700]="activeTab !== 'resumen'"
            class="py-4 text-sm font-bold border-b-4 border-transparent hover:text-brand-action transition-colors whitespace-nowrap focus:outline-none focus:text-brand-action">
            Ficha Técnica
          </button>
          <button (click)="activeTab = 'materiales'" 
            [class.text-brand-action]="activeTab === 'materiales'" 
            [class.border-brand-action]="activeTab === 'materiales'"
            [class.text-gray-700]="activeTab !== 'materiales'"
            class="py-4 text-sm font-bold border-b-4 border-transparent hover:text-brand-action transition-colors whitespace-nowrap focus:outline-none focus:text-brand-action">
            Materiales y Herramental
          </button>
          <button (click)="activeTab = 'logistica'" 
            [class.text-brand-action]="activeTab === 'logistica'" 
            [class.border-brand-action]="activeTab === 'logistica'"
            [class.text-gray-700]="activeTab !== 'logistica'"
            class="py-4 text-sm font-bold border-b-4 border-transparent hover:text-brand-action transition-colors whitespace-nowrap focus:outline-none focus:text-brand-action">
            Logística
          </button>
        </div>

        <!-- Content Area -->
        <div class="p-6 overflow-y-auto bg-gray-50 flex-1 custom-scrollbar">
          
          <div [ngSwitch]="activeTab">
            
            <!-- TAB: RESUMEN -->
            <div *ngSwitchCase="'resumen'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Main Info -->
                <div class="lg:col-span-2 space-y-6">
                  <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
                    <h3 class="font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2 text-lg">Especificaciones de Producto</h3>
                    <div class="grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
                      <div>
                        <span class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Material / Sustrato</span>
                        <span class="font-bold text-gray-900 text-base block">{{ ot().Material || '---' }}</span>
                      </div>
                      <div>
                        <span class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Medida Etiqueta</span>
                        <span class="font-bold text-gray-900 text-base block">{{ ot().Medida || '---' }}</span>
                      </div>
                      <div>
                        <span class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Acabado</span>
                        <span class="font-bold text-gray-900 text-base block">{{ ot().acabado || '---' }}</span>
                      </div>
                      <div>
                        <span class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Adhesivo</span>
                        <span class="font-bold text-gray-900 text-base block">{{ ot().adhesivo || '---' }}</span>
                      </div>
                       <div>
                        <span class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Forma</span>
                        <span class="font-bold text-gray-900 text-base block">{{ ot().forma || '---' }}</span>
                      </div>
                       <div>
                        <span class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Presentación</span>
                        <span class="font-bold text-gray-900 text-base block">{{ ot().forma_emb || '---' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Technical Dimensions -->
                  <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
                    <h3 class="font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2 text-lg">Dimensiones Técnicas</h3>
                    <div class="grid grid-cols-3 gap-4 text-center">
                        <div class="p-3 bg-gray-100 rounded border border-gray-200">
                           <span class="block text-xs font-bold text-gray-700 uppercase mb-1">Ancho</span>
                           <span class="font-black text-gray-900 text-base">{{ ot().Ancho }} mm</span>
                        </div>
                        <div class="p-3 bg-gray-100 rounded border border-gray-200">
                           <span class="block text-xs font-bold text-gray-700 uppercase mb-1">Avance</span>
                           <span class="font-black text-gray-900 text-base">{{ ot().Avance }} mm</span>
                        </div>
                        <div class="p-3 bg-gray-100 rounded border border-gray-200">
                           <span class="block text-xs font-bold text-gray-700 uppercase mb-1">Z (Desarrollo)</span>
                           <span class="font-black text-gray-900 text-base">{{ calculateZ(ot().desarrollo) }}</span>
                        </div>
                        <div class="p-3 bg-gray-100 rounded border border-gray-200">
                           <span class="block text-xs font-bold text-gray-700 uppercase mb-1">Separación</span>
                           <span class="font-black text-gray-900 text-base">{{ ot().sep_avance }} mm</span>
                        </div>
                         <div class="p-3 bg-gray-100 rounded border border-gray-200">
                           <span class="block text-xs font-bold text-gray-700 uppercase mb-1">Columnas</span>
                           <span class="font-black text-gray-900 text-base">{{ ot().num_colum }}</span>
                        </div>
                         <div class="p-3 bg-gray-100 rounded border border-gray-200">
                           <span class="block text-xs font-bold text-gray-700 uppercase mb-1">Diám. Tuco</span>
                           <span class="font-black text-gray-900 text-base">{{ ot().diametuco }}</span>
                        </div>
                    </div>
                  </div>
                </div>

                <!-- Side Actions / Notes -->
                <div class="space-y-4">
                  <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-300">
                    <h4 class="font-bold text-gray-800 mb-3 text-sm border-b border-gray-100 pb-2">Referencias Administrativas</h4>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 font-bold text-xs">Cotización:</span>
                            <span class="font-mono font-bold text-gray-900">{{ ot()['Nro. Cotizacion'] }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 font-bold text-xs">Pedido:</span>
                            <span class="font-mono font-bold text-gray-900">{{ ot().Pedido }}</span>
                        </div>
                         <div class="flex justify-between items-center">
                            <span class="text-gray-700 font-bold text-xs">O. Compra:</span>
                            <span class="font-mono font-bold text-gray-900">{{ ot()['ORDEN COMPRA'] }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-700 font-bold text-xs">Ficha:</span>
                            <span class="font-mono font-bold text-gray-900">{{ ot()['Nro. Ficha'] }}</span>
                        </div>
                    </div>
                  </div>

                  <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 shadow-sm">
                    <h4 class="font-bold text-yellow-900 mb-2 text-sm flex items-center gap-2">
                      <span class="material-icons text-sm">sticky_note_2</span> Observaciones
                    </h4>
                    <p class="text-sm text-yellow-950 leading-relaxed font-medium">
                      {{ ot().ObsDes || ot().ObsCot || 'Sin observaciones registradas.' }}
                    </p>
                  </div>
                   <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm">
                    <h4 class="font-bold text-blue-900 mb-2 text-sm flex items-center gap-2">
                      <span class="material-icons text-sm">info</span> Glosa
                    </h4>
                    <p class="text-sm text-blue-950 leading-relaxed font-medium">
                      {{ ot().Glosa || '---' }}
                    </p>
                  </div>
                </div>
            </div>

            <!-- TAB: MATERIALES -->
            <div *ngSwitchCase="'materiales'" class="space-y-6">
                <!-- Troqueles y Herramental -->
                <div class="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
                  <div class="bg-gray-100 px-6 py-4 border-b border-gray-300 flex justify-between items-center">
                    <h3 class="font-bold text-gray-800 text-sm uppercase tracking-wide">Herramental Asignado</h3>
                  </div>
                  <table class="w-full text-sm text-left">
                    <thead class="bg-gray-50 text-gray-800 border-b border-gray-200">
                      <tr>
                        <th class="px-6 py-3 font-bold">Tipo</th>
                        <th class="px-6 py-3 font-bold">Descripción / Código</th>
                        <th class="px-6 py-3 font-bold text-right">Detalle Técnico</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 font-bold text-gray-800">Troquel</td>
                        <td class="px-6 py-4 text-gray-900">{{ ot().troquel || ot().troquel_ficha || 'NO ESPECIFICADO' }}</td>
                        <td class="px-6 py-4 text-right text-xs font-mono font-bold text-gray-700 bg-gray-50/50">H: {{ ot().prepicado_h || 'NO' }} | V: {{ ot().prepicado_v || 'NO' }}</td>
                      </tr>
                      <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 font-bold text-gray-800">Impresión</td>
                        <td class="px-6 py-4 text-gray-900">{{ ot().impresion || ot().tipoimpre1 || '---' }}</td>
                        <td class="px-6 py-4 text-right text-xs font-bold text-gray-700 bg-gray-50/50">Colores: {{ ot().col_ficha }}</td>
                      </tr>
                       <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 font-bold text-gray-800">Sentido</td>
                        <td class="px-6 py-4 text-gray-900">{{ ot().SentidoFinal }}</td>
                        <td class="px-6 py-4 text-right text-xs font-bold text-gray-700 bg-gray-50/50">Bobinado</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
            </div>
            
            <!-- TAB: LOGISTICA -->
             <div *ngSwitchCase="'logistica'" class="bg-white p-6 rounded-lg shadow-sm border border-gray-300">
                 <h3 class="font-bold text-gray-800 mb-6 border-b border-gray-200 pb-2 text-lg">Datos de Entrega y Producción</h3>
                 <div class="grid grid-cols-2 gap-8">
                    <div class="p-4 bg-gray-50 rounded border border-gray-200">
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Fecha Entrega</label>
                        <div class="text-xl font-black text-gray-900">{{ ot()['FECHA ENT'] }}</div>
                    </div>
                    <div class="p-4 bg-blue-50 rounded border border-blue-200">
                        <label class="block text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Fecha Ingreso Planta</label>
                        <div class="text-xl font-black text-blue-900">{{ ot()['FECHA INGRESO PLANTA'] || '---' }}</div>
                    </div>
                    <div class="p-4 bg-gray-50 rounded border border-gray-200">
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Cantidad Pedida</label>
                        <div class="text-xl font-black text-gray-900">{{ ot()['CANT PED'] | number }} <span class="text-sm font-medium text-gray-700">{{ ot().Und }}</span></div>
                    </div>
                     <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Vendedor Responsable</label>
                        <div class="text-base font-bold text-gray-900">{{ ot().Vendedor }}</div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Línea de Producción</label>
                        <div class="text-base font-bold text-gray-900">{{ ot().Linea_produccion }}</div>
                    </div>
                 </div>
            </div>

          </div>
        </div>

        <!-- Footer Actions -->
        <div class="bg-gray-100 p-4 border-t border-gray-300 flex justify-end gap-4 flex-shrink-0">
          <button (click)="close.emit()" class="px-6 py-2.5 rounded border border-gray-400 bg-white text-gray-800 font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm focus:ring-2 focus:ring-gray-400">
            Cerrar
          </button>
          <button class="px-6 py-2.5 rounded bg-brand-action text-white font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2 focus:ring-2 focus:ring-blue-500 active:transform active:scale-95">
            <span class="material-icons text-base">print</span> Imprimir Ficha
          </button>
        </div>

      </div>
    </div>
  `
})
export class OtDetailComponent {
  ot = input.required<OT>();
  close = output<void>();
  
  activeTab = 'resumen';

  calculateZ(val: any): string {
    if (!val) return '---';
    const num = parseFloat(String(val));
    if (isNaN(num)) return String(val);
    return Math.round(num / 3.175).toString();
  }
}
