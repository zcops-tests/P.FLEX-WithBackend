
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../services/inventory.service';
import { RackConfig, RackBox } from '../models/inventory.models';

@Component({
  selector: 'app-inventory-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 overflow-auto h-full bg-gray-50 text-gray-800 w-full">
         <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 flex-shrink-0">
            <div>
              <h1 class="text-2xl font-bold text-brand-dark flex items-center gap-2">
                <span class="material-icons text-brand-action">map</span>
                Mapa de Almacén
              </h1>
              <p class="text-sm text-gray-500">Visualización de ubicaciones físicas</p>
            </div>
            
            <!-- TABS -->
            <div class="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                <button (click)="activeTab = 'clise'" 
                        class="px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2"
                        [class.bg-blue-500]="activeTab === 'clise'"
                        [class.text-white]="activeTab === 'clise'"
                        [class.text-gray-500]="activeTab !== 'clise'"
                        [class.hover:bg-gray-100]="activeTab !== 'clise'">
                    <span class="material-icons text-lg">layers</span>
                    Clisés
                </button>
                <button (click)="activeTab = 'die'" 
                        class="px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2"
                        [class.bg-purple-500]="activeTab === 'die'"
                        [class.text-white]="activeTab === 'die'"
                        [class.text-gray-500]="activeTab !== 'die'"
                        [class.hover:bg-gray-100]="activeTab !== 'die'">
                    <span class="material-icons text-lg">content_cut</span>
                    Troqueles
                </button>
            </div>
         </div>

         <!-- CLISES SECTION -->
         <div *ngIf="activeTab === 'clise'" class="animate-fadeIn">
            <div class="flex flex-wrap gap-8">
                <div *ngFor="let rack of cliseRacks" class="flex flex-col">
                   <h3 class="text-center font-bold text-gray-700 mb-2 bg-gray-200 rounded py-1">{{ rack.name }}</h3>
                   <div class="flex border-4 border-gray-300 bg-white p-1 gap-1" [class.flex-col]="rack.orientation === 'vertical'">
                      <div *ngFor="let level of rack.levels" class="flex gap-1" [class.flex-col]="rack.orientation === 'horizontal'">
                         <div *ngFor="let box of level.boxes" 
                              class="w-16 h-12 border border-gray-200 flex flex-col items-center justify-center text-[10px] cursor-pointer hover:bg-blue-50 transition-colors relative group"
                              [class.bg-green-100]="box.items.length > 0"
                              (click)="selectedBox = box">
                            <span class="font-bold text-gray-600">{{ box.label }}</span>
                            <span *ngIf="box.items.length > 0" class="text-xs font-black text-green-700">{{ box.items.length }}</span>
                         </div>
                      </div>
                   </div>
                </div>
            </div>
         </div>

         <!-- DIES SECTION -->
         <div *ngIf="activeTab === 'die'" class="animate-fadeIn">
            <div class="flex flex-wrap gap-8">
                <div *ngFor="let rack of dieRacks" class="flex flex-col">
                   <h3 class="text-center font-bold text-gray-700 mb-2 bg-gray-200 rounded py-1">{{ rack.name }}</h3>
                   <div class="flex border-4 border-gray-300 bg-white p-1 gap-1" [class.flex-col]="rack.orientation === 'vertical'">
                      <div *ngFor="let level of rack.levels" class="flex gap-1" [class.flex-col]="rack.orientation === 'horizontal'">
                         <div *ngFor="let box of level.boxes" 
                              class="w-16 h-12 border border-gray-200 flex flex-col items-center justify-center text-[10px] cursor-pointer hover:bg-purple-50 transition-colors relative group"
                              [class.bg-purple-100]="box.items.length > 0"
                              (click)="selectedBox = box">
                            <span class="font-bold text-gray-600">{{ box.label }}</span>
                            <span *ngIf="box.items.length > 0" class="text-xs font-black text-purple-700">{{ box.items.length }}</span>
                         </div>
                      </div>
                   </div>
                </div>
            </div>
         </div>

         <!-- SIDE PANEL CONTAINER -->
         <div *ngIf="selectedBox" class="fixed inset-0 z-[60] overflow-hidden" role="dialog" aria-modal="true">
            <div class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" (click)="selectedBox = null"></div>
            <div class="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
                <div class="w-screen max-w-md pointer-events-auto bg-white shadow-xl flex flex-col h-full animate-slideInRight z-10">
                    <div class="bg-gray-800 px-6 py-4 flex justify-between items-center shrink-0">
                        <div>
                            <h2 class="text-lg font-bold text-white">Ubicación {{ selectedBox.label }}</h2>
                            <p class="text-xs text-blue-200">{{ selectedBox.items.length }} Items</p>
                        </div>
                        <button (click)="selectedBox = null" class="text-gray-400 hover:text-white"><span class="material-icons">close</span></button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
                        <div *ngFor="let item of selectedBox.items" class="bg-white p-4 rounded shadow-sm border border-gray-200">
                            <div class="flex justify-between font-bold text-sm text-gray-800">
                                <span>{{ getItemLabel(item) }}</span>
                                <span class="bg-gray-100 px-2 rounded text-xs">{{ item.ubicacion }}</span>
                            </div>
                            <div class="text-xs text-gray-600">{{ item.cliente }}</div>
                            <div class="text-xs text-gray-500">{{ getItemDesc(item) }}</div>
                        </div>
                        <div *ngIf="selectedBox.items.length === 0" class="text-center p-8 text-gray-500">
                            Ubicación vacía.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `,
  styles: [`
    @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .animate-slideInRight { animation: slideInRight 0.3s ease-out; }
  `]
})
export class InventoryMapComponent {
  inventoryService = inject(InventoryService);
  layoutData: RackConfig[] = [];
  selectedBox: RackBox | null = null;
  activeTab: 'clise' | 'die' = 'clise';

  constructor() {
    this.inventoryService.layoutData$.subscribe(data => this.layoutData = data);
  }

  get cliseRacks() {
      return this.layoutData.filter(r => r.type === 'clise');
  }

  get dieRacks() {
      return this.layoutData.filter(r => r.type === 'die');
  }

  getItemLabel(item: any): string {
      return item.item || item.serie || 'N/A';
  }

  getItemDesc(item: any): string {
      return item.descripcion || item.medida || '';
  }
}
