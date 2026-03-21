
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CliseItem, DieItem, StockItem, RackConfig, RackBox } from '../models/inventory.models';
import { ExcelService } from '../../../services/excel.service';
import { AuditService } from '../../../services/audit.service';
import { StateService } from '../../../services/state.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  excelService = inject(ExcelService);
  audit = inject(AuditService);
  state = inject(StateService);

  // --- STATE ---
  private _cliseItems = new BehaviorSubject<CliseItem[]>([]);
  private _dieItems = new BehaviorSubject<DieItem[]>([]);
  
  // MOCK DATA: Finished Goods (Producto Terminado)
  private _stockItems = new BehaviorSubject<StockItem[]>([
    { 
      id: 'pt-1', 
      ot: '45001', 
      client: 'Coca Cola', 
      product: 'Etiqueta 500ml Original', 
      quantity: 1200, 
      unit: 'Rollos', 
      rolls: 120,
      millares: 240.5,
      location: 'DES-A-01', 
      status: 'Liberado', 
      entryDate: new Date().toISOString(), 
      palletId: 'PAL-2023-884' 
    },
    { 
      id: 'pt-2', 
      ot: '45022', 
      client: 'Nestle', 
      product: 'Empaque Galleta Vainilla', 
      quantity: 450, 
      unit: 'Cajas', 
      rolls: 0,
      millares: 150.0,
      location: 'DES-B-04', 
      status: 'Cuarentena', 
      entryDate: new Date(Date.now() - 86400000).toISOString(), 
      palletId: 'PAL-2023-890' 
    },
    { 
      id: 'pt-3', 
      ot: '45105', 
      client: 'Alicorp', 
      product: 'Mayonesa Alacena 100cc', 
      quantity: 5000, 
      unit: 'Millares', 
      rolls: 500,
      millares: 5000.0,
      location: 'DES-A-02', 
      status: 'Liberado', 
      entryDate: new Date(Date.now() - 172800000).toISOString(), 
      palletId: 'PAL-2023-855' 
    },
    { 
      id: 'pt-4', 
      ot: '44900', 
      client: 'Gloria', 
      product: 'Etiqueta Yogurt Fresa', 
      quantity: 80, 
      unit: 'Rollos', 
      rolls: 80,
      millares: 16.2,
      location: 'ZONA-RET', 
      status: 'Retenido', 
      entryDate: new Date(Date.now() - 432000000).toISOString(), 
      notes: 'Problema de adhesivo lote 441',
      palletId: 'PAL-2023-810' 
    }
  ]);
  
  // Layout Data
  private _layoutData = new BehaviorSubject<RackConfig[]>([
    // CLISE RACKS
    {
      id: 'CL1',
      name: 'RACK CL-1 (861-1190)',
      type: 'clise',
      orientation: 'vertical',
      levels: [
        { levelNumber: 3, boxes: [{ label: '1081-1135', min: 1081, max: 1135, items: [] }, { label: '1136-1190', min: 1136, max: 1190, items: [] }] },
        { levelNumber: 2, boxes: [{ label: '971-1025', min: 971, max: 1025, items: [] }, { label: '1026-1080', min: 1026, max: 1080, items: [] }] },
        { levelNumber: 1, boxes: [{ label: '861-915', min: 861, max: 915, items: [] }, { label: '916-970', min: 916, max: 970, items: [] }] },
      ]
    },
    {
      id: 'CL2',
      name: 'RACK CL-2 (1191-1520)',
      type: 'clise',
      orientation: 'vertical',
      levels: [
        { levelNumber: 3, boxes: [{ label: '1411-1465', min: 1411, max: 1465, items: [] }, { label: '1466-1520', min: 1466, max: 1520, items: [] }] },
        { levelNumber: 2, boxes: [{ label: '1301-1355', min: 1301, max: 1355, items: [] }, { label: '1356-1410', min: 1356, max: 1410, items: [] }] },
        { levelNumber: 1, boxes: [{ label: '1191-1245', min: 1191, max: 1245, items: [] }, { label: '1246-1300', min: 1246, max: 1300, items: [] }] },
      ]
    },
    {
      id: 'CL3',
      name: 'RACK CL-3 (1521-1850)',
      type: 'clise',
      orientation: 'vertical',
      levels: [
        { levelNumber: 3, boxes: [{ label: '1741-1795', min: 1741, max: 1795, items: [] }, { label: '1796-1850', min: 1796, max: 1850, items: [] }] },
        { levelNumber: 2, boxes: [{ label: '1631-1685', min: 1631, max: 1685, items: [] }, { label: '1686-1740', min: 1686, max: 1740, items: [] }] },
        { levelNumber: 1, boxes: [{ label: '1521-1575', min: 1521, max: 1575, items: [] }, { label: '1576-1630', min: 1576, max: 1630, items: [] }] },
      ]
    },
    {
      id: 'CL4',
      name: 'RACK CL-4 (1851-2180)',
      type: 'clise',
      orientation: 'vertical',
      levels: [
        { levelNumber: 3, boxes: [{ label: '2071-2125', min: 2071, max: 2125, items: [] }, { label: '2126-2180', min: 2126, max: 2180, items: [] }] },
        { levelNumber: 2, boxes: [{ label: '1961-2015', min: 1961, max: 2015, items: [] }, { label: '2016-2070', min: 2016, max: 2070, items: [] }] },
        { levelNumber: 1, boxes: [{ label: '1851-1905', min: 1851, max: 1905, items: [] }, { label: '1906-1960', min: 1906, max: 1960, items: [] }] },
      ]
    },
    {
      id: 'EST1',
      name: 'ZONA A (0-200)',
      type: 'clise',
      orientation: 'horizontal',
      levels: [
        { levelNumber: 1, boxes: [
            { label: 'A-01 (1-50)', min: 1, max: 50, items: [] }, 
            { label: 'A-02 (51-100)', min: 51, max: 100, items: [] }, 
            { label: 'A-03 (101-150)', min: 101, max: 150, items: [] },
            { label: 'A-04 (151-200)', min: 151, max: 200, items: [] }
        ]}
      ]
    },
    {
      id: 'EST2',
      name: 'ZONA B (201-400)',
      type: 'clise',
      orientation: 'horizontal',
      levels: [
        { levelNumber: 1, boxes: [
            { label: 'B-01 (201-250)', min: 201, max: 250, items: [] }, 
            { label: 'B-02 (251-300)', min: 251, max: 300, items: [] }, 
            { label: 'B-03 (301-350)', min: 301, max: 350, items: [] },
            { label: 'B-04 (351-400)', min: 351, max: 400, items: [] }
        ]}
      ]
    },
    // DIE RACKS (TROQUELES)
    {
      id: 'TRQ1',
      name: 'RACK TRQ-1 (1-100)',
      type: 'die',
      orientation: 'vertical',
      levels: [
        { levelNumber: 3, boxes: [{ label: '1-33', min: 1, max: 33, items: [] }] },
        { levelNumber: 2, boxes: [{ label: '34-66', min: 34, max: 66, items: [] }] },
        { levelNumber: 1, boxes: [{ label: '67-100', min: 67, max: 100, items: [] }] },
      ]
    },
    {
      id: 'TRQ2',
      name: 'RACK TRQ-2 (101-200)',
      type: 'die',
      orientation: 'vertical',
      levels: [
        { levelNumber: 3, boxes: [{ label: '101-133', min: 101, max: 133, items: [] }] },
        { levelNumber: 2, boxes: [{ label: '134-166', min: 134, max: 166, items: [] }] },
        { levelNumber: 1, boxes: [{ label: '167-200', min: 167, max: 200, items: [] }] },
      ]
    }
  ]);

  // MAPPINGS
  readonly CLISE_MAPPING = {
    'item': ['item', 'codigo', 'code', 'id', 'clise'],
    'ubicacion': ['ubicación', 'ubicacion', 'location'],
    'descripcion': ['descripción', 'descripcion', 'description'],
    'cliente': ['cliente', 'client'],
    'z': ['z', 'dientes'],
    'ancho': ['ancho', 'width'],
    'avance': ['avance', 'length'],
    'ingreso': ['ingreso', 'fecha ingreso'],
    'mtl_acum': ['mtl acum', 'mtl. acum.', 'metros acumulados']
  };

  readonly DIE_MAPPING = {
    'serie': ['serie', 'codigo', 'code', 'id'],
    'cliente': ['cliente', 'client'],
    'medida': ['medida', 'dimensiones'],
    'ubicacion': ['ubicación', 'ubicacion'],
    'z': ['z', 'dientes'],
    'material': ['material', 'sustrato'],
    'forma': ['forma', 'shape'],
    'estado': ['estado', 'status'],
    'columnas': ['columnas', 'col', 'cols', 'cavidades', 'cav'],
    'repeticiones': ['repeticiones', 'rep', 'reps']
  };

  readonly STOCK_MAPPING = {
    'ot': ['ot', 'orden', 'op', 'nro'],
    'client': ['cliente', 'razon social', 'customer'],
    'product': ['producto', 'descripcion', 'item'],
    'rolls': ['rollos', 'cant rollos', 'qty rolls', 'und', 'cantidad'],
    'millares': ['millares', 'cant millares', 'mll', 'qty mll'],
    'location': ['ubicacion', 'ubicación', 'posicion', 'loc'],
    'status': ['estado', 'status', 'situacion', 'calidad'],
    'palletId': ['pallet', 'lote', 'pallet id', 'id', 'caja'],
    'notes': ['notas', 'observaciones', 'obs']
  };

  constructor() {
    this.mapItemsToLayout(); // Initial mapping if any default data
  }

  // --- ACCESSORS ---
  get cliseItems() { return this._cliseItems.value; }
  get dieItems() { return this._dieItems.value; }
  get stockItems() { return this._stockItems.value; }
  get layoutData() { return this._layoutData.value; }

  get cliseItems$() { return this._cliseItems.asObservable(); }
  get dieItems$() { return this._dieItems.asObservable(); }
  get stockItems$() { return this._stockItems.asObservable(); }
  get layoutData$() { return this._layoutData.asObservable(); }

  // --- ACTIONS ---

  addClises(items: CliseItem[]) {
    this._cliseItems.next([...items, ...this.cliseItems]);
    this.mapItemsToLayout();
    this.audit.log(this.state.userName(), this.state.userRole(), 'INVENTARIO', 'Alta Clisés', `Se agregaron ${items.length} clichés al inventario.`);
  }

  updateClise(item: CliseItem) {
    const list = this.cliseItems;
    const idx = list.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      list[idx] = item;
      this._cliseItems.next([...list]);
      this.mapItemsToLayout();
      this.audit.log(this.state.userName(), this.state.userRole(), 'INVENTARIO', 'Editar Clisé', `Se modificó el cliché ${item.item}.`);
    }
  }

  addDies(items: DieItem[]) {
    this._dieItems.next([...items, ...this.dieItems]);
    this.audit.log(this.state.userName(), this.state.userRole(), 'INVENTARIO', 'Alta Troqueles', `Se agregaron ${items.length} troqueles.`);
  }

  updateDie(item: DieItem) {
    const list = this.dieItems;
    const idx = list.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      list[idx] = item;
      this._dieItems.next([...list]);
      this.audit.log(this.state.userName(), this.state.userRole(), 'INVENTARIO', 'Editar Troquel', `Se modificó el troquel ${item.serie}.`);
    }
  }

  addStock(item: StockItem) {
    const list = this.stockItems;
    this._stockItems.next([item, ...list]);
    this.audit.log(this.state.userName(), this.state.userRole(), 'STOCK PT', 'Ingreso PT', `Entrada de Producto: OT ${item.ot}`);
  }

  addStocks(items: StockItem[]) {
    this._stockItems.next([...items, ...this.stockItems]);
    this.audit.log(this.state.userName(), this.state.userRole(), 'STOCK PT', 'Importación Masiva', `Se importaron ${items.length} items de stock.`);
  }

  updateStock(item: StockItem) {
    const list = this.stockItems;
    const idx = list.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      list[idx] = item;
      this._stockItems.next([...list]);
      this.audit.log(this.state.userName(), this.state.userRole(), 'STOCK PT', 'Ajuste PT', `Ajuste en OT ${item.ot} - ${item.status}`);
    }
  }

  // --- LOGIC ---

  mapItemsToLayout() {
     const currentLayout = this.layoutData;
     const clises = this.cliseItems;
     const dies = this.dieItems;

     currentLayout.forEach(rack => rack.levels.forEach(lvl => lvl.boxes.forEach(box => box.items = [])));
     
     // Map Clises
     clises.forEach(item => {
        if (!item.ubicacion) return;
        const locationNumber = parseInt(item.ubicacion.replace(/\D/g, ''));
        if (!isNaN(locationNumber)) {
             for (const rack of currentLayout) {
                 if (rack.type !== 'clise') continue;
                 for (const level of rack.levels) {
                     for (const box of level.boxes) {
                         if (box.min !== undefined && box.max !== undefined && locationNumber >= box.min && locationNumber <= box.max) {
                             box.items.push(item);
                             return;
                         }
                     }
                 }
             }
        }
     });

     // Map Dies
     dies.forEach(item => {
        if (!item.ubicacion) return;
        const locationNumber = parseInt(item.ubicacion.replace(/\D/g, ''));
        if (!isNaN(locationNumber)) {
             for (const rack of currentLayout) {
                 if (rack.type !== 'die') continue;
                 for (const level of rack.levels) {
                     for (const box of level.boxes) {
                         if (box.min !== undefined && box.max !== undefined && locationNumber >= box.min && locationNumber <= box.max) {
                             box.items.push(item);
                             return;
                         }
                     }
                 }
             }
        }
     });
     
     this._layoutData.next([...currentLayout]);
  }

  normalizeCliseData(rawData: any[]): { valid: CliseItem[], conflicts: CliseItem[] } {
     const normalized = this.excelService.normalizeData(rawData, this.CLISE_MAPPING);
     const mapped: CliseItem[] = normalized.map(row => ({
          id: Math.random().toString(36).substr(2, 9),
          item: String(row.item || '').trim(),
          ubicacion: String(row.ubicacion || '').trim(),
          descripcion: String(row.descripcion || '').trim(),
          cliente: String(row.cliente || '').trim(),
          z: String(row.z || ''),
          estandar: '',
          medidas: '',
          troquel: '', 
          linkedDies: [], 
          ancho: this.excelService.parseNumber(row.ancho),
          avance: this.excelService.parseNumber(row.avance),
          col: 0,
          rep: 0,
          n_clises: 0,
          espesor: '',
          ingreso: String(row.ingreso || new Date().toISOString().split('T')[0]),
          obs: '',
          maq: '',
          colores: '',
          colorUsage: [],
          n_ficha_fler: '',
          mtl_acum: this.excelService.parseNumber(row.mtl_acum),
          history: [],
          hasConflict: false
     }));

     const valid = mapped.filter((i: CliseItem) => i.item && i.cliente);
     const conflicts = mapped.filter((i: CliseItem) => !i.item || !i.cliente);
     conflicts.forEach(c => c.hasConflict = true);

     return { valid, conflicts };
  }

  normalizeDieData(rawData: any[]): { valid: DieItem[], conflicts: DieItem[] } {
     const normalized = this.excelService.normalizeData(rawData, this.DIE_MAPPING);
     const mapped: DieItem[] = normalized.map(row => ({
        id: Math.random().toString(36).substr(2, 9),
        serie: String(row.serie || '').trim(),
        cliente: String(row.cliente || '').trim(),
        medida: String(row.medida || '').trim(),
        ubicacion: String(row.ubicacion || '').trim(),
        z: String(row.z || ''),
        ancho_mm: 0,
        avance_mm: 0,
        ancho_plg: 0,
        avance_plg: 0,
        columnas: this.excelService.parseNumber(row.columnas),
        repeticiones: this.excelService.parseNumber(row.repeticiones),
        material: String(row.material || '').trim(),
        forma: String(row.forma || '').trim(),
        estado: String(row.estado || 'OK').trim(),
        ingreso: new Date().toISOString().split('T')[0],
        pb: '',
        sep_ava: '',
        cantidad: 1,
        almacen: '',
        mtl_acum: 0,
        tipo_troquel: '',
        observaciones: '',
        history: [],
        linkedClises: [],
        hasConflict: false
     }));
     
     const valid = mapped.filter((i: DieItem) => i.serie && i.cliente);
     const conflicts = mapped.filter((i: DieItem) => !i.serie || !i.cliente);
     conflicts.forEach(c => c.hasConflict = true);

     return { valid, conflicts };
  }

  normalizeStockData(rawData: any[]): { valid: StockItem[], conflicts: StockItem[] } {
     const normalized = this.excelService.normalizeData(rawData, this.STOCK_MAPPING);
     const mapped: StockItem[] = normalized.map(row => {
        const rolls = this.excelService.parseNumber(row.rolls) || 0;
        const millares = this.excelService.parseNumber(row.millares) || 0;
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          ot: String(row.ot || '').trim(),
          client: String(row.client || '').trim(),
          product: String(row.product || '').trim(),
          quantity: rolls, 
          unit: 'Rollos',
          rolls: rolls,
          millares: millares,
          location: String(row.location || 'RECEPCIÓN').trim(),
          status: this.normalizeStockStatus(row.status),
          entryDate: new Date().toISOString(),
          notes: String(row.notes || ''),
          palletId: String(row.palletId || `PAL-${new Date().getFullYear()}-${Math.floor(Math.random()*10000)}`)
        };
     });

     const valid = mapped.filter((i: StockItem) => i.ot && i.client);
     const conflicts = mapped.filter((i: StockItem) => !i.ot || !i.client);

     return { valid, conflicts };
  }

  private normalizeStockStatus(val: string): any {
      const v = String(val || '').toLowerCase();
      if(v.includes('liberado') || v.includes('ok') || v.includes('aprobado')) return 'Liberado';
      if(v.includes('retenido') || v.includes('hold') || v.includes('rechazado')) return 'Retenido';
      if(v.includes('despachado') || v.includes('enviado') || v.includes('salida')) return 'Despachado';
      return 'Cuarentena';
  }
}
