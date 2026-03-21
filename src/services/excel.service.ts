
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  constructor() { }

  /**
   * Reads an Excel/CSV file and returns the raw JSON data.
   */
  readExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          // Use the global XLSX variable if imported via script tag or the module
          const xlsxLib: any = (XLSX as any).default || XLSX;
          
          if (!xlsxLib || !xlsxLib.read) {
             throw new Error('Librería XLSX no cargada.');
          }

          const workbook = xlsxLib.read(data, { type: 'array' });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('El archivo no contiene hojas.');
          }

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = xlsxLib.utils.sheet_to_json(worksheet, { defval: "" });
          
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Normalizes data keys based on a provided mapping.
   * Helps matches columns like "Razon Social", "Cliente", "Client" to a single key "cliente".
   */
  normalizeData(rawData: any[], mapping: { [key: string]: string[] }): any[] {
    return rawData.map(row => {
      const newRow: any = {};
      const rowKeys = Object.keys(row);

      // 1. Copy original data first (optional, helps keep unknown columns)
      // Object.assign(newRow, row); 

      // 2. Map known columns
      Object.keys(mapping).forEach(targetKey => {
        const possibleVariations = mapping[targetKey];
        const matchingKey = rowKeys.find(key => 
            possibleVariations.includes(this.normalizeString(key))
        );

        if (matchingKey) {
            newRow[targetKey] = row[matchingKey];
        }
      });

      return newRow;
    });
  }

  /**
   * Helper to clean strings for comparison (remove accents, lowercase, special chars)
   */
  normalizeString(str: string): string {
    if (!str) return '';
    return String(str).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, "")
        .trim(); 
  }

  /**
   * Helper to parse numbers safely from Excel dirty data (e.g. "1,200.50", "$ 500", "-")
   */
  parseNumber(val: any): number | null {
    if (val === undefined || val === null || val === '') return null;
    let strVal = String(val).trim();
    if (strVal === '-' || strVal === '---') return 0;
    
    // Remove currency symbols and allow decimal points
    strVal = strVal.replace(/[^0-9.\-]/g, ''); 
    
    const num = parseFloat(strVal);
    return isNaN(num) ? null : num;
  }
}
