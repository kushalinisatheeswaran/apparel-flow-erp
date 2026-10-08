"use client";

import { useState, useEffect, useCallback } from "react";
import { PendingOrderList, PendingOrderItem } from "@/components/verifier/PendingOrderList";
import { VerificationTerminal } from "@/components/verifier/VerificationTerminal";

export function VerifierDashboardClient() {
  const [orders, setOrders] = useState<PendingOrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrderItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/verifier/orders");
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || "Failed to load pending verification queue.");
      } else {
        setOrders(data);
        setFetchError(null);
        if (selectedOrder) {
          const updated = data.find((o: PendingOrderItem) => o.id === selectedOrder.id);
          if (updated) {
            setSelectedOrder(updated);
          }
        }
      }
    } catch {
      setFetchError("Failed to connect to verification order service.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrder]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/verifier/orders");
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setFetchError(data.error || "Failed to load pending verification queue.");
          } else {
            setOrders(data);
            setFetchError(null);
          }
          setIsLoading(false);
        }
      } catch {
        if (!ignore) {
          setFetchError("Failed to connect to verification order service.");
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {fetchError && (
        <div
          role="alert"
          className="p-4 text-sm rounded-md border font-medium bg-red-50 text-red-700 border-red-300"
        >
          {fetchError}
        </div>
      )}

      {selectedOrder ? (
        <VerificationTerminal
          order={selectedOrder}
          onRefresh={fetchOrders}
          onDeselect={() => setSelectedOrder(null)}
        />
      ) : (
        <>
          {isLoading ? (
            <div className="p-8 text-center text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
              Loading pending verification queue...
            </div>
          ) : (
            <PendingOrderList
              orders={orders}
              selectedOrderId={null}
              onSelectOrder={(ord) => setSelectedOrder(ord)}
              onRefresh={fetchOrders}
            />
          )}
        </>
      )}
    </div>
  );
}
