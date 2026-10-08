import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDashboardForRole, UserRole } from "@/lib/roles";

export const instant = false;

export default async function HomePage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = session.user.role as UserRole;
  const targetDashboard = getDashboardForRole(userRole);

  redirect(targetDashboard);
}
