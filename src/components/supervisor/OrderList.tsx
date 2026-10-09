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
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            Cutting in Progress
          </span>
        );
      case "PENDING_VERIFICATION":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            Pending Verification
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            Rejected
          </span>
        );
      case "VERIFIED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Verified
          </span>
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Production Orders History
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Manage your cutting orders, edit drafts, review verifier rejection notes, and submit for QC verification
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Orders
        </button>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3.5 text-xs rounded-lg border font-semibold flex items-center gap-2 bg-rose-50 border-rose-200 text-rose-800"
        >
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="p-3.5 text-xs rounded-lg border font-semibold flex items-center gap-2 bg-emerald-50 border-emerald-200 text-emerald-800"
        >
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{actionSuccess}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="py-12 text-center space-y-2 border border-dashed rounded-xl border-slate-300 bg-slate-50/50">
          <svg className="w-8 h-8 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-bold text-slate-700">No Cutting Orders Found</p>
          <p className="text-xs text-slate-500">Create a new batch draft above to start tracking cut pieces.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Order No</th>
                <th className="py-3.5 px-4">Garment Recipe</th>
                <th className="py-3.5 px-4 text-right">Target Qty</th>
                <th className="py-3.5 px-4">Fabric Details</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Submitted At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-800">
              {orders.map((ord) => {
                const isLoadingThis = loadingOrderId === ord.id;
                const latestLog = ord.verificationLogs && ord.verificationLogs.length > 0 ? ord.verificationLogs[0] : null;

                return (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900 font-mono text-sm">{ord.orderNo}</td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{ord.recipe.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Code: {ord.recipe.recipeCode}</div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {ord.targetQty} units
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900 font-mono">{Number(ord.actualFabricYds).toFixed(2)} yds</div>
                      <div className="text-[11px] text-slate-500 font-mono">Roll #{ord.fabricRollId}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div>{renderStatusBadge(ord.status)}</div>
                      {ord.status === "REJECTED" && latestLog?.rejectionNote && (
                        <div className="mt-1.5 text-[11px] text-rose-800 bg-rose-50 p-1.5 rounded border border-rose-200 max-w-xs truncate font-medium text-left" title={latestLog.rejectionNote}>
                          Reason: {latestLog.rejectionNote}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-mono text-[11px]">
                      {ord.firstSubmittedAt
                        ? new Date(ord.firstSubmittedAt).toLocaleString()
                        : "Not submitted"}
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      {ord.status === "CUTTING_IN_PROGRESS" && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditOrder(ord)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isLoadingThis}
                            onClick={() => handleSubmitForVerification(ord.id)}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
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
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            View Inspection Details
                          </button>
                          <button
                            type="button"
                            disabled={isLoadingThis}
                            onClick={() => handleBeginCorrection(ord.id)}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-2xs"
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
                          className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
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
