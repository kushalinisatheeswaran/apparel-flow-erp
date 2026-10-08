import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, getDashboardForRole } from "@/lib/roles";

export interface DashboardUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export async function requirePageRole(allowedRole: UserRole): Promise<DashboardUser> {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    redirect("/login");
  }

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
    redirect("/login");
  }

  const currentRole = dbUser.role as UserRole;

  if (currentRole !== allowedRole) {
    const targetDashboard = getDashboardForRole(currentRole);
    redirect(targetDashboard);
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: currentRole,
    fullName: dbUser.fullName,
  };
}
