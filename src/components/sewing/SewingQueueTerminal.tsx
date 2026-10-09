"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ApprovedInspectionModal,
  SewingOrderItem,
} from "./ApprovedInspectionModal";

export function SewingQueueTerminal() {
  const [orders, setOrders] = useState<SewingOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingOrderId, setStartingOrderId] = useState<string | null>(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<SewingOrderItem | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "ready" | "started">("all");

  const loadOrders = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sewing/orders");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch orders (${res.status})`);
      }
      const data = await res.json();
      setOrders(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load sewing queue.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch("/api/sewing/orders");
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch orders (${res.status})`);
        }
        const data = await res.json();
        if (!ignore) {
          setOrders(data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load sewing queue.";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  const handleStartSewing = async (orderId: string) => {
    setStartingOrderId(orderId);
    setError(null);

    try {
      const res = await fetch(`/api/sewing/orders/${orderId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start sewing assembly.");
      }

      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId
            ? { ...ord, sewingStartedAt: data.order?.sewingStartedAt || new Date().toISOString() }
            : ord
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error initiating sewing assembly.";
      setError(msg);
    } finally {
      setStartingOrderId(null);
    }
  };

  const readyOrders = orders.filter((o) => !o.sewingStartedAt);
  const startedOrders = orders.filter((o) => !!o.sewingStartedAt);

  const displayedOrders =
    activeTab === "ready"
      ? readyOrders
      : activeTab === "started"
      ? startedOrders
      : orders;

  return (
    <div className="space-y-6">
      {/* Header Bar & Refresh */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Sewing Supervisor Queue
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Verified cut-piece batches ready for assembly initiation.
          </p>
        </div>

        <button
          onClick={() => loadOrders(false)}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Queue
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Verified Batches
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-xs">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Ready for Assembly
          </p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{readyOrders.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 shadow-xs">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
            Assembly In Progress
          </p>
          <p className="text-2xl font-bold text-indigo-900 mt-1">{startedOrders.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          All Verified Batches ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("ready")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "ready"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Ready for Sewing ({readyOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("started")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "started"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Sewing Started ({startedOrders.length})
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
          <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-bold">Queue Notice</h3>
            <p className="text-xs text-rose-800 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Table / Loading / Empty State */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <svg className="w-8 h-8 animate-spin mx-auto text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-sm font-medium">Loading Verified Batches from Sewing Queue...</p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <svg className="w-10 h-10 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-base font-bold text-slate-700">No Verified Orders Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab === "ready"
                ? "There are currently no verified batches awaiting assembly start."
                : activeTab === "started"
                ? "No sewing assembly operations have been started yet."
                : "No verified cutting orders exist in the system."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-4">Order Number</th>
                  <th className="p-4">Recipe Details</th>
                  <th className="p-4 text-right">Target Qty</th>
                  <th className="p-4">Fabric Details</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-800">
                {displayedOrders.map((ord) => {
                  const isStarted = !!ord.sewingStartedAt;
                  const isProcessing = startingOrderId === ord.id;

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-900 font-mono text-sm">
                        {ord.orderNo}
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900">{ord.recipe.name}</div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          Code: {ord.recipe.recipeCode} | {ord.recipe.category}
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {ord.targetQty}
                      </td>

                      <td className="p-4">
                        <div className="text-slate-900 font-semibold">Roll #{ord.fabricRollId}</div>
                        <div className="text-slate-500 text-[11px]">
                          {Number(ord.actualFabricYds).toFixed(2)} Yds
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {isStarted ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                              Sewing Started
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1 font-mono">
                              {new Date(ord.sewingStartedAt!).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Ready for Sewing
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedOrderForModal(ord)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded border border-slate-300 transition-colors"
                        >
                          View Inspection
                        </button>

                        <button
                          onClick={() => handleStartSewing(ord.id)}
                          disabled={isStarted || isProcessing}
                          className={`px-3 py-1.5 font-semibold text-xs rounded transition-colors ${
                            isStarted
                              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                              : isProcessing
                              ? "bg-emerald-400 text-white cursor-wait"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          }`}
                        >
                          {isProcessing
                            ? "Starting..."
                            : isStarted
                            ? "Assembly Started"
                            : "Start Sewing Assembly"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Read-Only Modal Component */}
      <ApprovedInspectionModal
        order={selectedOrderForModal}
        isOpen={!!selectedOrderForModal}
        onClose={() => setSelectedOrderForModal(null)}
      />
    </div>
  );
}
