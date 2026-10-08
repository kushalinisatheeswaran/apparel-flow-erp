import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/roles";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export type RbacResult =
  | { success: true; user: AuthenticatedUser }
  | { success: false; errorResponse: NextResponse };

export async function requireAuthAndRole(
  allowedRoles: UserRole | UserRole[]
): Promise<RbacResult> {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return {
      success: false,
      errorResponse: NextResponse.json(
        { error: "Unauthorized access. Please log in." },
        { status: 401 }
      ),
    };
  }

  const expectedRoles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
    },
  });

  if (!dbUser) {
    return {
      success: false,
      errorResponse: NextResponse.json(
        { error: "Unauthorized access. User record not found." },
        { status: 401 }
      ),
    };
  }

  const currentRole = dbUser.role as UserRole;

  if (!expectedRoles.includes(currentRole)) {
    return {
      success: false,
      errorResponse: NextResponse.json(
        { error: "Forbidden access. Insufficient role permissions." },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      role: currentRole,
      fullName: dbUser.fullName,
    },
  };
}
