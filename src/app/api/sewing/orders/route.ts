import { NextResponse } from "next/server";
import { requireAuthAndRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rbac = await requireAuthAndRole("sewing_supervisor");
  if (!rbac.success) {
    return rbac.errorResponse;
  }

  try {
    const orders = await prisma.cuttingOrder.findMany({
      where: {
        status: "VERIFIED",
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
          where: {
            decision: "APPROVED",
          },
          orderBy: { timestamp: "desc" },
          take: 1,
          include: {
            verifier: {
              select: { id: true, fullName: true, email: true },
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
    console.error("Error fetching verified sewing queue orders:", err);
    return NextResponse.json(
      { error: "Failed to fetch verified sewing queue orders." },
      { status: 500 }
    );
  }
}
