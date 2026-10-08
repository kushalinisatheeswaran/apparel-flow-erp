"use client";

import { useState, useEffect, useCallback } from "react";
import { OrderForm, RecipeData } from "@/components/supervisor/OrderForm";
import { OrderList } from "@/components/supervisor/OrderList";
import { EditOrderModal, OrderItemData } from "@/components/supervisor/EditOrderModal";

interface SupervisorDashboardClientProps {
  initialRecipes: RecipeData[];
}

export function SupervisorDashboardClient({ initialRecipes }: SupervisorDashboardClientProps) {
  const [recipes] = useState<RecipeData[]>(initialRecipes);
  const [orders, setOrders] = useState<OrderItemData[]>([]);
  const [editingOrder, setEditingOrder] = useState<OrderItemData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/supervisor/orders");
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || "Failed to load cutting orders.");
      } else {
        setOrders(data);
        setFetchError(null);
      }
    } catch {
      setFetchError("Failed to connect to order service.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/supervisor/orders");
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setFetchError(data.error || "Failed to load cutting orders.");
          } else {
            setOrders(data);
            setFetchError(null);
          }
          setIsLoading(false);
        }
      } catch {
        if (!ignore) {
          setFetchError("Failed to connect to order service.");
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
      <OrderForm recipes={recipes} onOrderCreated={fetchOrders} />

      {fetchError && (
        <div
          role="alert"
          className="p-4 text-sm rounded-md border font-medium bg-red-50 text-red-700 border-red-300"
        >
          {fetchError}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-xl shadow-sm">
          Loading production orders...
        </div>
      ) : (
        <OrderList
          orders={orders}
          onEditOrder={(ord) => setEditingOrder(ord)}
          onRefresh={fetchOrders}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          recipes={recipes}
          onClose={() => setEditingOrder(null)}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  );
}
