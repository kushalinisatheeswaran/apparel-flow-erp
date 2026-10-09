"use client";

import { useState } from "react";
import Image from "next/image";
import { getComponentImageUrl } from "@/lib/componentImages";

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
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Create Cutting Order
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Enter batch parameters to create a new cutting order draft for inspection
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Draft Creation Workflow
        </span>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 text-xs rounded-lg border font-semibold flex items-center gap-2 bg-rose-50 border-rose-200 text-rose-800"
        >
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="p-3.5 text-xs rounded-lg border font-semibold flex items-center gap-2 bg-emerald-50 border-emerald-200 text-emerald-800"
        >
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Recipe Selection */}
        <div>
          <label htmlFor="recipeSelect" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Garment Recipe *
          </label>
          <select
            id="recipeSelect"
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium transition-shadow"
          >
            <option value="" className="bg-white text-slate-900">
              -- Select Production Garment Recipe --
            </option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id} className="bg-white text-slate-900">
                {r.recipeCode} — {r.name} ({r.category})
              </option>
            ))}
          </select>
        </div>

        {/* Selected Recipe Metadata */}
        {selectedRecipe && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-slate-700">
              <span>Standard Fabric Ratio: <strong className="text-slate-900 font-mono">{Number(selectedRecipe.stdFabricYards).toFixed(2)} yds / unit</strong></span>
              <span>Wastage Cap Threshold: <strong className="text-slate-900 font-mono">{Number(selectedRecipe.wastageCap).toFixed(2)}%</strong></span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Target Quantity */}
          <div>
            <label htmlFor="targetQty" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono transition-shadow"
            />
          </div>

          {/* Fabric Roll ID */}
          <div>
            <label htmlFor="fabricRollId" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Fabric Roll ID *
            </label>
            <input
              id="fabricRollId"
              type="text"
              value={fabricRollId}
              onChange={(e) => setFabricRollId(e.target.value)}
              placeholder="e.g. ROLL-2026-08A"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono transition-shadow"
            />
          </div>

          {/* Actual Fabric Used */}
          <div>
            <label htmlFor="actualFabricYds" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Actual Fabric Used (Yards) *
            </label>
            <input
              id="actualFabricYds"
              type="text"
              value={actualFabricYds}
              onChange={(e) => setActualFabricYds(e.target.value)}
              placeholder="e.g. 185.50"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono transition-shadow"
            />
          </div>
        </div>

        {/* Live Expected Component Quantity Calculator */}
        {selectedRecipe && isValidTargetQty && (
          <div className="p-4 rounded-xl border bg-blue-50/50 border-blue-200 space-y-3">
            <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center justify-between">
              <span>Expected Component Breakdown</span>
              <span className="font-mono text-blue-700">{parsedTargetQty} garments</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {selectedRecipe.components.map((c) => {
                const imgUrl = getComponentImageUrl(c.componentName);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-blue-100 text-slate-800 font-medium shadow-2xs gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {imgUrl && (
                        <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden p-0.5">
                          <Image
                            src={imgUrl}
                            alt={c.componentName}
                            width={32}
                            height={32}
                            unoptimized
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <span className="truncate">{c.componentName} ({c.piecesPerGarment}/garment):</span>
                    </div>
                    <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono shrink-0">
                      {parsedTargetQty * c.piecesPerGarment} pcs
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto py-2.5 px-6 font-bold text-xs text-white rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Creating Order...</span>
              </>
            ) : (
              <span>Create Cutting Order Draft</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
