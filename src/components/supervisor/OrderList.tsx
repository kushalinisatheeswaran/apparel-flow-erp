"use client";

import { useState } from "react";
import { OrderItemData } from "./EditOrderModal";

interface OrderListProps {
  orders: OrderItemData[];
  onEditOrder: (order: OrderItemData) => void;
  onRefresh: () => void;
}

export function OrderList({ orders, onEditOrder, onRefresh }: OrderListProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  const handleBeginCorrection = async (orderId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setLoadingOrderId(orderId);

    try {
      const res = await fetch(`/api/supervisor/orders/${orderId}/correction`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to begin correction.");
        setLoadingOrderId(null);
        return;
      }

      setActionSuccess(`Order ${data.orderNo} is now in correction mode. You may update fabric or submit when ready.`);
      setLoadingOrderId(null);
      onRefresh();
    } catch {
      setActionError("An unexpected network error occurred.");
      setLoadingOrderId(null);
    }
  };

  const handleSubmitForVerification = async (orderId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setLoadingOrderId(orderId);

    try {
      const res = await fetch(`/api/supervisor/orders/${orderId}/submit`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || "Failed to submit order for verification.");
        setLoadingOrderId(null);
        return;
      }

      setActionSuccess(`Order ${data.orderNo} successfully submitted for verification!`);
      setLoadingOrderId(null);
      onRefresh();
    } catch {
      setActionError("An unexpected network error occurred.");
      setLoadingOrderId(null);
    }
  };

  const renderStatusBadge = (status: OrderItemData["status"]) => {
    switch (status) {
      case "CUTTING_IN_PROGRESS":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200">
            Cutting in Progress
          </span>
        );
      case "PENDING_VERIFICATION":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">
            Pending Verification
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-red-100 text-red-800 border border-red-200">
            Rejected
          </span>
        );
      case "VERIFIED":
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
            Verified
          </span>
        );
    }
  };

  return (
    <div
      className="p-6 rounded-xl border shadow-sm space-y-4"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0F172A" }}
    >
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "#CBD5E1" }}>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#0F172A" }}>
            Production Orders History
          </h2>
          <p className="text-xs" style={{ color: "#475569" }}>
            Manage your cutting orders, edit drafts, view verifier rejection notes, and submit for verification
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
        >
          🔄 Refresh Orders
        </button>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3 text-sm rounded-md border font-medium"
          style={{ backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", color: "#B91C1C" }}
        >
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="p-3 text-sm rounded-md border font-medium text-emerald-800 bg-emerald-50 border-emerald-300"
        >
          {actionSuccess}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="py-12 text-center text-sm font-medium text-slate-500 border border-dashed rounded-lg border-slate-300">
          No cutting orders found. Create your first cutting order above!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-slate-50 text-xs font-semibold uppercase text-slate-600" style={{ borderColor: "#CBD5E1" }}>
                <th className="py-3 px-3">Order No</th>
                <th className="py-3 px-3">Garment Recipe</th>
                <th className="py-3 px-3">Target Qty</th>
                <th className="py-3 px-3">Fabric (Roll / Actual)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Submitted At</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#CBD5E1" }}>
              {orders.map((ord) => {
                const isLoadingThis = loadingOrderId === ord.id;
                const latestLog = ord.verificationLogs && ord.verificationLogs.length > 0 ? ord.verificationLogs[0] : null;

                return (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900">{ord.orderNo}</td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-900">{ord.recipe.name}</div>
                      <div className="text-xs text-slate-500">{ord.recipe.recipeCode}</div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      {ord.targetQty} units
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-800">{Number(ord.actualFabricYds)} yds</div>
                      <div className="text-xs text-slate-500">Roll: {ord.fabricRollId}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div>{renderStatusBadge(ord.status)}</div>
                      {ord.status === "REJECTED" && latestLog?.rejectionNote && (
                        <div className="mt-1 text-[11px] text-red-700 bg-red-50 p-1.5 rounded border border-red-200 max-w-xs truncate" title={latestLog.rejectionNote}>
                          Reason: {latestLog.rejectionNote}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600">
                      {ord.firstSubmittedAt
                        ? new Date(ord.firstSubmittedAt).toLocaleString()
                        : "Not submitted"}
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2">
                      {ord.status === "CUTTING_IN_PROGRESS" && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditOrder(ord)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isLoadingThis}
                            onClick={() => handleSubmitForVerification(ord.id)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isLoadingThis ? "Submitting..." : "Submit for QC"}
                          </button>
                        </>
                      )}

                      {ord.status === "REJECTED" && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditOrder(ord)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
                          >
                            View Inspection Details
                          </button>
                          <button
                            type="button"
                            disabled={isLoadingThis}
                            onClick={() => handleBeginCorrection(ord.id)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-amber-600 rounded hover:bg-amber-700 disabled:opacity-50"
                          >
                            {isLoadingThis ? "Starting..." : "Begin Correction"}
                          </button>
                        </>
                      )}

                      {ord.status === "PENDING_VERIFICATION" && (
                        <span className="text-xs font-medium text-slate-500 italic">
                          Awaiting QC
                        </span>
                      )}

                      {ord.status === "VERIFIED" && (
                        <button
                          type="button"
                          onClick={() => onEditOrder(ord)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                        >
                          View Inspection Log
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
