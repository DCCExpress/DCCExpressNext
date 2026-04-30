import type { CvBitDefinition } from "../components/CvBitEditor";

export type DecoderType = "loco" | "accessory";

export type CvDefinition = {
  cv: number;
  name: string;
  description: string;
  decoderTypes?: DecoderType[];
  min?: number;
  max?: number;
  defaultValue?: number;
  bits?: CvBitDefinition[];
  notes?: string[];
};

export async function loadCvDatabase(): Promise<CvDefinition[]> {
  const response = await fetch("/data/cv-database.json", {
    cache: "no-cache",
  });

  if (!response.ok) {
    throw new Error(`Failed to load CV database: ${response.status}`);
  }

  const data = (await response.json()) as unknown;

  if (!Array.isArray(data)) {
    throw new Error("Invalid CV database format");
  }

  return data.map(normalizeCvDefinition);
}

export function findCvDefinition(
  database: CvDefinition[],
  cv: number
): CvDefinition | undefined {
  return database.find((item) => item.cv === cv);
}

function normalizeCvDefinition(item: any): CvDefinition {
  return {
    cv: Number(item.cv),
    name: String(item.name ?? `CV ${item.cv}`),
    description: String(item.description ?? ""),
    decoderTypes: Array.isArray(item.decoderTypes)
      ? item.decoderTypes
      : undefined,
    min: typeof item.min === "number" ? item.min : undefined,
    max: typeof item.max === "number" ? item.max : undefined,
    defaultValue:
      typeof item.defaultValue === "number" ? item.defaultValue : undefined,
    bits: Array.isArray(item.bits)
      ? item.bits.map((bit: any) => ({
          bit: Number(bit.bit),
          label: String(bit.label ?? `Bit ${bit.bit}`),
          description:
            typeof bit.description === "string" ? bit.description : undefined,
        }))
      : undefined,
    notes: Array.isArray(item.notes)
      ? item.notes.map((note: unknown) => String(note))
      : undefined,
  };
}