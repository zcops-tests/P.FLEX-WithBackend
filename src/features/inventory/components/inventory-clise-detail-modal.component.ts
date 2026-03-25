import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CliseItem, CliseHistory, DieItem } from '../models/inventory.models';

@Component({
  selector: 'app-inventory-clise-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-clise-detail-modal.component.html',
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #131b2e; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #2d3449; border-radius: 999px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
  `]
})
export class InventoryCliseDetailModalComponent {
  @Input() currentClise: Partial<CliseItem> = {};
  @Input() isReadOnly = true;
  @Input() canEdit = true;
  @Input() activeDetailTab: 'general' | 'metrics' = 'general';
  @Input() compatibleDies: DieItem[] = [];
  @Input() dieSearchTerm = '';
  @Input() dieSearchResults: DieItem[] = [];

  @Output() closeRequested = new EventEmitter<void>();
  @Output() saveRequested = new EventEmitter<void>();
  @Output() printRequested = new EventEmitter<void>();
  @Output() isReadOnlyChange = new EventEmitter<boolean>();
  @Output() dieSearchChange = new EventEmitter<string>();
  @Output() dieLinkRequested = new EventEmitter<DieItem>();
  @Output() dieUnlinkRequested = new EventEmitter<string>();

  get lastHistoryEntry() {
    return this.currentClise.history && this.currentClise.history.length > 0
      ? this.currentClise.history[0]
      : null;
  }

  get cliseColorTags() {
    const raw = this.currentClise.colores || '';
    return raw
      .split(/[;,/]+/)
      .flatMap((part) => part.split(','))
      .map((part) => part.trim())
      .filter(Boolean);
  }

  setEditMode(readOnly: boolean) {
    if (!this.canEdit && !readOnly) {
      return;
    }
    this.isReadOnlyChange.emit(readOnly);
  }

  requestSearch(term: string) {
    this.dieSearchChange.emit(term);
  }

  requestLink(die: DieItem) {
    this.dieLinkRequested.emit(die);
  }

  requestUnlink(dieId: string) {
    this.dieUnlinkRequested.emit(dieId);
  }

  isExplicitlyLinked(dieId: string): boolean {
    return (this.currentClise.linkedDies || []).includes(dieId);
  }

  getPhysicalStateLabel() {
    if (this.currentClise.hasConflict) return 'REVISAR';
    if ((this.currentClise.mtl_acum || 0) >= 500000) return 'MANT.';
    return 'ÓPTIMO';
  }

  getPhysicalStateClass() {
    if (this.currentClise.hasConflict) return 'text-[#ff8a80]';
    if ((this.currentClise.mtl_acum || 0) >= 500000) return 'text-[#ffb4ab]';
    return 'text-[#4edea3]';
  }

  getStatusLabel(item: Partial<CliseItem>) {
    if (item.hasConflict) return 'Revisar';
    if ((item.mtl_acum || 0) >= 500000) return 'Mantenimiento';
    return 'Listo para Uso';
  }

  getStatusBadgeClass(item: Partial<CliseItem>) {
    if (item.hasConflict) return 'bg-[#ff5252]/10 text-[#ff5252]';
    if ((item.mtl_acum || 0) >= 500000) return 'bg-[#ff5252]/10 text-[#ff8a80]';
    return 'bg-[#00e676]/10 text-[#00e676]';
  }

  getStatusDotClass(item: Partial<CliseItem>) {
    if (item.hasConflict) return 'bg-[#ff5252]';
    if ((item.mtl_acum || 0) >= 500000) return 'bg-[#ff8a80]';
    return 'bg-[#00e676]';
  }

  getColorHex(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('cyan') || n.includes('cian')) return '#06b6d4';
    if (n.includes('magenta')) return '#d946ef';
    if (n.includes('yellow') || n.includes('amarillo')) return '#facc15';
    if (n.includes('black') || n.includes('negro') || n.includes('key')) return '#e5e7eb';
    if (n.includes('orange') || n.includes('naranja')) return '#f97316';
    if (n.includes('green') || n.includes('verde')) return '#22c55e';
    if (n.includes('red') || n.includes('rojo')) return '#ef4444';
    if (n.includes('blue') || n.includes('azul')) return '#3b82f6';
    return '#94a3b8';
  }

  getHistoryBadgeClass(type: CliseHistory['type']) {
    switch (type) {
      case 'Mantenimiento':
        return 'bg-[#4edea3]/10 text-[#4edea3]';
      case 'Reparación':
      case 'Baja':
        return 'bg-[#ff5252]/10 text-[#ff8a80]';
      case 'Cambio Versión':
      case 'Creación':
        return 'bg-[#adc6ff]/10 text-[#adc6ff]';
      default:
        return 'bg-[#b7c8e1]/10 text-[#b7c8e1]';
    }
  }
}
