import { z } from "zod";

export const DECIMAL_REGEX = /^\d+(?:\.\d{1,2})?$/;
export const MAX_TARGET_QTY = 100000;
export const MAX_FABRIC_YARDS = 1000000;
export const MAX_FABRIC_RATIO_MULTIPLIER = 1000;

export const FORBIDDEN_VERIFIER_FIELDS = [
  "actualQty",
  "status",
  "verificationItems",
  "verifierId",
  "decision",
  "rejectionNote",
  "countSnapshot",
  "wastagePct",
];

export function hasForbiddenVerifierFields(data: Record<string, unknown>): string[] {
  const found: string[] = [];
  for (const field of FORBIDDEN_VERIFIER_FIELDS) {
    if (field in data && data[field] !== undefined) {
      found.push(field);
    }
  }
  return found;
}

export function isValidDecimalString(val: string): boolean {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  return DECIMAL_REGEX.test(trimmed);
}

export function validateFabricUsage(
  actualYardsStr: string,
  expectedYardsNum: number
): { valid: boolean; error?: string; numericValue?: number } {
  if (!isValidDecimalString(actualYardsStr)) {
    return {
      valid: false,
      error:
        "Actual fabric usage must be a valid positive number with up to 2 decimal places.",
    };
  }

  const num = parseFloat(actualYardsStr.trim());
  if (isNaN(num) || num <= 0) {
    return {
      valid: false,
      error: "Actual fabric usage must be a positive number greater than 0.",
    };
  }

  if (num > MAX_FABRIC_YARDS) {
    return {
      valid: false,
      error: `Actual fabric usage cannot exceed ${MAX_FABRIC_YARDS.toLocaleString()} yards.`,
    };
  }

  if (expectedYardsNum > 0) {
    const maxAllowed = expectedYardsNum * MAX_FABRIC_RATIO_MULTIPLIER;
    if (num > maxAllowed) {
      return {
        valid: false,
        error: `Actual fabric usage exceeds technical limit (${MAX_FABRIC_RATIO_MULTIPLIER}x expected fabric).`,
      };
    }
  }

  return { valid: true, numericValue: num };
}

export const createOrderSchema = z
  .object({
    recipeId: z.string().trim().min(1, "Recipe selection is required."),
    targetQty: z
      .number()
      .int("Target quantity must be a whole number.")
      .positive("Target quantity must be greater than 0.")
      .max(MAX_TARGET_QTY, `Target quantity cannot exceed ${MAX_TARGET_QTY.toLocaleString()}.`),
    fabricRollId: z.string().trim().min(1, "Fabric roll ID cannot be empty or whitespace."),
    actualFabricYds: z.string().trim().min(1, "Actual fabric usage is required."),
  })
  .strict();

export const updateOrderSchema = z
  .object({
    recipeId: z.string().trim().min(1).optional(),
    targetQty: z
      .number()
      .int("Target quantity must be a whole number.")
      .positive("Target quantity must be greater than 0.")
      .max(MAX_TARGET_QTY)
      .optional(),
    fabricRollId: z.string().trim().min(1).optional(),
    actualFabricYds: z.string().trim().min(1).optional(),
  })
  .strict();
