// ============================================
// Lazy-loaded Excel Export Utility
// Path: src/utils/excelExport.ts
//
// Dynamically imports ExcelJS only when needed
// to reduce initial bundle size
// ============================================

import type ExcelJS from 'exceljs';

let excelJSCache: typeof ExcelJS | null = null;

/**
 * Lazy load ExcelJS library
 * Caches the module after first load
 */
export async function loadExcelJS(): Promise<typeof ExcelJS> {
  if (excelJSCache) {
    return excelJSCache;
  }

  const module = await import('exceljs');
  excelJSCache = module.default;
  return module.default;
}

/**
 * Create a new Excel workbook (lazy-loaded)
 */
export async function createWorkbook(): Promise<ExcelJS.Workbook> {
  const ExcelJS = await loadExcelJS();
  return new ExcelJS.Workbook();
}

/**
 * Export workbook to blob
 */
export async function workbookToBlob(workbook: ExcelJS.Workbook): Promise<Blob> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Trigger download of Excel file
 */
export function downloadExcelFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Complete Excel export helper
 * Creates workbook, generates file, and triggers download
 */
export async function exportToExcel(
  setupWorkbook: (workbook: ExcelJS.Workbook) => Promise<void> | void,
  filename: string
): Promise<void> {
  const workbook = await createWorkbook();
  await setupWorkbook(workbook);
  const blob = await workbookToBlob(workbook);
  downloadExcelFile(blob, filename);
}
