export const SUPPLIED_MATERIAL_CATALOG = [
  {
    id: "sup-talc",
    code: "RM-TAL-001",
    name: "Talc 400/500 Mesh",
    volumeMtd: "186 MT",
  },
  {
    id: "sup-cc",
    code: "RM-CC-002",
    name: "Calcium Carbonate 300M",
    volumeMtd: "142 MT",
  },
  {
    id: "sup-kaolin",
    code: "RM-CCL-005",
    name: "Kaolin Clay 200M",
    volumeMtd: "98 MT",
  },
  {
    id: "sup-detergent",
    code: "CH-ZEO-008",
    name: "Detergent Base Powder",
    volumeMtd: "75 MT",
  },
  {
    id: "sup-barytes",
    code: "RM-DOL-003",
    name: "Barytes 200 Mesh",
    volumeMtd: "62 MT",
  },
] as const;

export type SuppliedMaterialId = (typeof SUPPLIED_MATERIAL_CATALOG)[number]["id"];

export function findSuppliedMaterial(id: string) {
  return SUPPLIED_MATERIAL_CATALOG.find((m) => m.id === id);
}
