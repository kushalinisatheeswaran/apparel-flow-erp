import { describe, it, expect } from "vitest";
import {
  parseApprovedSnapshot,
  hasForbiddenSewingStartFields,
  validateStartSewingEligibility,
  isWastageOverCap,
  FORBIDDEN_SEWING_START_INPUT_FIELDS,
} from "../sewing";

describe("Phase 7 Sewing Queue Validator Unit Tests", () => {
  describe("Forbidden Field Detection", () => {
    it("should detect forbidden client-supplied state fields", () => {
      const payload = {
        sewingStartedAt: "2026-10-09T10:00:00Z",
        status: "VERIFIED",
        verifierId: "user-123",
      };
      const found = hasForbiddenSewingStartFields(payload);
      expect(found).toContain("sewingStartedAt");
      expect(found).toContain("status");
      expect(found).toContain("verifierId");
    });

    it("should return empty array for clean payloads without forbidden fields", () => {
      const payload = {};
      const found = hasForbiddenSewingStartFields(payload);
      expect(found).toHaveLength(0);
    });

    it("should cover all listed forbidden input fields", () => {
      expect(FORBIDDEN_SEWING_START_INPUT_FIELDS).toContain("sewingStartedAt");
      expect(FORBIDDEN_SEWING_START_INPUT_FIELDS).toContain("status");
      expect(FORBIDDEN_SEWING_START_INPUT_FIELDS).toContain("countSnapshot");
      expect(FORBIDDEN_SEWING_START_INPUT_FIELDS).toContain("decision");
    });
  });

  describe("Snapshot Parsing Logic", () => {
    it("should parse valid approved snapshot items correctly", () => {
      const rawSnapshot = [
        {
          componentId: "comp-1",
          componentName: "Front Panel",
          expectedQty: 100,
          actualQty: 100,
          variance: 0,
          status: "GREEN",
        },
        {
          componentId: "comp-2",
          componentName: "Sleeve",
          expectedQty: 200,
          actualQty: 205,
          variance: 5,
          status: "YELLOW",
        },
      ];

      const parsed = parseApprovedSnapshot(rawSnapshot);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].componentName).toBe("Front Panel");
      expect(parsed[0].status).toBe("GREEN");
      expect(parsed[1].variance).toBe(5);
      expect(parsed[1].status).toBe("YELLOW");
    });

    it("should return empty array for invalid or null snapshot input", () => {
      expect(parseApprovedSnapshot(null)).toEqual([]);
      expect(parseApprovedSnapshot(undefined)).toEqual([]);
      expect(parseApprovedSnapshot("invalid")).toEqual([]);
    });

    it("should safely handle fallback values for missing fields inside snapshot objects", () => {
      const raw = [{}];
      const parsed = parseApprovedSnapshot(raw);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].componentName).toBe("Component");
      expect(parsed[0].expectedQty).toBe(0);
      expect(parsed[0].actualQty).toBe(0);
    });
  });

  describe("Assembly Start Eligibility", () => {
    it("should allow starting assembly for VERIFIED order with null sewingStartedAt", () => {
      const result = validateStartSewingEligibility({
        status: "VERIFIED",
        sewingStartedAt: null,
      });
      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should block starting assembly if order status is not VERIFIED (e.g. PENDING_VERIFICATION)", () => {
      const result = validateStartSewingEligibility({
        status: "PENDING_VERIFICATION",
        sewingStartedAt: null,
      });
      expect(result.eligible).toBe(false);
      expect(result.errorStatus).toBe(409);
      expect(result.reason).toContain("Status must be 'VERIFIED'");
    });

    it("should block starting assembly if sewingStartedAt is already populated", () => {
      const result = validateStartSewingEligibility({
        status: "VERIFIED",
        sewingStartedAt: new Date(),
      });
      expect(result.eligible).toBe(false);
      expect(result.errorStatus).toBe(409);
      expect(result.reason).toContain("already been started");
    });
  });

  describe("Wastage Over-Cap Calculation", () => {
    it("should identify when wastage percentage exceeds recipe cap", () => {
      expect(isWastageOverCap(4.5, 3.0)).toBe(true);
      expect(isWastageOverCap("4.50", "3.00")).toBe(true);
    });

    it("should return false when wastage is within cap", () => {
      expect(isWastageOverCap(2.5, 3.0)).toBe(false);
      expect(isWastageOverCap(3.0, 3.0)).toBe(false);
    });
  });
});
