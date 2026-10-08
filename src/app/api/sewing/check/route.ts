import { NextResponse } from "next/server";
import { requireAuthAndRole } from "@/lib/rbac";

/**
 * Temporary verification endpoint for testing role enforcement.
 * Must be removed before final submission or replaced by actual Sewing Queue endpoint.
 */
export async function GET() {
  const rbac = await requireAuthAndRole("sewing_supervisor");

  if (!rbac.success) {
    return rbac.errorResponse;
  }

  return NextResponse.json(
    {
      message: "Access granted to Sewing Supervisor",
      user: {
        id: rbac.user.id,
        role: rbac.user.role,
        fullName: rbac.user.fullName,
      },
    },
    { status: 200 }
  );
}
