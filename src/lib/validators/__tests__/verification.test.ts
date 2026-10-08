import { describe, it, expect } from "vitest";
import {
  isValidCountString,
  computeComponentStatus,
  calculateWastage,
  validateCompleteInspection,
  rejectionSchema,
  countUpdateSchema,
} from "../verification";

describe("Phase 6 Cutting Verification Terminal Unit Tests", () => {
  describe("Count String & Format Validation", () => {
    it("should accept valid non-negative whole integers", () => {
      expect(isValidCountString(0)).toBe(true);
      expect(isValidCountString(50)).toBe(true);
      expect(isValidCountString("0")).toBe(true);
      expect(isValidCountString("100")).toBe(true);
    });

    it("should reject decimal quantities such as 37.5", () => {
      expect(isValidCountString(37.5)).toBe(false);
      expect(isValidCountString("37.5")).toBe(false);
      expect(isValidCountString("37.0")).toBe(false); // contains decimal point
    });

    it("should reject negative numbers, letters, and scientific notation", () => {
      expect(isValidCountString(-5)).toBe(false);
      expect(isValidCountString("-5")).toBe(false);
      expect(isValidCountString("1e3")).toBe(false);
      expect(isValidCountString("abc")).toBe(false);
      expect(isValidCountString("")).toBe(false);
    });
  });

  describe("Traffic-Light Status Math", () => {
    it("should return null when actualQty is null (Uncounted)", () => {
      expect(computeComponentStatus(null, 50)).toBeNull();
    });

    it("should return GREEN when actualQty equals expectedQty", () => {
      expect(computeComponentStatus(50, 50)).toBe("GREEN");
    });

    it("should return YELLOW when actualQty exceeds expectedQty", () => {
      expect(computeComponentStatus(52, 50)).toBe("YELLOW");
    });

    it("should return RED when actualQty is below expectedQty (including 0)", () => {
      expect(computeComponentStatus(48, 50)).toBe("RED");
      expect(computeComponentStatus(0, 50)).toBe("RED");
    });
  });

  describe("Wastage Calculation & Rounding", () => {
    it("should correctly compute wastage percentage and round to 2 decimal places", () => {
      // expected = 180, actual = 185.50
      // ((185.5 - 180) / 180) * 100 = 3.05555... -> 3.06
      expect(calculateWastage("185.50", 180)).toBe(3.06);
    });

    it("should handle zero and negative wastage (fabric usage below standard)", () => {
      expect(calculateWastage(180, 180)).toBe(0);
      expect(calculateWastage(175, 180)).toBe(-2.78);
    });
  });

  describe("Complete Inspection Hard-Stop Validation", () => {
    const completeItemsNoRed = [
      { componentId: "c1", componentName: "Front", expectedQty: 50, actualQty: 50, status: "GREEN" as const },
      { componentId: "c2", componentName: "Back", expectedQty: 50, actualQty: 52, status: "YELLOW" as const },
    ];

    const completeItemsWithRed = [
      { componentId: "c1", componentName: "Front", expectedQty: 50, actualQty: 50, status: "GREEN" as const },
      { componentId: "c2", componentName: "Back", expectedQty: 50, actualQty: 46, status: "RED" as const },
    ];

    const incompleteItems = [
      { componentId: "c1", componentName: "Front", expectedQty: 50, actualQty: 50, status: "GREEN" as const },
      { componentId: "c2", componentName: "Back", expectedQty: 50, actualQty: null, status: null },
    ];

    it("should allow approval when all components are counted and none are RED (YELLOW allowed)", () => {
      const res = validateCompleteInspection(completeItemsNoRed, 2, "approve");
      expect(res.canProceed).toBe(true);
    });

    it("should block approval with HTTP 422 payload logic when a component is RED", () => {
      const res = validateCompleteInspection(completeItemsWithRed, 2, "approve");
      expect(res.canProceed).toBe(false);
      expect(res.error).toContain("Approval blocked");
    });

    it("should block approval when any component is uncounted", () => {
      const res = validateCompleteInspection(incompleteItems, 2, "approve");
      expect(res.canProceed).toBe(false);
      expect(res.error).toContain("Inspection incomplete");
    });

    it("should block rejection when any component is uncounted (complete inspection rule)", () => {
      const res = validateCompleteInspection(incompleteItems, 2, "reject");
      expect(res.canProceed).toBe(false);
      expect(res.error).toContain("Inspection incomplete");
    });

    it("should allow rejection when all components are counted (even if RED, GREEN, or YELLOW)", () => {
      const res = validateCompleteInspection(completeItemsWithRed, 2, "reject");
      expect(res.canProceed).toBe(true);
    });
  });

  describe("Rejection Schema Validation", () => {
    it("should accept valid rejection notes", () => {
      const res = rejectionSchema.safeParse({ rejectionNote: "Damaged sleeves found on batch" });
      expect(res.success).toBe(true);
    });

    it("should reject blank or whitespace-only rejection notes", () => {
      expect(rejectionSchema.safeParse({ rejectionNote: "" }).success).toBe(false);
      expect(rejectionSchema.safeParse({ rejectionNote: "   " }).success).toBe(false);
    });
  });

  describe("Count Update Schema Validation", () => {
    it("should reject decimal count inputs like 37.5 in count update schema", () => {
      const res = countUpdateSchema.safeParse({
        counts: [{ componentId: "c1", actualQty: "37.5" }],
      });
      expect(res.success).toBe(false);
    });

    it("should accept valid count inputs in count update schema", () => {
      const res = countUpdateSchema.safeParse({
        counts: [{ componentId: "c1", actualQty: 37 }],
      });
      expect(res.success).toBe(true);
    });
  });
});
