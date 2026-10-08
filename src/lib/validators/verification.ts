import { z } from "zod";

export const MAX_COMPONENT_COUNT = 1000000;
export const STRICT_INTEGER_REGEX = /^\d+$/;

export const FORBIDDEN_VERIFIER_INPUT_FIELDS = [
  "verifierId",
  "verifiedAt",
  "decision",
  "status",
  "wastagePct",
  "timestamp",
];

export function hasForbiddenVerifierInputFields(data: Record<string, unknown>): string[] {
  const found: string[] = [];
  for (const field of FORBIDDEN_VERIFIER_INPUT_FIELDS) {
    if (field in data && data[field] !== undefined) {
      found.push(field);
    }
  }
  return found;
}

export function isValidCountString(val: unknown): boolean {
  if (typeof val === "number") {
    return Number.isInteger(val) && val >= 0 && val <= MAX_COMPONENT_COUNT;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return false;
    if (!STRICT_INTEGER_REGEX.test(trimmed)) return false;
    const num = parseInt(trimmed, 10);
    return !isNaN(num) && num >= 0 && num <= MAX_COMPONENT_COUNT;
  }
  return false;
}

export function computeComponentStatus(
  actualQty: number | null,
  expectedQty: number
): "GREEN" | "YELLOW" | "RED" | null {
  if (actualQty === null || actualQty === undefined) {
    return null;
  }
  if (actualQty === expectedQty) {
    return "GREEN";
  }
  if (actualQty > expectedQty) {
    return "YELLOW";
  }
  return "RED";
}

export function calculateWastage(
  actualFabricYds: number | string,
  expectedFabricYds: number | string
): number {
  const actual = typeof actualFabricYds === "number" ? actualFabricYds : parseFloat(actualFabricYds);
  const expected = typeof expectedFabricYds === "number" ? expectedFabricYds : parseFloat(expectedFabricYds);

  if (isNaN(actual) || isNaN(expected) || expected <= 0) {
    return 0;
  }

  const wastage = ((actual - expected) / expected) * 100;
  return Math.round(wastage * 100) / 100;
}

export interface VerificationItemCheck {
  componentId: string;
  componentName?: string;
  expectedQty: number;
  actualQty: number | null;
  status: "GREEN" | "YELLOW" | "RED" | null;
}

export function validateCompleteInspection(
  items: VerificationItemCheck[],
  totalRecipeComponentsCount: number,
  mode: "approve" | "reject"
): { canProceed: boolean; error?: string; details?: string[] } {
  if (items.length < totalRecipeComponentsCount) {
    return {
      canProceed: false,
      error: `Inspection incomplete. Required ${totalRecipeComponentsCount} recipe components, but found ${items.length}.`,
    };
  }

  const uncounted = items.filter((i) => i.actualQty === null || i.actualQty === undefined);
  if (uncounted.length > 0) {
    const names = uncounted.map((i) => i.componentName || i.componentId).join(", ");
    return {
      canProceed: false,
      error: `Inspection incomplete. ${uncounted.length} component(s) remain uncounted: (${names}). Every component must be counted before approval or rejection.`,
    };
  }

  if (mode === "approve") {
    const redItems = items.filter((i) => i.status === "RED" || (i.actualQty !== null && i.actualQty < i.expectedQty));
    if (redItems.length > 0) {
      const names = redItems.map((i) => i.componentName || i.componentId).join(", ");
      return {
        canProceed: false,
        error: `Approval blocked. ${redItems.length} component(s) are RED (count below expected): (${names}).`,
      };
    }
  }

  return { canProceed: true };
}

export const rejectionSchema = z.object({
  rejectionNote: z
    .string()
    .trim()
    .min(1, "Rejection note is required and cannot be blank."),
});

export const countUpdateSchema = z.object({
  counts: z
    .array(
      z.object({
        componentId: z.string().trim().min(1, "Component ID is required."),
        actualQty: z
          .union([z.number(), z.string(), z.null()])
          .refine(
            (val) => val === null || isValidCountString(val),
            { message: "Actual count must be a non-negative whole integer." }
          ),
      })
    )
    .min(1, "At least one count entry is required."),
});
