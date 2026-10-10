# ApparelFlow ERP

A role-based apparel production management system for managing cutting orders, verifying garment components, tracking fabric usage and wastage, and controlling the handoff of approved orders to sewing.

**Live Demo:** https://apparel-flow-erp-teal.vercel.app/
**GitHub Repository:** https://github.com/kushalinisatheeswaran/apparel-flow-erp

## 1. Project Overview

ApparelFlow ERP digitizes the cutting and verification stages of garment production. Cutting supervisors create and manage cutting orders, cutting verifiers record physical component counts and make verification decisions, and sewing supervisors access eligible verified orders.

The system provides role-based access control, server-side validation, component-level quality checks, fabric wastage calculations, a correction and resubmission workflow, and verification audit history.

## 2. Technology Stack

* **Frontend:** Next.js, React, TypeScript
* **Styling:** Tailwind CSS
* **Backend:** Next.js App Router and Route Handlers
* **Database:** PostgreSQL hosted on Neon
* **ORM:** Prisma
* **Authentication:** Auth.js Credentials provider
* **Validation:** Zod
* **Password hashing:** bcryptjs
* **Automated testing:** Vitest
* **Code quality:** TypeScript and ESLint
* **Deployment:** Vercel

### Architecture Summary

ApparelFlow ERP is a full-stack Next.js application using the App Router. React pages provide role-specific workspaces, while Route Handlers implement server-side business logic. Protected handlers obtain the authenticated user's identity and role from the Auth.js session and enforce permissions before performing database operations through Prisma and PostgreSQL.

Zod validates incoming data, while server-side business rules control order creation, component verification, approval, rejection, correction, and sewing eligibility. Approval and rejection operations use interactive Prisma transactions with PostgreSQL `SELECT ... FOR UPDATE` row-level locks. These handlers check that an order is in `PENDING_VERIFICATION` before changing its status and create the corresponding verification audit log within the same transaction.

Frontend controls improve usability, but server-side authorization and validation are the authoritative enforcement points.

## 3. User Roles

| Role               | Responsibilities                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Cutting Supervisor | Create cutting orders, edit orders in progress, submit orders for verification, and correct rejected orders |
| Cutting Verifier   | Record component counts, review QC results, approve eligible orders, and reject orders with a reason        |
| Sewing Supervisor  | View verified orders in the sewing queue and start sewing assembly                                          |

Protected pages and API operations enforce authentication and role-based authorization.

## 4. Production Workflow

1. **Create an order:** The cutting supervisor selects a recipe and enters a valid positive whole-number target quantity, fabric roll ID, and actual fabric usage.
2. **Save the order:** The order enters `CUTTING_IN_PROGRESS` and can be edited by the supervisor.
3. **Submit for verification:** The order transitions to `PENDING_VERIFICATION`.
4. **Verify components:** The cutting verifier records the usable physical pieces for every required recipe component. Damaged pieces are excluded from the usable count.
5. **Approve or reject:** The verifier reviews the component-level QC results. Approval is permitted only when all required components have been counted and none has a RED result. Rejection requires a reason.
6. **Correct and resubmit:** A rejected order first remains in `REJECTED`. When the supervisor begins the correction workflow, it returns to `CUTTING_IN_PROGRESS`. The supervisor makes the necessary corrections and resubmits it for verification. Previous verification logs are retained.
7. **Start sewing:** Only orders with `VERIFIED` status are eligible for the sewing queue. The sewing supervisor starts sewing assembly, the start time is recorded, and the order is shown as **Sewing Started** in the queue.

### Order Statuses

| Status                 | Meaning                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `CUTTING_IN_PROGRESS`  | The supervisor is preparing or correcting the order            |
| `PENDING_VERIFICATION` | The order has been submitted and is awaiting verification      |
| `REJECTED`             | Verification was rejected; the order awaits correction         |
| `VERIFIED`             | The order passed the approval rules and is eligible for sewing |

## 5. Component Quality Control

Expected component quantities are calculated from the selected recipe and target quantity.

**Expected component quantity = Pieces required per garment × Target quantity**

For example, if a garment requires two sleeves per garment and the target quantity is 20, the expected quantity is 40 sleeves.

The verifier records actual usable quantities. The application compares actual quantities against expected quantities to determine the QC result.

| QC result     | Condition                                  | Approval rule                                   |
| ------------- | ------------------------------------------ | ----------------------------------------------- |
| GREEN         | Actual quantity equals expected quantity   | Eligible if all required components are counted |
| YELLOW        | Actual quantity exceeds expected quantity  | Eligible if all required components are counted |
| RED           | Actual quantity is below expected quantity | Approval blocked                                |
| Missing count | A required component has not been counted  | Approval blocked                                |

