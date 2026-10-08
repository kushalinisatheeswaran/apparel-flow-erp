import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireAuthAndRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  hasForbiddenVerifierFields,
  updateOrderSchema,
  validateFabricUsage,
} from "@/lib/validators/order";

export async function PUT(
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request payload." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const forbidden = hasForbiddenVerifierFields(body as Record<string, unknown>);
  if (forbidden.length > 0) {
    return NextResponse.json(
      {
        error: `Attempting to submit verifier-controlled field(s): ${forbidden.join(
          ", "
        )} is strictly prohibited for supervisors.`,
      },
      { status: 400 }
    );
  }

  const parsed = updateOrderSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid update data.";
    return NextResponse.json({ error: issue }, { status: 400 });
  }

  const { recipeId, targetQty, fabricRollId, actualFabricYds } = parsed.data;

  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Acquire FOR UPDATE row lock and verify ownership
      const lockedRows = await tx.$queryRaw<
        {
          id: string;
          created_by: string;
          status: string;
          first_submitted_at: Date | null;
          actual_fabric_yds: Prisma.Decimal;
          recipe_id: string;
          target_qty: number;
          fabric_roll_id: string;
        }[]
      >`
        SELECT id, created_by, status, first_submitted_at, actual_fabric_yds, recipe_id, target_qty, fabric_roll_id
        FROM cutting_orders
        WHERE id = ${orderId} AND created_by = ${rbac.user.id}
        FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return { errorStatus: 404, errorMessage: "Cutting order not found." };
      }

      const order = lockedRows[0];

      // Must be in CUTTING_IN_PROGRESS to edit
      if (order.status !== "CUTTING_IN_PROGRESS") {
        if (order.status === "REJECTED") {
          return {
            errorStatus: 409,
            errorMessage:
              "Rejected orders must transition to 'Begin Correction' before updating.",
          };
        }
        return {
          errorStatus: 409,
          errorMessage: `Cannot edit order in '${order.status}' status.`,
        };
      }

      const isPreviouslySubmitted = order.first_submitted_at !== null;

      if (isPreviouslySubmitted) {
        // Enforce immutability of recipeId, targetQty, fabricRollId
        if (recipeId && recipeId !== order.recipe_id) {
          return {
            errorStatus: 409,
            errorMessage: "Recipe cannot be modified after first submission.",
          };
        }
        if (targetQty && targetQty !== order.target_qty) {
          return {
            errorStatus: 409,
            errorMessage: "Target quantity cannot be modified after first submission.",
          };
        }
        if (fabricRollId && fabricRollId !== order.fabric_roll_id) {
          return {
            errorStatus: 409,
            errorMessage: "Fabric roll ID cannot be modified after first submission.",
          };
        }

        // If actualFabricYds is provided, validate cumulative usage >= existing
        if (actualFabricYds !== undefined) {
          const newActualNum = parseFloat(actualFabricYds.trim());
          const existingActualNum = Number(order.actual_fabric_yds);

          if (isNaN(newActualNum) || newActualNum < existingActualNum) {
            return {
              errorStatus: 400,
              errorMessage: `Cumulative fabric usage cannot decrease. Must be >= ${existingActualNum} yards.`,
            };
          }

          // Fetch recipe for stdFabricYards ratio check
          const activeRecipe = await tx.recipe.findUnique({
            where: { id: order.recipe_id },
          });
          const expectedFabricYdsNum =
            order.target_qty * Number(activeRecipe?.stdFabricYards || 0);

          const check = validateFabricUsage(actualFabricYds, expectedFabricYdsNum);
          if (!check.valid) {
            return { errorStatus: 400, errorMessage: check.error };
          }

          return await tx.cuttingOrder.update({
            where: { id: orderId },
            data: {
              actualFabricYds: new Prisma.Decimal(actualFabricYds.trim()),
            },
          });
        }

        return await tx.cuttingOrder.findUnique({ where: { id: orderId } });
      } else {
        // Draft edit (firstSubmittedAt === null)
        const finalRecipeId = recipeId ?? order.recipe_id;
        const finalTargetQty = targetQty ?? order.target_qty;
        const finalFabricRollId = fabricRollId ?? order.fabric_roll_id;
        const finalActualYdsStr = actualFabricYds ?? String(order.actual_fabric_yds);

        const targetRecipe = await tx.recipe.findUnique({
          where: { id: finalRecipeId },
          include: { components: true },
        });

        if (!targetRecipe) {
          return { errorStatus: 400, errorMessage: "Selected recipe does not exist." };
        }

        const expectedFabricYdsNum = finalTargetQty * Number(targetRecipe.stdFabricYards);
        const check = validateFabricUsage(finalActualYdsStr, expectedFabricYdsNum);
        if (!check.valid) {
          return { errorStatus: 400, errorMessage: check.error };
        }

        const updated = await tx.cuttingOrder.update({
          where: { id: orderId },
          data: {
            recipeId: finalRecipeId,
            targetQty: finalTargetQty,
            fabricRollId: finalFabricRollId,
            actualFabricYds: new Prisma.Decimal(finalActualYdsStr.trim()),
          },
        });

        // Re-sync verification items if recipe or targetQty changed
        if (recipeId !== undefined || targetQty !== undefined) {
          await tx.verificationItem.deleteMany({
            where: { orderId: orderId },
          });

          if (targetRecipe.components.length > 0) {
            await tx.verificationItem.createMany({
              data: targetRecipe.components.map((c) => ({
                orderId: orderId,
                componentId: c.id,
                expectedQty: finalTargetQty * c.piecesPerGarment,
                actualQty: null,
                status: null,
              })),
            });
          }
        }

        return updated;
      }
    });

    if (updatedOrder && typeof updatedOrder === "object" && "errorStatus" in updatedOrder && updatedOrder.errorStatus) {
      return NextResponse.json(
        { error: (updatedOrder as { errorMessage: string }).errorMessage },
        { status: (updatedOrder as { errorStatus: number }).errorStatus }
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
    console.error("Error updating cutting order:", err);
    return NextResponse.json(
      { error: "Failed to update cutting order due to database error." },
      { status: 500 }
    );
  }
}
