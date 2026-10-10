# AI Optimization Report — ApparelFlow ERP

**Candidate:** Kushalini Satheeswaran
**Repository:** https://github.com/kushalinisatheeswaran/apparel-flow-erp
**Live application:** https://apparel-flow-erp-teal.vercel.app/

## 1. Tools & Prompting

| Tool | Used for |
| --- | --- |
| ChatGPT | Identifying edge cases, reviewing expected HTTP responses, drafting documentation , writing phase-by-phase implementation prompts |
| Claude | Architecture and database design, workflow design, checking the implementation against the assessment requirements |
| Antigravity | Implementing code from written phase prompts: scaffolding, role-specific workspaces, forms, component-count interfaces, styling, test structure |

**Areas of assistance**
- **Project scaffolding and implementation:** Next.js, TypeScript, component structure, and server-side application logic.
- **Database design:** Prisma models, entity relationships, and relational data handling.
- **UI implementation:** role-specific workspaces, forms, component-count interfaces, and styling.
- **Validation and testing:** identifying edge cases, structuring automated tests, and reviewing expected HTTP responses.
- **Code review and documentation:** checking the workflow against the assessment requirements and documenting design decisions and known limitations.

**Prompting approach.** Work was divided into phases: authentication and RBAC, supervisor order management, verifier and hard stop, sewing queue, tests, and deployment. Each coding prompt required the agent to inspect the code first, work only within an approved file list, and wait for approval before making changes. The agent was not permitted to commit, push, or deploy. I reviewed and committed all changes myself.

## 2. Flawed / Broken AI Code

| No. | Finding | Classification | Status |
| --- | --- | --- | --- |
| 2.1 | Decimal target quantity truncated (`37.5` became `37`) | AI implementation bug: numeric parsing | Fixed; covered by tests |
| 2.2 | Approval continued after a failed count-saving request | AI implementation bug: frontend control flow | Identified by source-code trace; corrected |
| 2.3 | `OrderForm.tsx` changed outside the approved file list | AI scope-control issue | Diff reviewed |

### 2.1 Target quantity truncated

- **Files:** `src/components/supervisor/OrderForm.tsx`, `src/lib/validators/order.ts`, `src/lib/validators/__tests__/order.test.ts`
- **Problem:** The generated code used `parseInt()` on the target quantity. A value such as `37.5` became `37` instead of being rejected.
- **Impact:** The stored quantity differed from what the supervisor entered, so expected component counts would be calculated from the wrong target.
- **Fix:** Whole-number validation in the form and a server-side Zod schema accepting positive integers up to 100,000, with no coercion.
- **Evidence:** `order.test.ts` covers decimal rejection and valid integers. A manual API test confirmed that creating an order with `targetQty: 37.5` returns `400`.

### 2.2 Approval continued after a count-saving failure

- **Location:** `src/components/verifier/VerificationTerminal.tsx`
- **Problem:** `handleApprove()` awaits `handleSaveCounts()` before sending the approval request. However, `handleSaveCounts()` returns `Promise<void>` and handles failures internally without returning a success indicator or throwing. As a result, `handleApprove()` could not tell whether saving had succeeded, and it continued to `POST /api/verifier/orders/${order.id}/approve` even after the preceding `PUT /api/verifier/orders/${order.id}/counts` had failed.
- **Impact:** The approval flow could proceed using previously persisted data instead of the latest counts entered in the interface. The backend independently validates the stored counts, so an invalid batch could not be approved, but the frontend flow could still submit approval against stale data and mislead the verifier.
- **Correction:** `handleSaveCounts()` now returns an explicit success or failure result. `handleApprove()` stops and shows an error when saving fails, and sends the approval request only after the counts are saved.
- **How it was found:** By reading the code path while investigating why approval behaved unexpectedly. The Approve button's disabled state (`disabled={!canApprove || isApproving}`) correctly blocks uncounted, invalid, or RED components and allows YELLOW, so the defect was in the control flow after the click.
- **Lesson:** AI-generated async handlers need explicit success and failure results. A `try/catch` that only displays an error is not enough when the caller continues regardless. Business rules must also be tested end to end (save counts, approve, sewing queue) instead of relying on the displayed status.

### 2.3 Out-of-scope change to `OrderForm.tsx`

- **Problem:** The coding agent modified `src/components/supervisor/OrderForm.tsx`, which was not on the approved file list for that task.
- **What changed:** Labels, contrast, spacing, and focus states only.
- **Review outcome:** I reviewed the diff and kept the changes because they were presentation-only and supported the assessment's contrast and usability requirements.
- **Lesson:** Compare every AI diff with the approved file list before accepting it, even when the change looks useful.

## 3. Human Refactoring

