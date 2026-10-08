import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireAuthAndRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  calculateWastage,
  validateCompleteInspection,
  VerificationItemCheck,
} from "@/lib/validators/verification";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rbac = await requireAuthAndRole("cutting_verifier");
  if (!rbac.success) {
    return rbac.errorResponse;
  }

  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Order ID parameter is missing." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Acquire row lock on cutting order
      const lockedRows = await tx.$queryRaw<
        {
          id: string;
          status: string;
          target_qty: number;
          actual_fabric_yds: Prisma.Decimal;
          recipe_id: string;
        }[]
      >`
        SELECT id, status, target_qty, actual_fabric_yds, recipe_id
        FROM cutting_orders
        WHERE id = ${orderId}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return { errorStatus: 404, errorMessage: "Cutting order not found." };
      }

      const order = lockedRows[0];
      if (order.status !== "PENDING_VERIFICATION") {
        return {
          errorStatus: 409,
          errorMessage: `Cannot approve order in status '${order.status}'. Must be 'PENDING_VERIFICATION'.`,
        };
      }

      // 2. Fetch recipe and current verification items directly from DB
      const recipe = await tx.recipe.findUnique({
        where: { id: order.recipe_id },
        include: { components: true },
      });

      if (!recipe) {
        return { errorStatus: 400, errorMessage: "Recipe not found." };
      }

      const vItems = await tx.verificationItem.findMany({
        where: { orderId },
        include: { component: true },
      });

      // 3. Complete Inspection Hard Stop Validation for Approval
      const itemChecks: VerificationItemCheck[] = vItems.map((item) => ({
        componentId: item.componentId,
        componentName: item.component.componentName,
        expectedQty: item.expectedQty,
        actualQty: item.actualQty,
        status: item.status,
      }));

      const checkResult = validateCompleteInspection(
        itemChecks,
        recipe.components.length,
        "approve"
      );

      if (!checkResult.canProceed) {
        return {
          errorStatus: 422,
          errorMessage: checkResult.error,
        };
      }

      // 4. Calculate fabric wastage snapshot
      const expectedFabricYdsNum = order.target_qty * Number(recipe.stdFabricYards);
      const wastagePctVal = calculateWastage(order.actual_fabric_yds.toString(), expectedFabricYdsNum);

      // 5. Construct count snapshot
      const countSnapshot = itemChecks.map((item) => ({
        componentId: item.componentId,
        componentName: item.componentName,
        expectedQty: item.expectedQty,
        actualQty: item.actualQty,
        variance: item.actualQty !== null ? item.actualQty - item.expectedQty : 0,
        status: item.status,
      }));

      // 6. Update order status to VERIFIED
      const updatedOrder = await tx.cuttingOrder.update({
        where: { id: orderId },
        data: {
          status: "VERIFIED",
        },
      });

      // 7. Create immutable VerificationLog
      const auditLog = await tx.verificationLog.create({
        data: {
          orderId: orderId,
          verifierId: rbac.user.id,
          decision: "APPROVED",
          rejectionNote: null,
          wastagePct: new Prisma.Decimal(wastagePctVal),
          fabricUsedSnapshot: order.actual_fabric_yds,
          expectedFabricSnapshot: new Prisma.Decimal(expectedFabricYdsNum),
          countSnapshot: countSnapshot as unknown as Prisma.InputJsonValue,
        },
      });

      return { success: true, order: updatedOrder, auditLog };
    });

    if (result && "errorStatus" in result && result.errorStatus) {
      return NextResponse.json(
        { error: result.errorMessage },
        { status: result.errorStatus }
      );
    }

    const fullOrder = await prisma.cuttingOrder.findUnique({
      where: { id: orderId },
      include: {
        recipe: { include: { components: true } },
        verificationItems: { include: { component: true } },
        verificationLogs: {
          orderBy: { timestamp: "desc" },
          include: { verifier: { select: { fullName: true, email: true } } },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Batch approved successfully for Sewing Queue.",
        order: fullOrder,
        auditLog: result.auditLog,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error approving batch:", err);
    return NextResponse.json(
      { error: "Failed to approve batch due to database error." },
      { status: 500 }
    );
  }
}
