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
        }[]
      >`
        SELECT id, created_by, status
        FROM cutting_orders
        WHERE id = ${orderId} AND created_by = ${rbac.user.id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return { errorStatus: 404, errorMessage: "Cutting order not found." };
      }

      const order = lockedRows[0];

      if (order.status !== "REJECTED") {
        return {
          errorStatus: 409,
          errorMessage: `Only REJECTED orders can begin correction. Current status is '${order.status}'.`,
        };
      }

      // Atomically transition status to CUTTING_IN_PROGRESS
      // Preserve recipe, targetQty, fabricRollId, firstSubmittedAt, and VerificationItem counts for reference
      const updated = await tx.cuttingOrder.update({
        where: { id: orderId },
        data: {
          status: "CUTTING_IN_PROGRESS",
        },
      });

      return updated;
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
    console.error("Error beginning order correction:", err);
    return NextResponse.json(
      { error: "Failed to begin order correction due to database error." },
      { status: 500 }
    );
  }
}
