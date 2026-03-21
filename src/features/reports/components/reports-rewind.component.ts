
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../../services/state.service';
import { OrdersService } from '../../orders/services/orders.service';
import { OT } from '../../orders/models/orders.models';

@Component({
  selector: 'app-reports-rewind',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-[1920px] mx-auto pb-20">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 class="text-xl font-bold text-brand-dark flex items-center gap-2">
            <span class="material-icons text-orange-500">sync</span>
            Reportes de Rebobinado
          </h1>
          <p class="text-sm text-gray-500">Acabado final, conteo y empaquetado</p>
        </div>
        <div class="flex gap-2">
           <div class="relative">
              <span class="material-icons absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
              <input type="text" placeholder="Buscar OT..." 
                class="pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-brand-action w-64">
           </div>
           <button class="bg-brand-action text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-blue-600 shadow-sm">
              <span class="material-icons text-sm">add</span> Nuevo Reporte
           </button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th class="px-6 py-4">Fecha</th>
                <th class="px-6 py-4">OT</th>
                <th class="px-6 py-4">Cliente / Descripción</th>
                <th class="px-6 py-4">Máquina</th>
                <th class="px-6 py-4 text-right">Total Rollos</th>
                <th class="px-6 py-4 text-right">Etiq. Total</th>
                <th class="px-6 py-4 text-right">Metros Lineales</th>
                <th class="px-6 py-4 text-center">Calidad</th>
                <th class="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let report of reports" class="hover:bg-orange-50 transition-colors group cursor-default">
                  <td class="px-6 py-4 text-gray-700 font-medium">
                    {{ report.date | date:'dd/MM/yyyy' }}
                  </td>
                  <td class="px-6 py-4">
                     <span class="font-bold text-orange-800 bg-orange-50 px-2 py-1 rounded border border-orange-100">{{ report.ot }}</span>
                  </td>
                  <td class="px-6 py-4">
                     <div class="font-bold text-gray-800">{{ report.client }}</div>
                     <div class="text-xs text-gray-500 truncate max-w-[200px]">{{ report.description }}</div>
                  </td>
                  <td class="px-6 py-4 text-gray-600">
                     {{ report.machine }}
                  </td>
                  <td class="px-6 py-4 text-right font-bold text-gray-800">
                     {{ report.rolls | number }}
                  </td>
                  <td class="px-6 py-4 text-right font-bold text-gray-800">
                     {{ report.totalLabels | number }}
                  </td>
                   <td class="px-6 py-4 text-right font-mono text-gray-600">
                     {{ report.meters | number }}
                  </td>
                  <td class="px-6 py-4 text-center">
                     <span class="material-icons text-sm" 
                        [class.text-green-500]="report.qualityCheck" 
                        [class.text-gray-300]="!report.qualityCheck">
                        {{ report.qualityCheck ? 'check_circle' : 'pending' }}
                     </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button class="text-gray-400 hover:text-orange-600 p-1"><span class="material-icons">visibility</span></button>
                  </td>
                </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ReportsRewindComponent {
  state = inject(StateService);
  ordersService = inject(OrdersService);

  get reports() {
    const ots = this.ordersService.ots.slice(5, 20);

    return ots.map((ot, index) => {
      const machines = ['REBOBINADORA 1', 'REBOBINADORA 2', 'ROTOFLEX', 'REB EVO'];
      const machine = machines[index % machines.length];
      const rolls = Math.floor(Math.random() * 50) + 5;
      const labelsPerRoll = Math.floor(Math.random() * 2000) + 500;
      const totalLabels = rolls * labelsPerRoll;
      const meters = Math.floor(totalLabels * 0.05);
      const date = new Date();
      date.setDate(date.getDate() - (index % 3));

      return {
        id: `REP-RBB-${800 + index}`,
        date: date,
        ot: ot.OT,
        client: ot['Razon Social'],
        description: ot.descripcion,
        machine: machine,
        rolls,
        totalLabels,
        meters,
        qualityCheck: index % 5 !== 0 
      };
    });
  }
}
