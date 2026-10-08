"use client";

import { useState } from "react";
import { RecipeData } from "./OrderForm";

export interface VerificationLogItemData {
  id: string;
  decision: "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  wastagePct: number | string;
  countSnapshot: {
    componentId: string;
    componentName: string;
    expectedQty: number;
    actualQty: number | null;
    variance: number;
    status: "GREEN" | "YELLOW" | "RED" | null;
  }[];
  timestamp: string;
  verifier: {
    fullName: string;
    email: string;
  };
}

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
  verificationLogs?: VerificationLogItemData[];
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
  const latestLog = order.verificationLogs && order.verificationLogs.length > 0 ? order.verificationLogs[0] : null;

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-xl border shadow-xl p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0F172A" }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "#CBD5E1" }}>
          <div>
            <h3 className="text-lg font-bold" style={{ color: "#0F172A" }}>
              Inspection & Order Details — {order.orderNo}
            </h3>
            <p className="text-xs" style={{ color: "#475569" }}>
              {isImmutable
                ? "Submitted Order: Core parameters locked. Update cumulative fabric or review verification details."
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

        {/* Read-Only Verification Rejection Callout & Variances */}
        {latestLog && latestLog.decision === "REJECTED" && (
          <div className="p-4 rounded-lg border bg-red-50/70 border-red-200 space-y-3">
            <div className="flex items-center justify-between border-b border-red-200 pb-2">
              <span className="text-xs font-bold uppercase text-red-900 flex items-center gap-1.5">
                <span>🚫 Latest Verification Rejection Notice</span>
              </span>
              <span className="text-xs text-red-700 font-medium">
                {new Date(latestLog.timestamp).toLocaleString()} by {latestLog.verifier.fullName}
              </span>
            </div>

            <div>
              <div className="text-xs font-semibold text-red-900 mb-0.5">Rejection Reason:</div>
              <div className="text-xs text-red-800 bg-white p-2.5 rounded border border-red-200 italic font-medium">
                &quot;{latestLog.rejectionNote || "No note provided."}&quot;
              </div>
            </div>

            {/* Read-Only Component Shortage Breakdown Table */}
            {Array.isArray(latestLog.countSnapshot) && (
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-bold text-red-900 uppercase">
                  Inspected Component Variances & Recut Requirements:
                </div>
                <div className="overflow-x-auto border border-red-200 rounded bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-red-100/60 text-red-900 font-semibold border-b border-red-200">
                      <tr>
                        <th className="py-2 px-2.5">Component</th>
                        <th className="py-2 px-2.5 text-center">Expected</th>
                        <th className="py-2 px-2.5 text-center">Usable Count</th>
                        <th className="py-2 px-2.5 text-center">Variance</th>
                        <th className="py-2 px-2.5 text-right">QC Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 text-slate-800">
                      {latestLog.countSnapshot.map((item, idx) => {
                        const isShortage = item.variance < 0 || item.status === "RED";
                        return (
                          <tr key={idx} className={isShortage ? "bg-red-50/50" : ""}>
                            <td className="py-2 px-2.5 font-semibold">
                              {item.componentName}
                              {isShortage && (
                                <span className="ml-2 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded">
                                  Recut Needed
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-center font-medium">{item.expectedQty}</td>
                            <td className="py-2 px-2.5 text-center font-bold">
                              {item.actualQty !== null ? item.actualQty : "Uncounted"}
                            </td>
                            <td className="py-2 px-2.5 text-center font-bold">
                              <span
                                className={
                                  item.variance < 0
                                    ? "text-red-700"
                                    : item.variance > 0
                                    ? "text-amber-700"
                                    : "text-emerald-700"
                                }
                              >
                                {item.variance > 0 ? `+${item.variance}` : item.variance}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-right">
                              {item.status === "GREEN" && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                                  GREEN
                                </span>
                              )}
                              {item.status === "YELLOW" && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800">
                                  YELLOW
                                </span>
                              )}
                              {item.status === "RED" && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-800">
                                  RED (Shortage)
                                </span>
                              )}
                              {item.status === null && (
                                <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                                  Uncounted
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Log History Accordion / List for Previous Attempts */}
        {order.verificationLogs && order.verificationLogs.length > 1 && (
          <div className="p-3.5 rounded-lg border bg-slate-50 border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Previous Verification Attempts ({order.verificationLogs.length} total)
            </div>
            <div className="space-y-1.5 text-xs">
              {order.verificationLogs.slice(1).map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded bg-white border border-slate-200 flex items-center justify-between text-slate-700"
                >
                  <div>
                    <span className="font-semibold text-slate-900">
                      {log.decision === "APPROVED" ? "✓ Approved" : "🚫 Rejected"}
                    </span>{" "}
                    on {new Date(log.timestamp).toLocaleDateString()} by {log.verifier.fullName}
                    {log.rejectionNote && (
                      <div className="text-slate-500 italic mt-0.5">&quot;{log.rejectionNote}&quot;</div>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    Wastage: {Number(log.wastagePct)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
              Close
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
