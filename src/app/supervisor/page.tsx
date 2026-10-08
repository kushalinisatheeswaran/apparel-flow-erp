import { requirePageRole } from "@/lib/page-access";
import { ROLE_LABELS } from "@/lib/roles";
import { SwitchRoleButton } from "@/components/SwitchRoleButton";

export const instant = false;

export default async function SupervisorDashboard() {
  const user = await requirePageRole("cutting_supervisor");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-slate-900">ApparelFlow ERP</h1>
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
            {ROLE_LABELS[user.role]} Dashboard
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-600 font-medium">
            {user.fullName} ({user.email})
          </span>
          <SwitchRoleButton />
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Cutting Supervisor Portal</h2>
          <p className="text-sm text-slate-600">
            Welcome, <span className="font-semibold text-slate-900">{user.fullName}</span>. You are authorized to access Cutting Supervisor operations.
          </p>
          <div className="pt-4 border-t border-slate-100 flex gap-4">
            <span className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded border border-slate-200">
              Active Role: cutting_supervisor
            </span>
            <span className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
              Server-Side RBAC Guard Active
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
