import { requirePageRole } from "@/lib/page-access";
import { ROLE_LABELS } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { SwitchRoleButton } from "@/components/SwitchRoleButton";
import { SupervisorDashboardClient } from "./SupervisorDashboardClient";

export const instant = false;

export default async function SupervisorDashboard() {
  const user = await requirePageRole("cutting_supervisor");

  const recipes = await prisma.recipe.findMany({
    include: {
      components: {
        orderBy: { componentName: "asc" },
      },
    },
    orderBy: { recipeCode: "asc" },
  });

  const formattedRecipes = recipes.map((r) => ({
    id: r.id,
    recipeCode: r.recipeCode,
    name: r.name,
    category: r.category,
    stdFabricYards: Number(r.stdFabricYards),
    wastageCap: Number(r.wastageCap),
    components: r.components.map((c) => ({
      id: c.id,
      componentName: c.componentName,
      piecesPerGarment: c.piecesPerGarment,
    })),
  }));

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

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        <SupervisorDashboardClient initialRecipes={formattedRecipes} />
      </main>
    </div>
  );
}