- **Business rules the brief left open, decided and documented by me:** expected fabric is target quantity × standard yards per garment; exceeding the wastage cap flags the order but does not block approval; approval is allowed only from `PENDING_VERIFICATION`; a rejected order stays in `REJECTED` until correction begins, then returns to `CUTTING_IN_PROGRESS` for resubmission.
- **Strict numeric validation:** Zod schemas with no coercion. Garment quantity must be a positive integer, component counts non-negative integers, and fabric usage at most two decimal places.
- **Rejected-batch correction workflow:** a rejected order can be corrected and resubmitted. Earlier verification logs are kept, and snapshots preserve each decision's counts and fabric figures.
- **Fabric for replacement pieces (real factory scenario):** re-cutting consumes extra fabric, so recorded fabric usage may increase but not decrease during correction. The recipe, target quantity, and roll ID are locked after first submission. The original roll ID is retained, which is listed as a known limitation.
- **Separation of duties:** supervisors cannot enter or change verifier-controlled counts.
- **Server-computed QC status:** the traffic-light status is calculated on the server and is not trusted from the client.
- **Concurrency hardening:** approval and rejection run in interactive Prisma transactions with `SELECT ... FOR UPDATE` row locks (see section 4).
- **Contrast and accessibility:** improved labels, input contrast, spacing, and focus states, and QC results shown with both colour and text labels.
- **Change control:** each AI-generated diff was reviewed against the approved file list before committing.

## 4. Defensive Architecture

- **State machine:** `CUTTING_IN_PROGRESS → PENDING_VERIFICATION → VERIFIED → Sewing Queue`. A rejected order enters `REJECTED`, then returns to `CUTTING_IN_PROGRESS` when correction begins. Invalid transitions return `409`.
- **Server-side RBAC:** protected routes obtain the user and role from the Auth.js session on the server. Unauthenticated requests return `401` and the wrong role returns `403`. Hidden buttons and tabs are treated as usability features, not security boundaries.
- **Hard stop:** approval validates the persisted verification data rather than client-provided traffic-light values. It requires every recipe component to be counted and none to be RED. Otherwise it returns `422`, including for direct API calls.
- **Rejection reason:** required and validated on the server, then retained in the audit trail.
- **Sewing queue isolation:** the queue query filters `status = 'VERIFIED'` in the database, so URL parameters cannot reveal unapproved orders.
- **Audit attribution:** the verifier identity comes from the authenticated session, never from the request body. Logs store the decision, timestamp, count snapshot, fabric snapshots, and wastage percentage. Logs are append-only at application level.
- **Input guards:** invalid, negative, fractional, non-numeric, and empty values are rejected on the server.
- **Transaction safety:** `approve/route.ts` and `reject/route.ts` use interactive Prisma transactions with PostgreSQL `SELECT ... FOR UPDATE` row locks. After acquiring the lock, each handler checks that the order is in `PENDING_VERIFICATION`. The status update and the verification audit log are written in the same transaction. When concurrent requests target one order, the lock serializes them. After the first decision commits, the second request reads the new status and receives `409 Conflict`. The status condition is an application-level check inside the locked transaction. The Prisma `update` itself uses `where: { id: orderId }` and has no status predicate.

### Automated testing

| Check | Result |
| --- | --- |
| `npm test` | 48/48 passed across 4 files: sewing API 9, sewing validators 11, verification validators 18, order validators 10 |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed |

### Required test scenarios

| Required scenario | Automated coverage | Manual API verification |
| --- | --- | --- |
| All-GREEN order approved by a verifier | `verification.test.ts`: approval eligibility with all components counted and none RED | Approval of a fully counted order with no RED items: `200`, passed |
| RED component blocks approval | `verification.test.ts`: block approval when a component is RED | Approval with a RED component: `422`, passed |
| Rejection without a reason refused | `verification.test.ts`: blank and whitespace-only notes rejected | Passed |
| Non-verifier receives 403 | Server-side role checks; no dedicated automated route test | Supervisor calling the approve endpoint: `403`, passed |
| Unapproved orders excluded from the sewing queue | `sewing.test.ts` and `sewingApi.test.ts`: non-`VERIFIED` orders ineligible | Sewing queue returns only `VERIFIED` orders: `200`, passed |

### Manual API verification (Postman)

All results matched the expected outcomes.

| Test ID | Request | Expected | Result |
| --- | --- | --- | --- |
| AUTH-01 | `GET /api/supervisor/orders` without a session | `401` | Passed |
| AUTH-02 | `POST /api/verifier/orders/:id/approve` as supervisor | `403` | Passed |
| ORD-01 | `POST /api/supervisor/orders` with valid data | `201` | Passed |
| ORD-03 | Create an order with `targetQty: 37.5` | `400` | Passed |
| VER-01 | Submit a decimal component count | `400` | Passed |
| VER-05 | Attempt approval with a RED component | `422` | Passed |
| VER-07 | Approve a fully counted order with no RED items | `200` | Passed |
| AUTH-05 / SEW-01 | Retrieve the sewing queue as sewing supervisor | `200` | Passed |
| SEW-03 | Start sewing for a verified order | `200` | Passed |

Local results are not treated as proof of deployed behaviour, so the main flows were also exercised in the deployed application.

### Known limitations
- The original fabric roll ID is retained during re-cutting; separate re-cut rolls are not tracked.
-* **Test coverage limitation:** Automated Vitest tests cover validation rules and selected sewing and verification logic. Some role-authorization and API/database integration scenarios were verified manually rather than through dedicated automated integration tests.
