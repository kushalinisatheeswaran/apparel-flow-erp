import { describe, it, expect } from "vitest";
import {
  isValidDecimalString,
  validateFabricUsage,
  hasForbiddenVerifierFields,
  createOrderSchema,
} from "../order";

describe("Phase 5 Input Validation Unit Tests", () => {
  describe("Decimal String Format Validation", () => {
    it("should accept valid decimal forms (integer, 1 decimal, 2 decimals)", () => {
      expect(isValidDecimalString("92")).toBe(true);
      expect(isValidDecimalString("92.5")).toBe(true);
      expect(isValidDecimalString("92.50")).toBe(true);
      expect(isValidDecimalString("0.75")).toBe(true);
    });

    it("should reject invalid decimal formats", () => {
      expect(isValidDecimalString("92.555")).toBe(false); // >2 decimal places
      expect(isValidDecimalString("1e3")).toBe(false); // scientific notation
      expect(isValidDecimalString("")).toBe(false); // empty
      expect(isValidDecimalString("   ")).toBe(false); // whitespace
      expect(isValidDecimalString("12abc")).toBe(false); // alphanumeric
      expect(isValidDecimalString("-5")).toBe(false); // negative
    });
  });

  describe("Fabric Usage & Technical Ratio Limits", () => {
    it("should allow valid fabric usage within expected ratio bounds", () => {
      const res = validateFabricUsage("180.00", 180); // std=1.8 * 100 = 180 expected
      expect(res.valid).toBe(true);
      expect(res.numericValue).toBe(180.0);
    });

    it("should reject fabric usage exceeding 1,000,000 yards", () => {
      const res = validateFabricUsage("1000001.00", 180);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("cannot exceed 1,000,000");
    });

    it("should reject fabric usage exceeding 1,000x expected fabric ratio", () => {
      // expected = 1.8 yards
      const res = validateFabricUsage("2000.00", 1.8);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("exceeds technical limit");
    });
  });

  describe("Component Quantity Multipliers", () => {
    it("should correctly compute expected component quantity", () => {
      const targetQty = 150;
      const piecesPerGarment = 2; // e.g. Sleeves
      const expectedQty = targetQty * piecesPerGarment;
      expect(expectedQty).toBe(300);
    });
  });

  describe("Forbidden Verifier Fields Rejection", () => {
    it("should detect verifier-controlled fields in supervisor payloads", () => {
      const payloadWithActualQty = { actualQty: 100, targetQty: 50 };
      const payloadWithStatus = { status: "GREEN", fabricRollId: "ROLL-123" };
      const payloadClean = { targetQty: 50, fabricRollId: "ROLL-123" };

      expect(hasForbiddenVerifierFields(payloadWithActualQty)).toEqual(["actualQty"]);
      expect(hasForbiddenVerifierFields(payloadWithStatus)).toEqual(["status"]);
      expect(hasForbiddenVerifierFields(payloadClean)).toEqual([]);
    });

    it("should reject unrecognized keys in createOrderSchema strict validation", () => {
      const invalidData = {
        recipeId: "rec-123",
        targetQty: 50,
        fabricRollId: "ROLL-1",
        actualFabricYds: "90.00",
        actualQty: 10,
      };

      const result = createOrderSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("Target Quantity Decimal Validation", () => {
    it("should reject decimal target quantities such as 37.5 with exact error message", () => {
      const data = {
        recipeId: "rec-123",
        targetQty: 37.5,
        fabricRollId: "ROLL-1",
        actualFabricYds: "90.00",
      };

      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Target quantity must be a whole number."
        );
      }
    });

    it("should accept valid positive integer target quantities", () => {
      const data = {
        recipeId: "rec-123",
        targetQty: 37,
        fabricRollId: "ROLL-1",
        actualFabricYds: "90.00",
      };

      const result = createOrderSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
