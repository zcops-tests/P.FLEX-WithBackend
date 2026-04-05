import { Injectable } from '@angular/core';
import { FileExportService } from './file-export.service';

interface ReadExcelOptions {
  raw?: boolean;
}

interface NormalizeDataOptions {
  includeSourceRow?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  constructor(private fileExport: FileExportService) { }

  async readExcel(file: File, options?: ReadExcelOptions): Promise<any[]> {
    const buffer = await file.arrayBuffer();
    const workbook = await this.fileExport.readWorkbook(buffer);

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('El archivo no contiene hojas.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return this.fileExport.sheetToJson(worksheet, {
      defval: '',
      raw: options?.raw ?? true,
    });
  }

  normalizeData(rawData: any[], mapping: { [key: string]: string[] }, options?: NormalizeDataOptions): any[] {
    const includeSourceRow = options?.includeSourceRow ?? false;
    const resolvedMapping = this.resolveMappingKeys(rawData, mapping);

    return rawData.map(row => {
      const newRow: any = {};

      Object.entries(resolvedMapping).forEach(([targetKey, matchingKey]) => {
        if (matchingKey) {
          newRow[targetKey] = this.unwrapCellValue(row[matchingKey]);
        }
      });

      if (includeSourceRow) {
        newRow.__sourceRow = row;
      }

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

  private resolveMappingKeys(rawData: any[], mapping: { [key: string]: string[] }) {
    const sampleRows = rawData.slice(0, 25);
    const sampleRowKeys = Array.from(
      new Set(
        sampleRows.flatMap((row) => Object.keys(row || {})),
      ),
    );

    const resolvedEntries = Object.entries(mapping).map(([targetKey, possibleVariations]) => [
      targetKey,
      this.findMatchingKey(sampleRowKeys, possibleVariations),
    ]);

    return Object.fromEntries(resolvedEntries) as Record<string, string | undefined>;
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

    strVal = strVal.replace(/\s/g, '').replace(/[^0-9,.\-]/g, '');
    const commaLooksLikeThousands = strVal.includes(',')
      && !strVal.includes('.')
      && /^-?\d{1,3}(,\d{3})+$/.test(strVal);
    const normalizedText = strVal.includes(',') && strVal.includes('.')
      ? strVal.lastIndexOf(',') > strVal.lastIndexOf('.')
        ? strVal.replace(/\./g, '').replace(',', '.')
        : strVal.replace(/,/g, '')
      : commaLooksLikeThousands
        ? strVal.replace(/,/g, '')
        : strVal.includes(',')
          ? strVal.replace(',', '.')
          : strVal;
    const num = parseFloat(normalizedText);
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
