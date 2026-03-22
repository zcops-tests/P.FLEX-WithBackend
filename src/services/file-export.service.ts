import { Injectable } from '@angular/core';
import type { Sheet2JSONOpts, WorkBook, WorkSheet } from 'xlsx';

type XlsxModule = typeof import('xlsx');
type Html2CanvasFn = typeof import('html2canvas').default;

@Injectable({ providedIn: 'root' })
export class FileExportService {
  private xlsxModule?: XlsxModule;
  private xlsxModulePromise?: Promise<XlsxModule>;
  private html2canvasPromise?: Promise<Html2CanvasFn>;
  private jsPdfCtorPromise?: Promise<any>;

  sanitizeFileName(fileName: string) {
    return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_');
  }

  async preloadXlsx() {
    if (!this.xlsxModulePromise) {
      this.xlsxModulePromise = import('xlsx').then((module) => {
        const xlsx = ((module as any).default?.utils ? (module as any).default : module) as XlsxModule;

        if (!xlsx?.read || !xlsx?.utils) {
          throw new Error('La libreria XLSX no esta disponible.');
        }

        this.xlsxModule = xlsx;
        return xlsx;
      });
    }

    return this.xlsxModulePromise;
  }

  getXlsx() {
    if (!this.xlsxModule) {
      throw new Error('La libreria XLSX aun no se ha cargado.');
    }

    return this.xlsxModule;
  }

  async readWorkbook(data: ArrayBuffer | Uint8Array) {
    const xlsx = await this.preloadXlsx();
    const source = data instanceof Uint8Array ? data : new Uint8Array(data);
    return xlsx.read(source, { type: 'array' });
  }

  async sheetToJson<T>(worksheet: WorkSheet, options?: Sheet2JSONOpts) {
    const xlsx = await this.preloadXlsx();
    return xlsx.utils.sheet_to_json<T>(worksheet, options);
  }

  async writeWorkbook(workbook: WorkBook, fileName: string) {
    const xlsx = await this.preloadXlsx();
    xlsx.writeFile(workbook, this.sanitizeFileName(fileName));
  }

  async exportElementToPdf(element: HTMLElement, fileName: string, options?: { orientation?: 'p' | 'l'; backgroundColor?: string }) {
    const orientation = options?.orientation || 'l';
    const backgroundColor = options?.backgroundColor || '#0f172a';
    const [html2canvas, JsPdfCtor] = await Promise.all([
      this.loadHtml2Canvas(),
      this.loadJsPdfCtor(),
    ]);

    const canvas = await html2canvas(element, {
      scale: Math.max(2, window.devicePixelRatio || 1),
      backgroundColor,
      logging: false,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 15000,
      windowWidth: Math.max(element.scrollWidth, element.clientWidth),
      windowHeight: Math.max(element.scrollHeight, element.clientHeight),
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new JsPdfCtor(orientation, 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(this.sanitizeFileName(fileName));
  }

  async exportJsonToWorkbook(sheets: Array<{ name: string; rows: unknown[] | Array<Array<string | number | boolean | null>> }>, fileName: string) {
    const xlsx = await this.preloadXlsx();
    const workbook = xlsx.utils.book_new();

    sheets.forEach((sheet) => {
      const firstRow = sheet.rows[0];
      const worksheet = Array.isArray(firstRow)
        ? xlsx.utils.aoa_to_sheet(sheet.rows as Array<Array<string | number | boolean | null>>)
        : xlsx.utils.json_to_sheet(sheet.rows as object[]);
      xlsx.utils.book_append_sheet(workbook, worksheet, this.sanitizeSheetName(sheet.name));
    });

    await this.writeWorkbook(workbook, fileName);
  }

  private sanitizeSheetName(name: string) {
    return (name || 'Hoja').trim().slice(0, 31) || 'Hoja';
  }

  private async loadHtml2Canvas() {
    if (!this.html2canvasPromise) {
      this.html2canvasPromise = import('html2canvas').then((module) => module.default ?? (module as any));
    }

    return this.html2canvasPromise;
  }

  private async loadJsPdfCtor() {
    if (!this.jsPdfCtorPromise) {
      this.jsPdfCtorPromise = import('jspdf').then((module) => {
        const ctor = module.default ?? (module as any).jsPDF;

        if (!ctor) {
          throw new Error('La libreria jsPDF no esta disponible.');
        }

        return ctor;
      });
    }

    return this.jsPdfCtorPromise;
  }
}
