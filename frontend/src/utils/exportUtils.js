import * as XLSX from 'xlsx';

/**
 * Exports JSON data to an Excel (.xlsx) file and triggers download.
 * @param {Array<Object>} data - Array of row objects to export
 * @param {string} fileName - Base filename (without extension)
 * @param {string} sheetName - Name of the worksheet
 */
export function exportToExcel(data, fileName = 'export', sheetName = 'Sheet1') {
  if (!data || !data.length) {
    alert('No data available to export');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths
  const colWidths = Object.keys(data[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => (row[key] !== null && row[key] !== undefined ? String(row[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

  const cleanFileName = `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, cleanFileName);
}

/**
 * Exports JSON data to a CSV file and triggers download.
 * @param {Array<Object>} data - Array of row objects to export
 * @param {string} fileName - Base filename (without extension)
 */
export function exportToCSV(data, fileName = 'export') {
  if (!data || !data.length) {
    alert('No data available to export');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
