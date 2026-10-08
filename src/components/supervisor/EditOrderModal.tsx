"use client";

import { useState } from "react";
import { RecipeData } from "./OrderForm";

export interface OrderItemData {
  id: string;
  orderNo: string;
  recipeId: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: string | number;
  status: "CUTTING_IN_PROGRESS" | "PENDING_VERIFICATION" | "REJECTED" | "VERIFIED";
  firstSubmittedAt: string | null;
  recipe: RecipeData;
  verificationItems: {
    id: string;
    expectedQty: number;
    actualQty: number | null;
    status: string | null;
    component: {
      componentName: string;
    };
  }[];
}

interface EditOrderModalProps {
  order: OrderItemData | null;
  recipes: RecipeData[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditOrderModal({
  order,
  recipes,
  onClose,
  onSuccess,
}: EditOrderModalProps) {
  if (!order) return null;

  return (
    <EditOrderModalForm
      key={order.id}
      order={order}
      recipes={recipes}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function EditOrderModalForm({
  order,
  recipes,
  onClose,
  onSuccess,
}: {
  order: OrderItemData;
  recipes: RecipeData[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedRecipeId, setSelectedRecipeId] = useState(order.recipeId);
  const [targetQty, setTargetQty] = useState(String(order.targetQty));
  const [fabricRollId, setFabricRollId] = useState(order.fabricRollId);
  const [actualFabricYds, setActualFabricYds] = useState(String(order.actualFabricYds));

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isImmutable = order.firstSubmittedAt !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: Record<string, unknown> = {};

    if (isImmutable) {
      payload.actualFabricYds = actualFabricYds.trim();
    } else {
      if (!/^\d+$/.test(targetQty.trim())) {
        setError("Target quantity must be a whole number.");
        return;
      }
      payload.recipeId = selectedRecipeId;
      payload.targetQty = parseInt(targetQty.trim(), 10);
      payload.fabricRollId = fabricRollId.trim();
      payload.actualFabricYds = actualFabricYds.trim();
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/supervisor/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update order.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch {
      setError("An unexpected network error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-xl p-6 space-y-5"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0F172A" }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#CBD5E1" }}>
          <div>
            <h3 className="text-lg font-bold" style={{ color: "#0F172A" }}>
              Edit Order — {order.orderNo}
            </h3>
            <p className="text-xs" style={{ color: "#475569" }}>
              {isImmutable
                ? "Submitted Order: Core parameters are locked. Update cumulative fabric usage."
                : "Draft Order: All batch parameters may be edited."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2"
          >
            ×
          </button>
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

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Recipe Select */}
          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center justify-between">
              <span>Garment Recipe</span>
              {isImmutable && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  🔒 Immutable
                </span>
              )}
            </label>
            <select
              disabled={isImmutable}
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500 font-medium"
              style={{ borderColor: "#CBD5E1" }}
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id} className="bg-white text-slate-900">
                  {r.recipeCode} — {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Qty */}
            <div>
              <label className="block text-sm font-semibold mb-1 flex items-center justify-between">
                <span>Target Batch Qty</span>
                {isImmutable && (
                  <span className="text-xs font-semibold text-amber-700">🔒 Locked</span>
                )}
              </label>
              <input
                disabled={isImmutable}
                type="number"
                value={targetQty}
                onChange={(e) => setTargetQty(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                style={{ borderColor: "#CBD5E1" }}
              />
            </div>

            {/* Fabric Roll ID */}
            <div>
              <label className="block text-sm font-semibold mb-1 flex items-center justify-between">
                <span>Fabric Roll ID</span>
                {isImmutable && (
                  <span className="text-xs font-semibold text-amber-700">🔒 Locked</span>
                )}
              </label>
              <input
                disabled={isImmutable}
                type="text"
                value={fabricRollId}
                onChange={(e) => setFabricRollId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                style={{ borderColor: "#CBD5E1" }}
              />
            </div>
          </div>

          {/* Actual Fabric Used */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Actual Fabric Used (Yards) *
              {isImmutable && (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  (Must be ≥ previous {Number(order.actualFabricYds)} yds)
                </span>
              )}
            </label>
            <input
              type="text"
              value={actualFabricYds}
              onChange={(e) => setActualFabricYds(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              style={{ backgroundColor: "#FFFFFF", color: "#0F172A", borderColor: "#CBD5E1" }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: "#CBD5E1" }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
