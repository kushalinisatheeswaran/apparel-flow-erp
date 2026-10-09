import { NextResponse } from "next/server";
import { requireAuthAndRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { hasForbiddenSewingStartFields } from "@/lib/validators/sewing";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rbac = await requireAuthAndRole("sewing_supervisor");
  if (!rbac.success) {
    return rbac.errorResponse;
  }

  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Order ID parameter is missing." }, { status: 400 });
  }

  // Strictly validate request body for forbidden client-controlled fields
  let body: Record<string, unknown> | null = null;
  try {
    const text = await req.text();
    if (text && text.trim().length > 0) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (body && typeof body === "object") {
    const forbidden = hasForbiddenSewingStartFields(body);
    if (forbidden.length > 0) {
      return NextResponse.json(
        {
          error: `Forbidden field(s) in request payload: ${forbidden.join(", ")}. Sewing start operation rejects client-supplied status, timestamps, or audit fields.`,
        },
        { status: 400 }
      );
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Acquire row lock on cutting order
      const lockedRows = await tx.$queryRaw<
        {
          id: string;
          status: string;
          sewing_started_at: Date | null;
        }[]
      >`
        SELECT id, status, sewing_started_at
        FROM cutting_orders
        WHERE id = ${orderId}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return { errorStatus: 404, errorMessage: "Cutting order not found." };
      }

      const order = lockedRows[0];
      if (order.status !== "VERIFIED") {
        return {
          errorStatus: 409,
          errorMessage: `Cannot start sewing for order in status '${order.status}'. Status must be 'VERIFIED'.`,
        };
      }

      if (order.sewing_started_at !== null) {
        return {
          errorStatus: 409,
          errorMessage: "Sewing assembly has already been started for this order.",
        };
      }

      const now = new Date();
      const updatedOrder = await tx.cuttingOrder.update({
        where: { id: orderId },
        data: {
          sewingStartedAt: now,
        },
      });

      return { success: true, order: updatedOrder };
    });

    if (result && "errorStatus" in result && result.errorStatus) {
      return NextResponse.json(
        { error: result.errorMessage },
        { status: result.errorStatus }
      );
    }

    // Fetch full updated order with details for client response
    const fullOrder = await prisma.cuttingOrder.findUnique({
      where: { id: orderId },
      include: {
        recipe: { include: { components: true } },
        verificationItems: { include: { component: true } },
        verificationLogs: {
          where: { decision: "APPROVED" },
          orderBy: { timestamp: "desc" },
          take: 1,
          include: { verifier: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Sewing assembly started successfully.",
        order: fullOrder,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error starting sewing assembly:", err);
    return NextResponse.json(
      { error: "Failed to start sewing assembly due to database error." },
      { status: 500 }
    );
  }
}
