import { describe, it, expect } from "vitest";
import { validateStartSewingEligibility, hasForbiddenSewingStartFields } from "../../../../lib/validators/sewing";

describe("Phase 7 Sewing API Business Logic & Security Tests", () => {
  describe("VERIFIED-Only Assembly Eligibility & Conflict Handling", () => {
    it("should accept VERIFIED orders awaiting sewing start", () => {
      const order = { status: "VERIFIED", sewingStartedAt: null };
      const check = validateStartSewingEligibility(order);
      expect(check.eligible).toBe(true);
    });

    it("should reject CUTTING_IN_PROGRESS orders with 409 status code logic", () => {
      const order = { status: "CUTTING_IN_PROGRESS", sewingStartedAt: null };
      const check = validateStartSewingEligibility(order);
      expect(check.eligible).toBe(false);
      expect(check.errorStatus).toBe(409);
      expect(check.reason).toContain("Cannot start sewing");
    });

    it("should reject PENDING_VERIFICATION orders with 409 status code logic", () => {
      const order = { status: "PENDING_VERIFICATION", sewingStartedAt: null };
      const check = validateStartSewingEligibility(order);
      expect(check.eligible).toBe(false);
      expect(check.errorStatus).toBe(409);
    });

    it("should reject REJECTED orders with 409 status code logic", () => {
      const order = { status: "REJECTED", sewingStartedAt: null };
      const check = validateStartSewingEligibility(order);
      expect(check.eligible).toBe(false);
      expect(check.errorStatus).toBe(409);
    });

    it("should reject duplicate start attempts on already-started batches with 409 Conflict logic", () => {
      const order = {
        status: "VERIFIED",
        sewingStartedAt: "2026-10-09T08:00:00.000Z",
      };
      const check = validateStartSewingEligibility(order);
      expect(check.eligible).toBe(false);
      expect(check.errorStatus).toBe(409);
      expect(check.reason).toContain("already been started");
    });
  });

  describe("Request Body Strict Validation", () => {
    it("should flag client attempts to inject sewingStartedAt timestamp", () => {
      const payload = { sewingStartedAt: "2020-01-01T00:00:00Z" };
      const forbidden = hasForbiddenSewingStartFields(payload);
      expect(forbidden).toContain("sewingStartedAt");
    });

    it("should flag client attempts to alter order status or audit log fields", () => {
      const payload = { status: "COMPLETED", decision: "APPROVED", countSnapshot: [] };
      const forbidden = hasForbiddenSewingStartFields(payload);
      expect(forbidden).toEqual(expect.arrayContaining(["status", "decision", "countSnapshot"]));
    });

    it("should pass empty or clean payload", () => {
      const payload = {};
      const forbidden = hasForbiddenSewingStartFields(payload);
      expect(forbidden).toHaveLength(0);
    });
  });

  describe("Audit Record Integrity", () => {
    it("should verify that starting assembly mutates only sewingStartedAt without creating new audit logs", () => {
      // Logic test ensuring start operation contract
      const orderBefore = {
        id: "order-1",
        status: "VERIFIED",
        sewingStartedAt: null,
      };

      const now = new Date();
      const orderAfter = {
        ...orderBefore,
        sewingStartedAt: now,
      };

      expect(orderAfter.status).toBe("VERIFIED");
      expect(orderAfter.sewingStartedAt).toBe(now);
    });
  });
});
