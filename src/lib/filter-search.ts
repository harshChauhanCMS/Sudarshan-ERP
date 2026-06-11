export function matchesFilterSearch(
  fields: Array<string | number | null | undefined>,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = fields
    .filter((v) => v != null && v !== "")
    .map((v) => String(v).toLowerCase())
    .join(" ");
  return hay.includes(q);
}

export function filterBySearch<T>(
  rows: readonly T[],
  query: string,
  pickFields: (row: T) => Array<string | number | null | undefined>
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((row) => matchesFilterSearch(pickFields(row), q));
}
