"use client";

import { useState } from "react";
import { PendingOrderItem } from "./PendingOrderList";

interface VerificationTerminalProps {
  order: PendingOrderItem;
  onRefresh: () => void;
  onDeselect: () => void;
}

export function VerificationTerminal({
  order,
  onRefresh,
  onDeselect,
}: VerificationTerminalProps) {
  const [countsMap, setCountsMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    order.verificationItems.forEach((item) => {
      initial[item.componentId] = item.actualQty !== null ? String(item.actualQty) : "";
    });
    return initial;
  });

  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSavingCounts, setIsSavingCounts] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const expectedFabricYds = order.targetQty * Number(order.recipe.stdFabricYards);
  const actualFabricYds = Number(order.actualFabricYds);
  const wastagePct = Math.round(((actualFabricYds - expectedFabricYds) / expectedFabricYds) * 100 * 100) / 100;
  const wastageCap = Number(order.recipe.wastageCap);
  const isWastageExceeded = wastagePct > wastageCap;

  const getComputedStatus = (componentId: string, expectedQty: number) => {
    const valStr = countsMap[componentId];
    if (valStr === undefined || valStr.trim() === "") {
      return null;
    }
    if (!/^\d+$/.test(valStr.trim())) {
      return "INVALID";
    }
    const actual = parseInt(valStr.trim(), 10);
    if (actual === expectedQty) return "GREEN";
    if (actual > expectedQty) return "YELLOW";
    return "RED";
  };

  const hasUncounted = order.verificationItems.some((item) => {
    const str = countsMap[item.componentId];
    return str === undefined || str.trim() === "";
  });

  const hasRedOrInvalid = order.verificationItems.some((item) => {
    const status = getComputedStatus(item.componentId, item.expectedQty);
    return status === "RED" || status === "INVALID";
  });

  const hasInvalid = order.verificationItems.some((item) => {
    const status = getComputedStatus(item.componentId, item.expectedQty);
    return status === "INVALID";
  });

  const canApprove = !hasUncounted && !hasRedOrInvalid;
  const canReject = !hasUncounted && !hasInvalid;

  const handleSaveCounts = async () => {
    setError(null);
    setSuccess(null);

    const countsPayload: { componentId: string; actualQty: number | null }[] = [];

    for (const item of order.verificationItems) {
      const valStr = countsMap[item.componentId];
      if (valStr === undefined || valStr.trim() === "") {
        countsPayload.push({ componentId: item.componentId, actualQty: null });
      } else {
        if (!/^\d+$/.test(valStr.trim())) {
          setError(`Actual count for ${item.component.componentName} must be a whole integer. Decimals like 37.5 are rejected.`);
          return;
        }
        countsPayload.push({
          componentId: item.componentId,
          actualQty: parseInt(valStr.trim(), 10),
        });
      }
    }

    setIsSavingCounts(true);

    try {
      const res = await fetch(`/api/verifier/orders/${order.id}/counts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counts: countsPayload }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update component counts.");
        setIsSavingCounts(false);
        return;
      }

      setSuccess("Physical component counts saved successfully.");
      setIsSavingCounts(false);
      onRefresh();
    } catch {
      setError("An unexpected network error occurred while saving counts.");
      setIsSavingCounts(false);
    }
  };

  const handleApprove = async () => {
    setError(null);
    setSuccess(null);

    await handleSaveCounts();

    setIsApproving(true);

    try {
      const res = await fetch(`/api/verifier/orders/${order.id}/approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Batch approval failed.");
        setIsApproving(false);
        return;
      }

      setSuccess(`Batch ${order.orderNo} successfully VERIFIED and released to Sewing Queue!`);
      setIsApproving(false);
      setTimeout(() => {
        onRefresh();
        onDeselect();
      }, 1500);
    } catch {
      setError("An unexpected network error occurred during approval.");
      setIsApproving(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!rejectionNote.trim()) {
      setError("Rejection note is required and cannot be blank.");
      return;
    }

    await handleSaveCounts();

    setIsRejecting(true);

    try {
      const res = await fetch(`/api/verifier/orders/${order.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionNote: rejectionNote.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Batch rejection failed.");
        setIsRejecting(false);
        return;
      }

      setSuccess(`Batch ${order.orderNo} REJECTED and returned to Cutting Supervisor for correction.`);
      setIsRejecting(false);
      setShowRejectModal(false);
      setTimeout(() => {
        onRefresh();
        onDeselect();
      }, 1500);
    } catch {
      setError("An unexpected network error occurred during rejection.");
      setIsRejecting(false);
    }
  };

  return (
    <div
      className="p-6 rounded-xl border shadow-sm space-y-6"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0F172A" }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "#CBD5E1" }}>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">QC Inspection Terminal — {order.orderNo}</h2>
            <span className="text-xs px-2.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              Pending QC
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Supervisor: <strong>{order.creator.fullName}</strong> ({order.creator.email})
          </p>
        </div>
        <button
          type="button"
          onClick={onDeselect}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
        >
          ← Back to Queue
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 text-sm rounded-md border font-medium"
          style={{ backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", color: "#B91C1C" }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="p-3.5 text-sm rounded-md border font-medium text-emerald-800 bg-emerald-50 border-emerald-300"
        >
          {success}
        </div>
      )}

      {/* Order Batch & Fabric Summary Card */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-500 font-medium">Garment Recipe:</span>
          <div className="font-bold text-slate-900 text-sm">{order.recipe.name}</div>
          <div className="text-slate-500">{order.recipe.recipeCode} ({order.recipe.category})</div>
        </div>
        <div>
          <span className="text-slate-500 font-medium">Target Batch Qty:</span>
          <div className="font-bold text-slate-900 text-sm">{order.targetQty} garments</div>
          <div className="text-slate-500">Fabric Roll: {order.fabricRollId}</div>
        </div>
        <div>
          <span className="text-slate-500 font-medium">Actual Fabric Usage:</span>
          <div className="font-bold text-slate-900 text-sm">{actualFabricYds} yards</div>
          <div className="text-slate-500">Expected: {expectedFabricYds.toFixed(2)} yards</div>
        </div>
        <div>
          <span className="text-slate-500 font-medium">Fabric Wastage Variance:</span>
          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <span>{wastagePct}%</span>
            {isWastageExceeded ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300" title={`Exceeds ${wastageCap}% wastage cap`}>
                ⚠️ Over Cap ({wastageCap}%)
              </span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                ✓ Within Cap ({wastageCap}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Component Counting Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Physical Usable Component Counting Table
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Enter usable physical count. Damaged pieces must be excluded.
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <th className="py-3 px-4">Component Name</th>
                <th className="py-3 px-4 text-center">Pieces / Unit</th>
                <th className="py-3 px-4 text-center">Expected Qty</th>
                <th className="py-3 px-4 text-center">Usable Actual Qty</th>
                <th className="py-3 px-4 text-center">Variance</th>
                <th className="py-3 px-4 text-right">QC Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.verificationItems.map((item) => {
                const valStr = countsMap[item.componentId] ?? "";
                const status = getComputedStatus(item.componentId, item.expectedQty);

                let varianceText = "—";
                if (valStr.trim() !== "" && /^\d+$/.test(valStr.trim())) {
                  const actual = parseInt(valStr.trim(), 10);
                  const diff = actual - item.expectedQty;
                  varianceText = diff > 0 ? `+${diff}` : String(diff);
                }

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.component.componentName}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 font-medium">
                      {item.component.piecesPerGarment}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {item.expectedQty} pcs
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="text"
                        value={valStr}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCountsMap((prev) => ({ ...prev, [item.componentId]: val }));
                        }}
                        placeholder="Enter count"
                        className="w-28 text-center px-2 py-1.5 text-sm rounded border font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                        style={{ backgroundColor: "#FFFFFF", color: "#0F172A", borderColor: "#CBD5E1" }}
                      />
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-sm">
                      <span
                        className={
                          varianceText.startsWith("+")
                            ? "text-amber-700"
                            : varianceText.startsWith("-")
                            ? "text-red-700"
                            : varianceText === "0"
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }
                      >
                        {varianceText}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {status === "GREEN" && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          GREEN
                        </span>
                      )}
                      {status === "YELLOW" && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          YELLOW (+Excess)
                        </span>
                      )}
                      {status === "RED" && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300">
                          RED (-Shortage)
                        </span>
                      )}
                      {status === "INVALID" && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-200 text-red-900 border border-red-400">
                          Whole Integer Required
                        </span>
                      )}
                      {status === null && (
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-300">
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

      {/* Action Footer Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: "#CBD5E1" }}>
        <button
          type="button"
          disabled={isSavingCounts}
          onClick={handleSaveCounts}
          className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
        >
          {isSavingCounts ? "Saving..." : "💾 Save Counts Draft"}
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            disabled={!canReject || isRejecting}
            onClick={() => setShowRejectModal(true)}
            className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚫 Reject Batch
          </button>
          <button
            type="button"
            disabled={!canApprove || isApproving}
            onClick={handleApprove}
            className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproving ? "Approving..." : "✓ Approve Batch for Sewing"}
          </button>
        </div>
      </div>

      {/* Mandatory Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border shadow-xl p-6 space-y-4 bg-white border-slate-300 text-slate-900">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <h3 className="text-lg font-bold text-red-900">Reject Batch — {order.orderNo}</h3>
              <button type="button" onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2">
                ×
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label htmlFor="rejectionNote" className="block text-sm font-semibold text-slate-900 mb-1">
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  id="rejectionNote"
                  rows={4}
                  required
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Describe physical defects, fabric damage, misprints, or component shortages..."
                  className="w-full px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-red-600"
                  style={{ backgroundColor: "#FFFFFF", color: "#0F172A", borderColor: "#CBD5E1" }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectionNote.trim() || isRejecting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
