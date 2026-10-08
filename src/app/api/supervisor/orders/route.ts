import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { requireAuthAndRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  createOrderSchema,
  hasForbiddenVerifierFields,
  validateFabricUsage,
} from "@/lib/validators/order";

export async function GET() {
  const rbac = await requireAuthAndRole("cutting_supervisor");
  if (!rbac.success) {
    return rbac.errorResponse;
  }

  try {
    const orders = await prisma.cuttingOrder.findMany({
      where: {
        createdBy: rbac.user.id,
        status: {
          in: ["CUTTING_IN_PROGRESS", "PENDING_VERIFICATION", "REJECTED"],
        },
      },
      include: {
        recipe: {
          include: {
            components: true,
          },
        },
        verificationItems: {
          include: {
            component: true,
          },
        },
        verificationLogs: {
          orderBy: {
            timestamp: "desc",
          },
          include: {
            verifier: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.error("Error fetching supervisor orders:", err);
    return NextResponse.json(
      { error: "Failed to fetch cutting orders." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const rbac = await requireAuthAndRole("cutting_supervisor");
  if (!rbac.success) {
    return rbac.errorResponse;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request payload." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
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

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Invalid input data.";
    return NextResponse.json({ error: issue }, { status: 400 });
  }

  const { recipeId, targetQty, fabricRollId, actualFabricYds } = parsed.data;

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { components: true },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Selected recipe does not exist." }, { status: 400 });
  }

  const expectedFabricYdsNum = targetQty * Number(recipe.stdFabricYards);
  const fabricCheck = validateFabricUsage(actualFabricYds, expectedFabricYdsNum);
  if (!fabricCheck.valid) {
    return NextResponse.json({ error: fabricCheck.error }, { status: 400 });
  }

  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 1. Atomically reserve PostgreSQL sequence value
      const rawRes = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('cutting_orders_order_sequence_seq') as nextval
      `;

      if (!rawRes || rawRes.length === 0 || rawRes[0]?.nextval === undefined) {
        throw new Error("Failed to generate order sequence value.");
      }

      const seqNumber = Number(rawRes[0].nextval);
      const orderNo = `ORD-${String(seqNumber).padStart(6, "0")}`;

      // 2. Create CuttingOrder
      const newOrder = await tx.cuttingOrder.create({
        data: {
          orderSequence: seqNumber,
          orderNo,
          recipeId,
          targetQty,
          fabricRollId,
          actualFabricYds: new Prisma.Decimal(actualFabricYds.trim()),
          status: "CUTTING_IN_PROGRESS",
          createdBy: rbac.user.id,
        },
      });

      // 3. Create VerificationItems (one per recipe component)
      if (recipe.components.length > 0) {
        await tx.verificationItem.createMany({
          data: recipe.components.map((c) => ({
            orderId: newOrder.id,
            componentId: c.id,
            expectedQty: targetQty * c.piecesPerGarment,
            actualQty: null,
            status: null,
          })),
        });
      }

      return newOrder;
    });

    const fullOrder = await prisma.cuttingOrder.findUnique({
      where: { id: createdOrder.id },
      include: {
        recipe: {
          include: { components: true },
        },
        verificationItems: {
          include: { component: true },
        },
      },
    });

    return NextResponse.json(fullOrder, { status: 201 });
  } catch (err) {
    console.error("Transaction error creating cutting order:", err);
    return NextResponse.json(
      { error: "Failed to create cutting order due to database error." },
      { status: 500 }
    );
  }
}
