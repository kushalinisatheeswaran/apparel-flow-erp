import { NextResponse } from "next/server";
import { requireAuthAndRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rbac = await requireAuthAndRole("cutting_verifier");
  if (!rbac.success) {
    return rbac.errorResponse;
  }

  try {
    const orders = await prisma.cuttingOrder.findMany({
      where: {
        status: "PENDING_VERIFICATION",
      },
      include: {
        recipe: {
          include: {
            components: {
              orderBy: { componentName: "asc" },
            },
          },
        },
        verificationItems: {
          include: {
            component: true,
          },
          orderBy: {
            component: { componentName: "asc" },
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        verificationLogs: {
          orderBy: { timestamp: "desc" },
          include: {
            verifier: {
              select: { fullName: true, email: true },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "asc",
      },
    });

    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.error("Error fetching pending verification orders:", err);
    return NextResponse.json(
      { error: "Failed to fetch pending verification orders." },
      { status: 500 }
    );
  }
}