The server enforces these approval conditions rather than relying only on frontend controls.

## 6. Fabric Usage and Wastage

Expected fabric consumption is calculated using the selected recipe's standard fabric allowance.

**Expected fabric usage = Target quantity × Standard fabric yards per garment**

**Wastage percentage = ((Actual fabric usage − Expected fabric usage) ÷ Expected fabric usage) × 100**

The calculated wastage percentage is compared with the recipe's configured wastage cap. Exceeding the cap flags the order for attention but does not, by itself, block approval.

Fabric usage supports up to two decimal places. During corrections, the original fabric roll ID is retained for re-cutting, and recorded fabric usage may be increased but not decreased.

## 7. Sewing Queue

The sewing queue is restricted to the sewing supervisor role. The queue endpoint is `GET /api/sewing/queue`.

The database query filters orders using `status = 'VERIFIED'`. Consequently, orders that are in cutting progress, pending verification, or rejected are excluded from the queue.

The queue displays relevant order and verification information, including verifier details, verification timestamps, component variances, and fabric wastage information.

When the sewing supervisor starts assembly, the server records `sewing_started_at` and the order is displayed as **Sewing Started** in the queue.

## 8. Role-Based Access, Audit Trail, and Security

* Authentication is required for protected application features.
* API routes enforce role permissions on the server.
* Cutting supervisors cannot access verifier-only operations or the sewing queue.
* Cutting verifiers cannot access supervisor-only operations or the sewing queue.
* Sewing supervisors cannot perform cutting supervisor or verifier operations.
* Sewing access is restricted to verified orders.
* Zod validates incoming data on the server.
* Target production quantities must be positive whole numbers.
* Rejection requires a reason.
* Approval is blocked when component counts are missing or any component is RED.
* Passwords are hashed rather than stored as plaintext.
* Database credentials and authentication secrets must be configured through environment variables and must not be committed to the repository.

### Transaction Safety and Concurrent Verification

The approval handler (`src/app/api/verifier/orders/[id]/approve/route.ts`) and rejection handler (`src/app/api/verifier/orders/[id]/reject/route.ts`) use interactive Prisma transactions and PostgreSQL `SELECT ... FOR UPDATE` row-level locks.

Both handlers check that the order is in `PENDING_VERIFICATION` after acquiring the lock. The order status update and the corresponding verification audit-log creation occur within the same transaction, keeping these changes atomic.

When concurrent approval or rejection requests target the same order, the row lock serializes access. After the first transaction commits its decision, the subsequent request reads the updated status and fails the pending-verification check, returning `409 Conflict` rather than processing a second decision.

The status condition is enforced by an application-level check inside the locked transaction; the Prisma `update` operation itself uses `where: { id: orderId }`, not a conditional status predicate.

### Audit Trail

Verification decisions create audit records containing the verifier identity, decision, timestamp, component-count snapshot, fabric-usage snapshots, expected fabric usage, wastage percentage, and rejection reason where applicable.

The verifier identity is obtained from the authenticated server-side session, not accepted as a trusted identity supplied in the request body. Sewing-start timestamps and workflow status are likewise controlled by the server.

Verification logs are treated as append-only records by the application workflow: new decisions create log entries, and the normal workflow does not provide a client operation to edit previous decisions. This describes application-level behavior; it does not imply a separate database trigger that makes rows physically immutable.

Approved orders are excluded from the supervisor's editable-order workflow. The sewing queue uses a database-level status filter rather than relying on a client-side filter or URL parameter.

## 9. Database Design

The PostgreSQL database contains six main entities.

| Entity               | Key attributes                                                                                                                                                                                      | Relationships                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `users`              | `id`, `email`, `password_hash`, `role`, `full_name`, `created_at`                                                                                                                                   | Creates cutting orders and is referenced by verification logs    |
| `recipes`            | `id`, `recipe_code`, `name`, `category`, `std_fabric_yards`, `wastage_cap`                                                                                                                          | Has many recipe components and cutting orders                    |
| `recipe_components`  | `id`, `recipe_id`, `component_name`, `pieces_per_garment`, `image_url`                                                                                                                              | Belongs to a recipe; referenced by verification items            |
| `cutting_orders`     | `id`, `order_no`, `order_sequence`, `recipe_id`, `target_qty`, `fabric_roll_id`, `actual_fabric_yds`, `status`, `created_by`, `first_submitted_at`, `sewing_started_at`, `created_at`, `updated_at` | Belongs to a recipe and creator; has verification items and logs |
| `verification_items` | `id`, `order_id`, `component_id`, `expected_qty`, `actual_qty`, `status`                                                                                                                            | Belongs to a cutting order and recipe component                  |
| `verification_logs`  | `id`, `order_id`, `verifier_id`, `decision`, `rejection_note`, `wastage_pct`, `fabric_used_snapshot`, `expected_fabric_snapshot`, `count_snapshot`, `timestamp`                                     | Belongs to a cutting order and verifier                          |

