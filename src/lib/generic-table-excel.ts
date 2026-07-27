function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Excel counterpart to downloadGenericTablePdf — takes the same
 * (title, subtitle, head, body) shape so report components can reuse the
 * exact rows/columns they already built for the PDF export.
 */
export async function downloadGenericTableExcel(
  title: string,
  subtitle: string,
  head: string[],
  body: (string | number)[][],
) {
  const XLSX = await import("xlsx");

  const aoa: (string | number)[][] = [[title], [subtitle], [], head, ...body];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!cols"] = head.map((h, i) => {
    let maxLen = String(h).length;
    for (const row of body) {
      const len = String(row[i] ?? "").length;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(Math.max(maxLen + 2, 10), 42) };
  });
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(head.length - 1, 0) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(head.length - 1, 0) } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${slugify(title)}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
