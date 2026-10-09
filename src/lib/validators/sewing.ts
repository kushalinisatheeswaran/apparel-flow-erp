export interface ApprovedComponentSnapshot {
  componentId: string;
  componentName: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
  status: "GREEN" | "YELLOW" | "RED";
}

export const FORBIDDEN_SEWING_START_INPUT_FIELDS = [
  "sewingStartedAt",
  "sewing_started_at",
  "status",
  "verifierId",
  "verifier_id",
  "decision",
  "rejectionNote",
  "rejection_note",
  "wastagePct",
  "wastage_pct",
  "fabricUsedSnapshot",
  "expectedFabricSnapshot",
  "countSnapshot",
  "count_snapshot",
  "timestamp",
  "id",
  "orderNo",
  "recipeId",
  "targetQty",
  "fabricRollId",
  "actualFabricYds",
  "createdBy",
  "createdAt",
  "updatedAt",
  "firstSubmittedAt",
];

export function hasForbiddenSewingStartFields(data: Record<string, unknown>): string[] {
  const found: string[] = [];
  for (const field of FORBIDDEN_SEWING_START_INPUT_FIELDS) {
    if (field in data && data[field] !== undefined) {
      found.push(field);
    }
  }
  return found;
}

export function parseApprovedSnapshot(rawSnapshot: unknown): ApprovedComponentSnapshot[] {
  if (!rawSnapshot || !Array.isArray(rawSnapshot)) {
    return [];
  }
  return rawSnapshot.map((item) => {
    if (typeof item !== "object" || item === null) {
      return {
        componentId: "",
        componentName: "Unknown Component",
        expectedQty: 0,
        actualQty: 0,
        variance: 0,
        status: "RED" as const,
      };
    }
    const record = item as Record<string, unknown>;
    const expectedQty = typeof record.expectedQty === "number" ? record.expectedQty : 0;
    const actualQty = typeof record.actualQty === "number" ? record.actualQty : 0;
    const variance =
      typeof record.variance === "number" ? record.variance : actualQty - expectedQty;
    let status: "GREEN" | "YELLOW" | "RED" = "GREEN";
    if (
      record.status === "GREEN" ||
      record.status === "YELLOW" ||
      record.status === "RED"
    ) {
      status = record.status;
    } else {
      status = actualQty === expectedQty ? "GREEN" : actualQty > expectedQty ? "YELLOW" : "RED";
    }
    return {
      componentId: String(record.componentId || ""),
      componentName: String(record.componentName || "Component"),
      expectedQty,
      actualQty,
      variance,
      status,
    };
  });
}

export function validateStartSewingEligibility(order: {
  status: string;
  sewingStartedAt: Date | string | null;
}): { eligible: boolean; reason?: string; errorStatus?: 409 | 400 | 404 } {
  if (order.status !== "VERIFIED") {
    return {
      eligible: false,
      reason: `Cannot start sewing for order in status '${order.status}'. Status must be 'VERIFIED'.`,
      errorStatus: 409,
    };
  }
  if (order.sewingStartedAt !== null && order.sewingStartedAt !== undefined) {
    return {
      eligible: false,
      reason: "Sewing assembly has already been started for this order.",
      errorStatus: 409,
    };
  }
  return { eligible: true };
}

export function isWastageOverCap(
  wastagePct: number | string,
  wastageCap: number | string
): boolean {
  const w = typeof wastagePct === "number" ? wastagePct : parseFloat(String(wastagePct));
  const c = typeof wastageCap === "number" ? wastageCap : parseFloat(String(wastageCap));
  if (isNaN(w) || isNaN(c)) return false;
  return w > c;
}
