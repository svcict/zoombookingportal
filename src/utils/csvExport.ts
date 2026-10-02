// Generic CSV export for admin audit tables - takes the same row objects
// already rendered in a table and downloads them as a .csv file, no server
// round trip needed since the data's already in the browser.
export function exportToCsv(filename: string, rows: Record<string, any>[]): void {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: any): string => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
