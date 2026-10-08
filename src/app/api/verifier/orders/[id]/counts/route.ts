import { NextResponse } from "next/server";
import { requireAuthAndRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  countUpdateSchema,
  computeComponentStatus,
  hasForbiddenVerifierInputFields,
  isValidCountString,
} from "@/lib/validators/verification";

export async function PUT(
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request payload." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const forbidden = hasForbiddenVerifierInputFields(body as Record<string, unknown>);
  if (forbidden.length > 0) {
    return NextResponse.json(
      { error: `Protected verification field(s): ${forbidden.join(", ")} cannot be manually passed in count updates.` },
      { status: 400 }
    );
  }

  const parsed = countUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid count data.";
    return NextResponse.json({ error: issue }, { status: 400 });
  }

  const { counts } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Acquire row lock on cutting order
      const lockedRows = await tx.$queryRaw<
        {
          id: string;
          status: string;
        }[]
      >`
        SELECT id, status
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
          errorMessage: `Cannot update counts for order in status '${order.status}'. Must be 'PENDING_VERIFICATION'.`,
        };
      }

      // 2. Process and update each verification item
      for (const entry of counts) {
        const item = await tx.verificationItem.findUnique({
          where: {
            orderId_componentId: {
              orderId,
              componentId: entry.componentId,
            },
          },
        });

        if (!item) {
          return {
            errorStatus: 400,
            errorMessage: `Component ID '${entry.componentId}' does not belong to this order.`,
          };
        }

        let parsedActualQty: number | null = null;
        if (entry.actualQty !== null && entry.actualQty !== undefined) {
          if (!isValidCountString(entry.actualQty)) {
            return {
              errorStatus: 400,
              errorMessage: `Actual count for component must be a non-negative whole integer. Decimals like 37.5 are strictly rejected.`,
            };
          }
          parsedActualQty = typeof entry.actualQty === "number" ? entry.actualQty : parseInt(String(entry.actualQty).trim(), 10);
        }

        const computedStatus = computeComponentStatus(parsedActualQty, item.expectedQty);

        await tx.verificationItem.update({
          where: { id: item.id },
          data: {
            actualQty: parsedActualQty,
            status: computedStatus,
          },
        });
      }

      return { success: true };
    });

    if (result && "errorStatus" in result && result.errorStatus) {
      return NextResponse.json(
        { error: result.errorMessage },
        { status: result.errorStatus }
      );
    }

    const updatedItems = await prisma.verificationItem.findMany({
      where: { orderId },
      include: { component: true },
      orderBy: { component: { componentName: "asc" } },
    });

    return NextResponse.json(
      { message: "Component counts updated successfully.", verificationItems: updatedItems },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating component counts:", err);
    return NextResponse.json(
      { error: "Failed to update component counts due to database error." },
      { status: 500 }
    );
  }
}
