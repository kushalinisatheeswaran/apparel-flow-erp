import { NextResponse } from "next/server";
import { requireAuthAndRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rbac = await requireAuthAndRole("cutting_supervisor");
  if (!rbac.success) {
    return rbac.errorResponse;
  }

  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Order ID parameter is missing." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock row and verify ownership
      const lockedRows = await tx.$queryRaw<
        {
          id: string;
          created_by: string;
          status: string;
          first_submitted_at: Date | null;
        }[]
      >`
        SELECT id, created_by, status, first_submitted_at
        FROM cutting_orders
        WHERE id = ${orderId} AND created_by = ${rbac.user.id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return { errorStatus: 404, errorMessage: "Cutting order not found." };
      }

      const order = lockedRows[0];

      if (order.status !== "CUTTING_IN_PROGRESS") {
        if (order.status === "REJECTED") {
          return {
            errorStatus: 409,
            errorMessage:
              "Rejected orders must transition to 'Begin Correction' before submission.",
          };
        }
        return {
          errorStatus: 409,
          errorMessage: `Cannot submit order with status '${order.status}' for verification.`,
        };
      }

      // 2. Set status to PENDING_VERIFICATION and update firstSubmittedAt if null
      const updatedOrder = await tx.cuttingOrder.update({
        where: { id: orderId },
        data: {
          status: "PENDING_VERIFICATION",
          firstSubmittedAt: order.first_submitted_at ?? new Date(),
        },
      });

      // 3. Reset VerificationItem counts and status for fresh QC cycle
      await tx.verificationItem.updateMany({
        where: { orderId: orderId },
        data: {
          actualQty: null,
          status: null,
        },
      });

      return updatedOrder;
    });

    if (result && typeof result === "object" && "errorStatus" in result && result.errorStatus) {
      return NextResponse.json(
        { error: (result as { errorMessage: string }).errorMessage },
        { status: (result as { errorStatus: number }).errorStatus }
      );
    }

    const fullOrder = await prisma.cuttingOrder.findUnique({
      where: { id: orderId },
      include: {
        recipe: { include: { components: true } },
        verificationItems: { include: { component: true } },
      },
    });

    return NextResponse.json(fullOrder, { status: 200 });
  } catch (err) {
    console.error("Error submitting cutting order:", err);
    return NextResponse.json(
      { error: "Failed to submit order for verification due to database error." },
      { status: 500 }
    );
  }
}
