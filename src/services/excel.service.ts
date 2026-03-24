import { Injectable } from '@angular/core';
import { FileExportService } from './file-export.service';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  constructor(private fileExport: FileExportService) { }

  async readExcel(file: File): Promise<any[]> {
    const buffer = await file.arrayBuffer();
    const workbook = await this.fileExport.readWorkbook(buffer);

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('El archivo no contiene hojas.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return this.fileExport.sheetToJson(worksheet, { defval: '' });
  }

  normalizeData(rawData: any[], mapping: { [key: string]: string[] }): any[] {
    return rawData.map(row => {
      const newRow: any = {};
      const rowKeys = Object.keys(row);

      Object.keys(mapping).forEach(targetKey => {
        const possibleVariations = mapping[targetKey];
        const matchingKey = this.findMatchingKey(rowKeys, possibleVariations);

        if (matchingKey) {
          newRow[targetKey] = this.unwrapCellValue(row[matchingKey]);
        }
      });

      newRow.__sourceRow = row;
      return newRow;
    });
  }

  private findMatchingKey(rowKeys: string[], possibleVariations: string[]): string | undefined {
    const normalizedKeys = rowKeys.map((key) => ({
      original: key,
      normalized: this.normalizeString(key),
    }));
    const normalizedVariations = possibleVariations
      .map((variation) => this.normalizeString(variation))
      .filter(Boolean)
      .sort((left, right) => right.length - left.length);

    for (const variation of normalizedVariations) {
      const exactMatch = normalizedKeys.find((entry) => entry.normalized === variation);
      if (exactMatch) {
        return exactMatch.original;
      }
    }

    for (const variation of normalizedVariations) {
      if (variation.length < 4) {
        continue;
      }

      const fuzzyMatch = normalizedKeys.find((entry) =>
        entry.normalized.includes(variation) || variation.includes(entry.normalized),
      );

      if (fuzzyMatch) {
        return fuzzyMatch.original;
      }
    }

    return undefined;
  }

  normalizeString(str: string): string {
    if (!str) return '';
    return String(str).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  toDisplayString(val: any): string {
    const normalizedValue = this.unwrapCellValue(val);
    if (normalizedValue === undefined || normalizedValue === null) return '';
    if (normalizedValue instanceof Date) return normalizedValue.toISOString();
    return String(normalizedValue).trim();
  }

  parseNumber(val: any): number | null {
    const normalizedValue = this.unwrapCellValue(val);
    if (normalizedValue === undefined || normalizedValue === null || normalizedValue === '') return null;
    let strVal = String(normalizedValue).trim();
    if (strVal === '-' || strVal === '---') return 0;

    strVal = strVal.replace(/[^0-9.\-]/g, '');
    const num = parseFloat(strVal);
    return Number.isNaN(num) ? null : num;
  }

  private unwrapCellValue(value: any): any {
    if (value === null || value === undefined) return value;
    if (value instanceof Date || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
      return value
        .map((entry) => this.toDisplayString(entry))
        .filter(Boolean)
        .join(' ');
    }

    const candidateKeys = ['text', 'w', 'v', 'value', 'result', 'raw'];
    for (const key of candidateKeys) {
      if (key in value) {
        const nestedValue = this.unwrapCellValue(value[key]);
        if (nestedValue !== undefined && nestedValue !== null && nestedValue !== '') {
          return nestedValue;
        }
      }
    }

    if (Array.isArray(value.richText)) {
      return value.richText
        .map((entry: any) => this.toDisplayString(entry?.text ?? entry))
        .filter(Boolean)
        .join('');
    }

    const nestedPrimitive = Object.values(value)
      .map((entry) => this.unwrapCellValue(entry))
      .find((entry) => entry !== undefined && entry !== null && entry !== '');

    return nestedPrimitive ?? '';
  }
}
