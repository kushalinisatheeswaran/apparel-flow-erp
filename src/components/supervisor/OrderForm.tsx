"use client";

import { useState } from "react";

export interface RecipeComponentData {
  id: string;
  componentName: string;
  piecesPerGarment: number;
}

export interface RecipeData {
  id: string;
  recipeCode: string;
  name: string;
  category: string;
  stdFabricYards: string | number;
  wastageCap: string | number;
  components: RecipeComponentData[];
}

interface OrderFormProps {
  recipes: RecipeData[];
  onOrderCreated: () => void;
}

export function OrderForm({ recipes, onOrderCreated }: OrderFormProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [targetQty, setTargetQty] = useState<string>("");
  const [fabricRollId, setFabricRollId] = useState("");
  const [actualFabricYds, setActualFabricYds] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);
  const isWholeInteger = /^\d+$/.test(targetQty.trim());
  const parsedTargetQty = isWholeInteger ? parseInt(targetQty.trim(), 10) : NaN;
  const isValidTargetQty = !isNaN(parsedTargetQty) && parsedTargetQty > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedRecipeId) {
      setError("Please select a garment recipe.");
      return;
    }

    if (!isWholeInteger || !isValidTargetQty) {
      setError("Target quantity must be a whole number.");
      return;
    }

    if (!fabricRollId.trim()) {
      setError("Fabric roll ID cannot be empty.");
      return;
    }

    if (!actualFabricYds.trim()) {
      setError("Actual fabric usage is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/supervisor/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: selectedRecipeId,
          targetQty: parsedTargetQty,
          fabricRollId: fabricRollId.trim(),
          actualFabricYds: actualFabricYds.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create cutting order.");
        setIsSubmitting(false);
        return;
      }

      setSuccess(`Cutting Order ${data.orderNo} created successfully as Draft!`);
      setSelectedRecipeId("");
      setTargetQty("");
      setFabricRollId("");
      setActualFabricYds("");
      setIsSubmitting(false);
      onOrderCreated();
    } catch {
      setError("An unexpected network error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="p-6 rounded-xl border shadow-sm space-y-5"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0F172A" }}
    >
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "#CBD5E1" }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#0F172A" }}>
            Create Cutting Order
          </h2>
          <p className="text-xs" style={{ color: "#475569" }}>
            Enter batch parameters to create a new cutting order draft
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Draft Workflow
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 text-sm rounded-md border font-medium"
          style={{ backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", color: "#B91C1C" }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="p-3 text-sm rounded-md border font-medium text-emerald-800 bg-emerald-50 border-emerald-300"
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Recipe Selection */}
        <div>
          <label htmlFor="recipeSelect" className="block text-sm font-semibold mb-1" style={{ color: "#0F172A" }}>
            Garment Recipe *
          </label>
          <select
            id="recipeSelect"
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            style={{ backgroundColor: "#FFFFFF", color: "#0F172A", borderColor: "#CBD5E1" }}
          >
            <option value="" className="bg-white text-slate-900">
              -- Select Garment Recipe --
            </option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id} className="bg-white text-slate-900 font-medium">
                {r.recipeCode} — {r.name} ({r.category})
              </option>
            ))}
          </select>
        </div>

        {/* Selected Recipe Metadata */}
        {selectedRecipe && (
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between font-medium text-slate-700">
              <span>Standard Fabric / Unit: <strong className="text-slate-900">{Number(selectedRecipe.stdFabricYards)} yds</strong></span>
              <span>Wastage Cap: <strong className="text-slate-900">{Number(selectedRecipe.wastageCap)}%</strong></span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Target Quantity */}
          <div>
            <label htmlFor="targetQty" className="block text-sm font-semibold mb-1" style={{ color: "#0F172A" }}>
              Target Batch Qty *
            </label>
            <input
              id="targetQty"
              type="number"
              min="1"
              max="100000"
              value={targetQty}
              onChange={(e) => setTargetQty(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600"
              style={{ backgroundColor: "#FFFFFF", color: "#0F172A", borderColor: "#CBD5E1" }}
            />
          </div>

          {/* Fabric Roll ID */}
          <div>
            <label htmlFor="fabricRollId" className="block text-sm font-semibold mb-1" style={{ color: "#0F172A" }}>
              Fabric Roll ID *
            </label>
            <input
              id="fabricRollId"
              type="text"
              value={fabricRollId}
              onChange={(e) => setFabricRollId(e.target.value)}
              placeholder="e.g. ROLL-2026-08A"
              className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600"
              style={{ backgroundColor: "#FFFFFF", color: "#0F172A", borderColor: "#CBD5E1" }}
            />
          </div>

          {/* Actual Fabric Used */}
          <div>
            <label htmlFor="actualFabricYds" className="block text-sm font-semibold mb-1" style={{ color: "#0F172A" }}>
              Actual Fabric Used (Yards) *
            </label>
            <input
              id="actualFabricYds"
              type="text"
              value={actualFabricYds}
              onChange={(e) => setActualFabricYds(e.target.value)}
              placeholder="e.g. 185.50"
              className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600"
              style={{ backgroundColor: "#FFFFFF", color: "#0F172A", borderColor: "#CBD5E1" }}
            />
          </div>
        </div>

        {/* Live Expected Component Quantity Calculator */}
        {selectedRecipe && isValidTargetQty && (
          <div className="p-3.5 rounded-lg border bg-blue-50/50 border-blue-200 space-y-2">
            <div className="text-xs font-bold text-blue-900 uppercase tracking-wide">
              Live Expected Component Preview ({parsedTargetQty} garments)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {selectedRecipe.components.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded bg-white border border-blue-100 font-medium text-slate-800"
                >
                  <span>{c.componentName} ({c.piecesPerGarment}/garment):</span>
                  <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {parsedTargetQty * c.piecesPerGarment} pcs
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto py-2.5 px-6 font-semibold text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50"
          style={{ backgroundColor: isSubmitting ? "#1D4ED8" : "#2563EB" }}
        >
          {isSubmitting ? "Creating Order..." : "Create Cutting Order"}
        </button>
      </form>
    </div>
  );
}