### Important Schema Rules

* User email addresses and recipe codes are unique.
* Each recipe component name is unique within its recipe.
* Each order has a unique order number and sequence.
* Each order has at most one verification item per recipe component.
* `actual_qty` can be null to represent a component that has not yet been counted.
* Verification logs store decision-time snapshots so previous verification results can be reviewed independently of subsequent correction activity.
* Database relationships connect orders to their recipes and creators, verification items to orders and components, and verification logs to orders and verifiers.

## 10. Seeded Recipes

### Casual Blouse — `REC-BL01`

* **Category:** Blouse
* **Standard fabric allowance:** 1.80 yards per garment
* **Wastage cap:** 5%

| Component              | Pieces per garment |
| ---------------------- | -----------------: |
| Front Body Panel       |                  1 |
| Back Body Panel        |                  1 |
| Sleeves (Left & Right) |                  2 |
| Collar & Stand         |                  1 |
| Sleeve Cuffs           |                  2 |

### Crop Top — `REC-CT02`

* **Category:** Crop Top
* **Standard fabric allowance:** 1.10 yards per garment
* **Wastage cap:** 8%

| Component          | Pieces per garment |
| ------------------ | -----------------: |
| Front Chest Panel  |                  1 |
| Back Support Panel |                  1 |
| Neck Binding Strip |                  1 |
| Hem Elastic Casing |                  1 |
| Side Strap Accents |                  2 |

## 11. API Response Codes

| HTTP status                | Meaning                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `200 OK`                   | Request completed successfully                                                             |
| `201 Created`              | Resource created successfully                                                              |
| `400 Bad Request`          | Invalid input or missing required rejection reason                                         |
| `401 Unauthorized`         | Authentication required or session unavailable                                             |
| `403 Forbidden`            | Authenticated user does not have the required role                                         |
| `404 Not Found`            | Requested resource does not exist                                                          |
| `409 Conflict`             | Invalid workflow transition or conflicting operation                                       |
| `422 Unprocessable Entity` | Verification cannot be approved because counts are missing or a component has a RED result |

## 12. User Interface and Accessibility

The interface uses a consistent light theme with clear text and input contrast. Form controls have visible boundaries and focus states.

The login page includes a demo-credentials panel with quick-select buttons for the three demo roles. Authenticated workspaces display the current role, and the **Switch Role** action allows the user to sign out and choose another demo account.

QC results are communicated through both color and text labels, so users do not need to rely on color alone to understand the result.

## 13. Demo Accounts

The application includes seeded accounts for demonstrating each role.

| Role               | Email                         |
| ------------------ | ----------------------------- |
| Cutting Supervisor | `supervisor@apparelflow.demo` |
| Cutting Verifier   | `verifier@apparelflow.demo`   |
| Sewing Supervisor  | `sewing@apparelflow.demo`     |

**Demo password:** `Apparel@Demo`

The login page displays a demo-credentials panel and allows users to select a role's account to prefill the login form. The demo password shown or prefilled by the panel is controlled by the configured public demo-password environment variable.

## 14. Local Setup

### Prerequisites

* Node.js 20.9 or newer
* npm
* PostgreSQL or a Neon PostgreSQL database

### Environment Variables

Configure the variables required by the application in `.env`. Do not commit secrets or database credentials.

| Variable                    | Purpose                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | PostgreSQL connection used by the application and seed script                         |
| `DIRECT_URL`                | Direct PostgreSQL connection used by Prisma CLI configuration                         |
| `AUTH_SECRET`               | Secret used by Auth.js                                                                |
| `SEED_DEMO_PASSWORD`        | Password used when creating seeded demo accounts; must contain at least 12 characters |
| `NEXT_PUBLIC_DEMO_PASSWORD` | Password displayed or prefilled by the demo-credentials panel                         |

Use appropriate values for your own environment. The public demo-password variable is exposed to the browser, so it must only contain the intended demo credential, never a database password or authentication secret.

### Installation

1. Clone the repository:

```bash
   git clone https://github.com/kushalinisatheeswaran/apparel-flow-erp.git
   cd apparel-flow-erp
```

2. Install dependencies:

```bash
   npm install
```

3. Create `.env` and configure the environment variables listed above.

4. Apply the existing Prisma migrations:

