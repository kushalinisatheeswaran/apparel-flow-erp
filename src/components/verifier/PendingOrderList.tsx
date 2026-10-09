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
      imageUrl?: string | null;
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
      imageUrl?: string | null;
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
    <div className="p-6 rounded-xl border border-slate-200 shadow-sm bg-white text-slate-900 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <span>Pending Inspection Queue</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {orders.length} {orders.length === 1 ? "Batch" : "Batches"}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Select a submitted cutting batch to perform physical piece-level verification and quality checks.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Queue
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center text-sm font-medium text-slate-500 border-2 border-dashed rounded-xl border-slate-200 bg-slate-50/50 space-y-2">
          <div className="text-3xl">📋</div>
          <div className="font-semibold text-slate-700">No orders pending inspection</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Outstanding garment production batches submitted by Cutting Supervisors will automatically appear in this queue.
          </p>
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
                className={`p-5 rounded-xl border text-left transition-all space-y-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/70 shadow-md ring-1 ring-blue-600"
                    : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50/60 shadow-2xs hover:shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="font-mono">Order #{ord.orderNo}</span>
                    {isReinspection && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Re-Inspection
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Pending QC
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-slate-600 bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">
                    {ord.recipe.name} <span className="font-normal text-slate-500 font-mono">({ord.recipe.recipeCode})</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Target Batch: <strong className="text-slate-900">{ord.targetQty} units</strong></span>
                    <span>Fabric Roll: <strong className="text-slate-900">{ord.fabricRollId}</strong></span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Actual Fabric: <strong className="text-slate-900">{Number(ord.actualFabricYds).toFixed(2)} yds</strong></span>
                    <span>Expected: <strong className="text-slate-900">{expectedFabric.toFixed(2)} yds</strong></span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Supervisor: <strong className="text-slate-700">{ord.creator.fullName}</strong></span>
                  <span className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                    Inspect Batch <span>→</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
