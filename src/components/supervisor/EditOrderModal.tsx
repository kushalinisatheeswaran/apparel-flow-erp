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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                BATCH DETAILS & LOGS
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Order #{order.orderNo}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Order Details & Verification History
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Subtitle Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
            {isImmutable
              ? "🔒 Submitted Order: Core batch parameters locked. Update cumulative fabric or review verifier inspection logs."
              : "✏️ Draft Order: All batch parameters may be edited before initial submission."}
          </div>

          {/* Read-Only Verification Rejection Callout & Variances */}
          {latestLog && latestLog.decision === "REJECTED" && (
            <div className="p-4 rounded-xl border bg-rose-50 border-rose-200 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <span className="text-xs font-bold uppercase text-rose-900 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Latest Quality Rejection Notice</span>
                </span>
                <span className="text-xs text-rose-700 font-mono">
                  {new Date(latestLog.timestamp).toLocaleString()} | {latestLog.verifier.fullName}
                </span>
              </div>

              <div>
                <div className="text-xs font-bold text-rose-900 mb-1">Rejection Reason:</div>
                <div className="text-xs text-rose-900 bg-white p-3 rounded-lg border border-rose-200 italic font-medium">
                  &quot;{latestLog.rejectionNote || "No note provided."}&quot;
                </div>
              </div>

              {/* Component Shortage Breakdown Table */}
              {Array.isArray(latestLog.countSnapshot) && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                    Inspected Component Variances & Recut Requirements:
                  </div>
                  <div className="overflow-x-auto border border-rose-200 rounded-lg bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-rose-100/70 text-rose-900 font-bold border-b border-rose-200 uppercase text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Component</th>
                          <th className="py-2.5 px-3 text-center">Expected</th>
                          <th className="py-2.5 px-3 text-center">Usable Count</th>
                          <th className="py-2.5 px-3 text-center">Variance</th>
                          <th className="py-2.5 px-3 text-right">QC Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 text-slate-800 font-medium">
                        {latestLog.countSnapshot.map((item, idx) => {
                          const isShortage = item.variance < 0 || item.status === "RED";
                          return (
                            <tr key={idx} className={isShortage ? "bg-rose-50/60" : ""}>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {item.componentName}
                                {isShortage && (
                                  <span className="ml-2 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded">
                                    Recut Required
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">{item.expectedQty}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {item.actualQty !== null ? item.actualQty : "Uncounted"}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                <span
                                  className={
                                    item.variance < 0
                                      ? "text-rose-700"
                                      : item.variance > 0
                                      ? "text-amber-700"
                                      : "text-emerald-700"
                                  }
                                >
                                  {item.variance > 0 ? `+${item.variance}` : item.variance}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold">
                                {item.status === "GREEN" && (
                                  <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    GREEN
                                  </span>
                                )}
                                {item.status === "YELLOW" && (
                                  <span className="px-2 py-0.5 text-[10px] rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    YELLOW
                                  </span>
                                )}
                                {item.status === "RED" && (
                                  <span className="px-2 py-0.5 text-[10px] rounded bg-rose-100 text-rose-800 border border-rose-300">
                                    RED
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
            <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Previous Verification Attempts ({order.verificationLogs.length} total)
              </div>
              <div className="space-y-2 text-xs">
                {order.verificationLogs.slice(1).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-slate-700"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {log.decision === "APPROVED" ? "✓ Approved" : "🚫 Rejected"}
                      </span>{" "}
                      on {new Date(log.timestamp).toLocaleDateString()} by {log.verifier.fullName}
                      {log.rejectionNote && (
                        <div className="text-slate-500 italic mt-0.5">&quot;{log.rejectionNote}&quot;</div>
                      )}
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      Wastage: {Number(log.wastagePct).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3.5 text-xs rounded-lg border font-semibold flex items-center gap-2 bg-rose-50 border-rose-200 text-rose-800"
            >
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Recipe Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Garment Recipe</span>
                {isImmutable && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    🔒 Immutable
                  </span>
                )}
              </label>
              <select
                disabled={isImmutable}
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500 font-medium"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Target Batch Qty</span>
                  {isImmutable && (
                    <span className="text-[11px] font-bold text-amber-700">🔒 Locked</span>
                  )}
                </label>
                <input
                  disabled={isImmutable}
                  type="number"
                  value={targetQty}
                  onChange={(e) => setTargetQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500 font-mono"
                />
              </div>

              {/* Fabric Roll ID */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Fabric Roll ID</span>
                  {isImmutable && (
                    <span className="text-[11px] font-bold text-amber-700">🔒 Locked</span>
                  )}
                </label>
                <input
                  disabled={isImmutable}
                  type="text"
                  value={fabricRollId}
                  onChange={(e) => setFabricRollId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500 font-mono"
                />
              </div>
            </div>

            {/* Actual Fabric Used */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Actual Fabric Used (Yards) *
                {isImmutable && (
                  <span className="ml-2 text-[11px] font-normal text-slate-500 normal-case">
                    (Must be ≥ previous {Number(order.actualFabricYds)} yds)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={actualFabricYds}
                onChange={(e) => setActualFabricYds(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono font-bold"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