```bash
   npx prisma migrate deploy --config prisma7.config.ts
```

5. Generate the Prisma Client:

```bash
   npx prisma generate --config prisma7.config.ts
```

6. Seed the database with demo accounts and recipe data:

```bash
   npx prisma db seed --config prisma7.config.ts
```

7. Start the development server:

```bash
   npm run dev
```

8. Open `http://localhost:3000` in your browser.

The Prisma configuration uses `DIRECT_URL` for CLI database operations, while the application and seed script use `DATABASE_URL`. Ensure both are configured for the intended database before running migrations or seeding.

## 15. Testing and Quality Checks

Run the following commands:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

### Final Verification Results

The final local verification run completed successfully:

* **Automated tests:** 48/48 passed across 4 test files
* **TypeScript:** Passed with no reported errors
* **ESLint:** Passed with no reported errors
* **Production build:** Passed, including Prisma Client generation and Next.js page generation

The automated tests cover target-quantity validation, count formatting, QC status calculation, wastage calculations, rejection-note validation, forbidden client-supplied fields, approved snapshots, and sewing-start eligibility.

### Mapping to Required Test Scenarios

Each required scenario was verified through automated tests and/or manual API testing with Postman.

| Required scenario                                | Automated coverage                                                                                                                                  | Manual API verification                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| All-GREEN order approved by a verifier           | `src/lib/validators/__tests__/verification.test.ts`: approval eligibility when all components are counted and none is RED, including GREEN/YELLOW | Fully counted order with no RED items approved: `200`, passed |
| RED component blocks approval                    | `verification.test.ts`: `should block approval with HTTP 422 payload logic when a component is RED`                                                | Approval with a RED component: `422`, passed                  |
| Rejection without a reason refused               | `verification.test.ts`: `should reject blank or whitespace-only rejection notes`                                                                    | Rejection without a reason refused, passed                    |
| Non-verifier receives 403 on approval            | Enforced by server-side role checks; no dedicated automated route test                                                                              | Supervisor calling the approve endpoint: `403`, passed        |
| Unapproved orders excluded from the sewing queue | `sewing.test.ts` and `src/app/api/sewing/__tests__/sewingApi.test.ts`: non-`VERIFIED` orders are not eligible for sewing                            | Sewing queue returns only `VERIFIED` orders: `200`, passed    |

### Manual API Verification (Postman)

Protected endpoints were tested manually with Postman. All results matched the expected outcomes.

| Test ID          | Request                                               | Expected | Result |
| ---------------- | ----------------------------------------------------- | -------- | ------ |
| AUTH-01          | `GET /api/supervisor/orders` without a session        | `401`    | Passed |
| AUTH-02          | `POST /api/verifier/orders/:id/approve` as supervisor | `403`    | Passed |
| ORD-01           | `POST /api/supervisor/orders` with valid data         | `201`    | Passed |
| ORD-03           | Create an order with `targetQty: 37.5`                | `400`    | Passed |
| VER-01           | Submit a decimal component count                      | `400`    | Passed |
| VER-05           | Attempt approval with a RED component                 | `422`    | Passed |
| VER-07           | Approve a fully counted order with no RED items       | `200`    | Passed |
| AUTH-05 / SEW-01 | Retrieve the sewing queue as sewing supervisor        | `200`    | Passed |
| SEW-03           | Start sewing for a verified order                     | `200`    | Passed |

## 16. Deployment

The application is deployed on Vercel and uses PostgreSQL hosted on Neon.

**Live application:** https://apparel-flow-erp-teal.vercel.app/

For a separate deployment, configure the required environment variables, apply the database migrations, seed the required demo data, and verify the role-specific workflows.

## 17. AI-Assisted Development

ChatGPT, Claude, and Antigravity were used for scaffolding, schema design, UI implementation, test structuring, and requirement review. All generated code was reviewed, tested, and corrected before deployment.

`AI_OPTIMIZATION_REPORT.md` in the repository root documents the tools and prompting approach, two AI-generated implementation bugs and one scope-control issue, the human refactoring performed, and the defensive architecture.

## 18. Known Limitations

* The original fabric roll ID is retained during re-cutting; the current workflow does not track a separate fabric roll for each re-cut.
* The automated test suite focuses on validation and workflow logic. Role-authorization and database-query scenarios were verified through manual API testing rather than dedicated automated integration tests.

## Project Deliverables

* Live deployed application
* Source code repository
* Role-based cutting, verification, and sewing workflows
* Database schema and seeded recipe data
* Automated tests and quality-check results
* `AI_OPTIMIZATION_REPORT.md` documenting identified implementation issues and improvements