import { NextResponse } from "next/server";
import { requireAuthAndRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rbac = await requireAuthAndRole("cutting_supervisor");
  if (!rbac.success) {
    return rbac.errorResponse;
  }

  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        components: {
          orderBy: { componentName: "asc" },
        },
      },
      orderBy: { recipeCode: "asc" },
    });

    return NextResponse.json(recipes, { status: 200 });
  } catch (err) {
    console.error("Error fetching recipes:", err);
    return NextResponse.json(
      { error: "Failed to retrieve recipes from database." },
      { status: 500 }
    );
  }
}
