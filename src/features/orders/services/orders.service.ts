
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OT } from '../models/orders.models';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  // Active OTs (Visible in List)
  private _ots = new BehaviorSubject<Partial<OT>[]>([]);

  // Internal Database (Hidden Source of Truth from Import)
  private _internalDatabase = new BehaviorSubject<Partial<OT>[]>([]);
  private _dbLastUpdated = new BehaviorSubject<Date | null>(null);

  // Getters for Snapshots
  get ots() { return this._ots.value; }
  get internalDatabase() { return this._internalDatabase.value; }
  get dbLastUpdated() { return this._dbLastUpdated.value; }

  // Observables
  get ots$() { return this._ots.asObservable(); }
  get dbLastUpdated$() { return this._dbLastUpdated.asObservable(); }

  // Methods for Active List
  updateOts(newOts: Partial<OT>[]) {
    this._ots.next(newOts);
  }

  deleteOt(otId: string) {
    const current = this._ots.value;
    this._ots.next(current.filter(ot => String(ot.OT) !== String(otId)));
  }

  // Methods for Internal Database
  updateInternalDatabase(data: Partial<OT>[]) {
    this._internalDatabase.next(data);
    this._dbLastUpdated.next(new Date());
  }

  // Helper to find in DB
  findInDatabase(searchTerm: string): Partial<OT>[] {
    const term = searchTerm.toLowerCase();
    return this.internalDatabase.filter(ot => 
      String(ot.OT).toLowerCase().includes(term) || 
      String(ot['Razon Social']).toLowerCase().includes(term) ||
      String(ot.descripcion).toLowerCase().includes(term)
    );
  }
}
