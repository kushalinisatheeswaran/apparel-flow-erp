import { requirePageRole } from "@/lib/page-access";
import { prisma } from "@/lib/prisma";
import { SidebarNav } from "@/components/SidebarNav";
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      <SidebarNav user={user} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0 space-y-6">
        <SupervisorDashboardClient initialRecipes={formattedRecipes} />
      </main>
    </div>
  );
}
