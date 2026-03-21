
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-sync-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      <h1 class="text-2xl font-bold text-brand-dark mb-6 flex items-center gap-3">
        <span class="material-icons text-3xl text-gray-400">sync</span>
        Centro de Sincronización
      </h1>

      <!-- Status Card -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8 text-center">
         <div class="inline-flex p-6 rounded-full bg-green-50 mb-4">
            <span class="material-icons text-6xl text-brand-success">wifi</span>
         </div>
         <h2 class="text-xl font-bold text-gray-800">Conectado y Sincronizado</h2>
         <p class="text-gray-500 mt-2">Todos los registros han sido subidos a la nube correctamente.</p>
         <p class="text-xs text-gray-400 mt-1">Última sincronización: Hace 2 minutos</p>

         <button class="mt-6 px-6 py-2 border border-brand-action text-brand-action rounded hover:bg-blue-50 font-bold text-sm transition-colors">
           Forzar Sincronización Manual
         </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Local Pending -->
        <div>
          <h3 class="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-brand-warning"></span>
            Cola de Envío (Pendientes)
          </h3>
          <div class="bg-white rounded border border-gray-200 overflow-hidden">
             <div class="p-8 text-center text-gray-400">
               <span class="material-icons text-4xl mb-2">inbox</span>
               <p class="text-sm">No hay registros pendientes de envío.</p>
             </div>
          </div>
        </div>

        <!-- History/Conflicts -->
        <div>
          <h3 class="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-brand-critical"></span>
            Conflictos y Errores
          </h3>
          <div class="bg-white rounded border border-gray-200 overflow-hidden">
             <div class="p-8 text-center text-gray-400">
               <span class="material-icons text-4xl mb-2">check_circle</span>
               <p class="text-sm">No se han detectado conflictos recientes.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SyncCenterComponent {
  state = inject(StateService);
}
