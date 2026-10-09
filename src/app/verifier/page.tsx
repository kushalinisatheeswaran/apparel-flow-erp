import { requirePageRole } from "@/lib/page-access";
import { SidebarNav } from "@/components/SidebarNav";
import { VerifierDashboardClient } from "./VerifierDashboardClient";

export const instant = false;

export default async function VerifierDashboard() {
  const user = await requirePageRole("cutting_verifier");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      <SidebarNav user={user} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0 space-y-6">
        <VerifierDashboardClient />
      </main>
    </div>
  );
}
