
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const demoPassword = process.env.SEED_DEMO_PASSWORD;

if (!connectionString) {
    throw new Error("DATABASE_URL is missing from .env");
}

if (!demoPassword || demoPassword.length < 12) {
    throw new Error(
        "SEED_DEMO_PASSWORD must contain at least 12 characters"
    );
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ==========================================
// DEMO USERS
// ==========================================

const demoUsers = [
    {
        email: "supervisor@apparelflow.demo",
        fullName: "Cutting Supervisor",
        role: "cutting_supervisor" as const,
    },
    {
        email: "verifier@apparelflow.demo",
        fullName: "Cutting Verifier",
        role: "cutting_verifier" as const,
    },
    {
        email: "sewing@apparelflow.demo",
        fullName: "Sewing Supervisor",
        role: "sewing_supervisor" as const,
    },
];

// ==========================================
// PRODUCTION RECIPES
// ==========================================

const recipes = [
    {
        recipeCode: "REC-BL01",
        name: "Casual Blouse",
        category: "Blouse",
        stdFabricYards: "1.80",
        wastageCap: "5.00",
        components: [
            {
                componentName: "Front Body Panel",
                piecesPerGarment: 1,
            },
            {
                componentName: "Back Body Panel",
                piecesPerGarment: 1,
            },
            {
                componentName: "Sleeves (Left & Right)",
                piecesPerGarment: 2,
            },
            {
                componentName: "Collar & Stand",
                piecesPerGarment: 1,
            },
            {
                componentName: "Sleeve Cuffs",
                piecesPerGarment: 2,
            },
        ],
    },
    {
        recipeCode: "REC-CT02",
        name: "Crop Top",
        category: "Crop Top",
        stdFabricYards: "1.10",
        wastageCap: "8.00",
        components: [
            {
                componentName: "Front Chest Panel",
                piecesPerGarment: 1,
            },
            {
                componentName: "Back Support Panel",
                piecesPerGarment: 1,
            },
            {
                componentName: "Neck Binding Strip",
                piecesPerGarment: 1,
            },
            {
                componentName: "Hem Elastic Casing",
                piecesPerGarment: 1,
            },
            {
                componentName: "Side Strap Accents",
                piecesPerGarment: 2,
            },
        ],
    },
];

// ==========================================
// SEED EXECUTION
// ==========================================

async function main() {
    console.log("Starting ApparelFlow ERP database seed...");

    // Hash the demo password once.
    const passwordHash = await bcrypt.hash(demoPassword!, 12);

    // --------------------------------------
    // 1. Seed Users
    // --------------------------------------

    for (const user of demoUsers) {
        await prisma.user.upsert({
            where: {
                email: user.email,
            },
            update: {},
            create: {
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                passwordHash,
            },
        });

        console.log(`Demo user ready: ${user.email}`);
    }

    // --------------------------------------
    // 2. Seed Recipes and Components
    // --------------------------------------

    for (const recipeData of recipes) {
        const recipe = await prisma.recipe.upsert({
            where: {
                recipeCode: recipeData.recipeCode,
            },
            update: {},
            create: {
                recipeCode: recipeData.recipeCode,
                name: recipeData.name,
                category: recipeData.category,
                stdFabricYards: recipeData.stdFabricYards,
                wastageCap: recipeData.wastageCap,
            },
        });

        console.log(`Recipe ready: ${recipe.name}`);

        for (const componentData of recipeData.components) {
            await prisma.recipeComponent.upsert({
                where: {
                    recipeId_componentName: {
                        recipeId: recipe.id,
                        componentName: componentData.componentName,
                    },
                },
                update: {},
                create: {
                    recipeId: recipe.id,
                    componentName: componentData.componentName,
                    piecesPerGarment: componentData.piecesPerGarment,
                },
            });

            console.log(
                `  Component ready: ${componentData.componentName}`
            );
        }
    }

    // --------------------------------------
    // 3. Verify Seed Counts
    // --------------------------------------

    const userCount = await prisma.user.count({
        where: {
            email: {
                in: demoUsers.map((user) => user.email),
            },
        },
    });

    const recipeCount = await prisma.recipe.count({
        where: {
            recipeCode: {
                in: recipes.map((recipe) => recipe.recipeCode),
            },
        },
    });

    const componentCount = await prisma.recipeComponent.count({
        where: {
            recipe: {
                recipeCode: {
                    in: recipes.map((recipe) => recipe.recipeCode),
                },
            },
        },
    });

    console.log("\n--- Seed Summary ---");
    console.log(`Demo users: ${userCount}/3`);
    console.log(`Recipes: ${recipeCount}/2`);
    console.log(`Recipe components: ${componentCount}/10`);

    if (
        userCount !== 3 ||
        recipeCount !== 2 ||
        componentCount !== 10
    ) {
        throw new Error("Seed verification failed");
    }

    console.log("\nDatabase seeding completed successfully!");
}

// ==========================================
// CLEANUP
// ==========================================

main()
    .catch((error) => {
        console.error("Database seeding failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
