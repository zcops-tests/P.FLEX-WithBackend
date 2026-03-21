
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inventory-ink',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-gray-50 h-full flex flex-col items-center justify-center">
       <span class="material-icons text-6xl text-gray-300 mb-4">format_color_fill</span>
       <h2 class="text-xl font-bold text-gray-700">Inventario de Tintas</h2>
       <p class="text-gray-500">Módulo en construcción.</p>
    </div>
  `
})
export class InventoryInkComponent {}
