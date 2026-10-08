import { requirePageRole } from "@/lib/page-access";
import { ROLE_LABELS } from "@/lib/roles";
import { SwitchRoleButton } from "@/components/SwitchRoleButton";
import { VerifierDashboardClient } from "./VerifierDashboardClient";

export const instant = false;

export default async function VerifierDashboard() {
  const user = await requirePageRole("cutting_verifier");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-slate-900">ApparelFlow ERP</h1>
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">
            {ROLE_LABELS[user.role]} Terminal
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-600 font-medium">
            {user.fullName} ({user.email})
          </span>
          <SwitchRoleButton />
        </div>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        <VerifierDashboardClient />
      </main>
    </div>
  );
}
