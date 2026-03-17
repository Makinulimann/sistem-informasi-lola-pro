/**
 * Lightweight export utilities for Edge-compatible document generation
 * Replaces heavy libraries like xlsx and jspdf
 */

/**
 * Convert array of objects to CSV string
 * Lightweight alternative to xlsx - zero dependencies
 */
export function toCSV<T extends Record<string, any>>(
  data: T[],
  options: {
    headers?: string[];
    delimiter?: string;
    filename?: string;
  } = {}
): string {
  const { delimiter = ',', headers } = options;

  // If no data, return empty string
  if (!data || data.length === 0) {
    return '';
  }

  // Get all unique keys from all rows if headers not specified
  const keys = headers || Array.from(
    new Set(data.flatMap(row => Object.keys(row)))
  );

  // Build CSV header
  const headerLine = keys.map(k => `"${String(k).replace(/"/g, '""')}"`).join(delimiter);

  // Build CSV rows
  const rows = data.map(row => {
    return keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) {
        return '';
      }
      // Handle dates and objects
      const stringValue = value instanceof Date
        ? value.toISOString()
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(delimiter);
  });

  return [headerLine, ...rows].join('\n');
}

/**
 * Trigger CSV file download in browser
 */
export function downloadCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  options?: {
    headers?: string[];
    delimiter?: string;
  }
): void {
  const csv = toCSV(data, options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger file download from base64 or blob
 */
export function downloadFile(
  content: Blob | string,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate printable HTML for PDF-like output
 * Can be printed to PDF via browser's print dialog
 * Lighter alternative to jspdf
 */
export function createPrintableHTML(options: {
  title: string;
  subtitle?: string;
  data: any[];
  columns: { key: string; label: string; width?: string }[];
  date?: string;
}): string {
  const { title, subtitle, data, columns, date } = options;

  const tableRows = data.map(row => `
    <tr>
      ${columns.map(col => `<td>${escapeHtml(String(row[col.key] ?? ''))}</td>`).join('')}
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        @page { size: landscape; margin: 1cm; }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 10pt; 
          padding: 20px;
        }
        h1 { margin-bottom: 5px; }
        .subtitle { color: #666; margin-bottom: 20px; }
        .date { color: #999; font-size: 9pt; margin-bottom: 20px; }
        table { 
          width: 100%; 
          border-collapse: collapse; 
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 8px; 
          text-align: left;
        }
        th { 
          background: #f5f5f5; 
          font-weight: bold;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
      ${date ? `<div class="date">Tanggal Export: ${escapeHtml(date)}</div>` : ''}
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th${col.width ? ` style="width:${col.width}"` : ''}>${escapeHtml(col.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

/**
 * Open print dialog for PDF-like output
 */
export function printTable(options: {
  title: string;
  subtitle?: string;
  data: any[];
  columns: { key: string; label: string }[];
  date?: string;
}): void {
  const html = createPrintableHTML(options);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Convert data to Excel-compatible XML (SpreadsheetML)
 * Alternative to xlsx for simple exports
 */
export function toExcelXML<T extends Record<string, any>>(
  data: T[],
  sheetName: string = 'Sheet1'
): string {
  if (!data || data.length === 0) {
    return '';
  }

  const keys = Array.from(new Set(data.flatMap(row => Object.keys(row))));
  
  const headerCells = keys.map(k => 
    `<Cell><Data ss:Type="String">${escapeXml(String(k))}</Data></Cell>`
  ).join('');
  const headerRow = `<Row>${headerCells}</Row>`;

  const dataRows = data.map(row => {
    const cells = keys.map(key => {
      const value = row[key];
      const type = typeof value === 'number' ? 'Number' : 'String';
      const cellValue = value === null || value === undefined ? '' : String(value);
      return `<Cell><Data ss:Type="${type}">${escapeXml(cellValue)}</Data></Cell>`;
    }).join('');
    return `<Row>${cells}</Row>`;
  }).join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${escapeXml(sheetName)}">
    <Table>
      ${headerRow}
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "&apos;");
}
