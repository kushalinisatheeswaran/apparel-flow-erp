"use client";

export interface PendingOrderItem {
  id: string;
  orderNo: string;
  recipeId: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: string | number;
  status: "PENDING_VERIFICATION";
  createdAt: string;
  updatedAt: string;
  firstSubmittedAt: string | null;
  recipe: {
    id: string;
    recipeCode: string;
    name: string;
    category: string;
    stdFabricYards: string | number;
    wastageCap: string | number;
    components: {
      id: string;
      componentName: string;
      piecesPerGarment: number;
    }[];
  };
  verificationItems: {
    id: string;
    orderId: string;
    componentId: string;
    expectedQty: number;
    actualQty: number | null;
    status: "GREEN" | "YELLOW" | "RED" | null;
    component: {
      id: string;
      componentName: string;
      piecesPerGarment: number;
    };
  }[];
  creator: {
    id: string;
    fullName: string;
    email: string;
  };
  verificationLogs?: {
    id: string;
    decision: "APPROVED" | "REJECTED";
    rejectionNote: string | null;
    wastagePct: number | string;
    timestamp: string;
  }[];
}

interface PendingOrderListProps {
  orders: PendingOrderItem[];
  selectedOrderId: string | null;
  onSelectOrder: (order: PendingOrderItem) => void;
  onRefresh: () => void;
}

export function PendingOrderList({
  orders,
  selectedOrderId,
  onSelectOrder,
  onRefresh,
}: PendingOrderListProps) {
  return (
    <div
      className="p-6 rounded-xl border shadow-sm space-y-4"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#CBD5E1", color: "#0F172A" }}
    >
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "#CBD5E1" }}>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Pending Inspection Queue ({orders.length})
          </h2>
          <p className="text-xs text-slate-600">
            Select a cutting order to perform physical component counting and quality verification
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
        >
          🔄 Refresh Queue
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="py-12 text-center text-sm font-medium text-slate-500 border border-dashed rounded-lg border-slate-300">
          No orders currently pending verification. Outstanding batches submitted by Cutting Supervisors will appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((ord) => {
            const isSelected = ord.id === selectedOrderId;
            const expectedFabric = ord.targetQty * Number(ord.recipe.stdFabricYards);
            const isReinspection = ord.verificationLogs && ord.verificationLogs.length > 0;

            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => onSelectOrder(ord)}
                className={`p-4 rounded-xl border text-left transition-all space-y-3 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/60 shadow-md ring-1 ring-blue-600"
                    : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span>{ord.orderNo}</span>
                    {isReinspection && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        Re-Inspection
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    Pending QC
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600">
                  <div className="font-semibold text-slate-900">
                    {ord.recipe.name} ({ord.recipe.recipeCode})
                  </div>
                  <div className="flex justify-between">
                    <span>Target Batch: <strong>{ord.targetQty} units</strong></span>
                    <span>Fabric Roll: <strong>{ord.fabricRollId}</strong></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual Fabric: <strong>{Number(ord.actualFabricYds)} yds</strong></span>
                    <span>Expected: <strong>{expectedFabric.toFixed(2)} yds</strong></span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Supervisor: {ord.creator.fullName}</span>
                  <span className="text-blue-600 font-semibold hover:underline">Inspect Batch →</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
