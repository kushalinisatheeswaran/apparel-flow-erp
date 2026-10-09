"use client";

import React from "react";
import {
  parseApprovedSnapshot,
  ApprovedComponentSnapshot,
  isWastageOverCap,
} from "@/lib/validators/sewing";

export interface VerificationLogDetails {
  id: string;
  verifierId: string;
  decision: string;
  rejectionNote: string | null;
  wastagePct: number | string;
  fabricUsedSnapshot: number | string;
  expectedFabricSnapshot: number | string;
  countSnapshot: unknown;
  timestamp: string | Date;
  verifier: {
    fullName: string;
    email: string;
  };
}

export interface SewingOrderItem {
  id: string;
  orderNo: string;
  recipeId: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number | string;
  status: string;
  sewingStartedAt: string | Date | null;
  recipe: {
    recipeCode: string;
    name: string;
    category: string;
    stdFabricYards: number | string;
    wastageCap: number | string;
  };
  verificationLogs?: VerificationLogDetails[];
}

interface ApprovedInspectionModalProps {
  order: SewingOrderItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApprovedInspectionModal({
  order,
  isOpen,
  onClose,
}: ApprovedInspectionModalProps) {
  if (!isOpen || !order) return null;

  const latestApproval = order.verificationLogs && order.verificationLogs.length > 0
    ? order.verificationLogs[0]
    : null;

  const parsedComponents: ApprovedComponentSnapshot[] = latestApproval
    ? parseApprovedSnapshot(latestApproval.countSnapshot)
    : [];

  const wastagePct = latestApproval ? Number(latestApproval.wastagePct) : 0;
  const wastageCap = Number(order.recipe.wastageCap);
  const overCap = isWastageOverCap(wastagePct, wastageCap);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                VERIFIED INSPECTION AUDIT
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Order #{order.orderNo}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Approved Cut-Piece Inspection Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Order & Recipe
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{order.orderNo}</p>
              <p className="text-xs text-slate-600">
                {order.recipe.name} ({order.recipe.recipeCode})
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Target Qty
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {order.targetQty} garments
              </p>
              <p className="text-xs text-slate-600">
                Category: {order.recipe.category}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Fabric Details
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                Roll #{order.fabricRollId}
              </p>
              <p className="text-xs text-slate-600">
                {Number(order.actualFabricYds).toFixed(2)} Yds Actual
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Fabric Wastage
              </p>
              <p className={`text-sm font-bold mt-0.5 ${overCap ? "text-amber-700" : "text-emerald-700"}`}>
                {wastagePct.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-600">
                Cap: {wastageCap.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Over Cap Warning Banner */}
          {overCap && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-900">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="font-semibold text-xs text-amber-900 uppercase tracking-wide">
                  Fabric Wastage Warning: Over Cap
                </span>
                <p className="text-xs text-amber-800 mt-0.5">
                  Actual wastage of {wastagePct.toFixed(2)}% exceeded standard recipe cap of {wastageCap.toFixed(2)}%. Verified and approved by verifier.
                </p>
              </div>
            </div>
          )}

          {/* Verifier Identity & Timestamp */}
          {latestApproval ? (
            <div className="bg-slate-100 p-3.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-2">
              <div>
                <span className="font-medium text-slate-500">Verified By: </span>
                <span className="font-bold text-slate-900">{latestApproval.verifier.fullName}</span>{" "}
                <span className="text-slate-500">({latestApproval.verifier.email})</span>
              </div>
              <div>
                <span className="font-medium text-slate-500">Approved At: </span>
                <span className="font-semibold text-slate-900">
                  {new Date(latestApproval.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-100 rounded-lg text-xs text-slate-600">
              No immutable verification audit log found.
            </div>
          )}

          {/* Approved Component Snapshot Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Approved Component Counts</span>
              <span className="text-xs font-normal text-slate-500">(Read-Only Source: VerificationLog.countSnapshot)</span>
            </h3>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Component Name</th>
                    <th className="p-3 text-right">Expected Qty</th>
                    <th className="p-3 text-right">Usable Actual Qty</th>
                    <th className="p-3 text-right">Variance</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-800">
                  {parsedComponents.length > 0 ? (
                    parsedComponents.map((comp) => (
                      <tr key={comp.componentId || comp.componentName} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">{comp.componentName}</td>
                        <td className="p-3 text-right font-mono text-slate-700">{comp.expectedQty}</td>
                        <td className="p-3 text-right font-mono text-slate-900 font-bold">{comp.actualQty}</td>
                        <td className="p-3 text-right font-mono font-bold">
                          {comp.variance > 0 ? `+${comp.variance}` : comp.variance}
                        </td>
                        <td className="p-3 text-center">
                          {comp.status === "GREEN" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              GREEN
                            </span>
                          )}
                          {comp.status === "YELLOW" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              YELLOW
                            </span>
                          )}
                          {comp.status === "RED" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              RED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                        No snapshot details available for this batch.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}
