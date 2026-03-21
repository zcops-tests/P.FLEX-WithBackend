
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { InventoryCliseComponent } from './inventory-clise.component';
import { InventoryDieComponent } from './inventory-die.component';
import { InventoryMapComponent } from './inventory-map.component';
import { InventoryInkComponent } from './inventory-ink.component';
import { InventoryStockComponent } from './inventory-stock.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    InventoryCliseComponent,
    InventoryDieComponent,
    InventoryMapComponent,
    InventoryInkComponent,
    InventoryStockComponent
  ],
  template: `
    <div class="h-full flex flex-col w-full">
      
      <!-- SUB-ROUTING / SWITCHER -->
      
      <app-inventory-clise *ngIf="inventoryType === 'clise'" class="flex-1 h-full"></app-inventory-clise>
      
      <app-inventory-die *ngIf="inventoryType === 'die'" class="flex-1 h-full"></app-inventory-die>
      
      <app-inventory-map *ngIf="inventoryType === 'layout'" class="flex-1 h-full"></app-inventory-map>
      
      <app-inventory-ink *ngIf="inventoryType === 'ink'" class="flex-1 h-full"></app-inventory-ink>

      <app-inventory-stock *ngIf="inventoryType === 'stock'" class="flex-1 h-full"></app-inventory-stock>

      <!-- FALLBACK -->
      <div *ngIf="!isValidType" class="p-8 text-center text-gray-500">
         Seleccione una categoría de inventario en el menú.
      </div>

    </div>
  `
})
export class InventoryComponent {
  route: ActivatedRoute = inject(ActivatedRoute);
  inventoryType = 'clise';

  constructor() {
    this.route.params.subscribe(params => {
      this.inventoryType = params['type'] || 'clise';
    });
  }

  get isValidType() {
    return ['clise', 'die', 'layout', 'ink', 'stock'].includes(this.inventoryType);
  }
}
