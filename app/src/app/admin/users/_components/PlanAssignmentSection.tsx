"use client";

import { useTransition, useState, useRef } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assignPlanToUser, unassignPlanFromUser } from "../../curriculum-plans/actions";

type Plan = { id: string; name: string };

type Props = {
  userId:          string;
  assignedPlans:   Plan[];
  availablePlans:  Plan[];
};

export function PlanAssignmentSection({ userId, assignedPlans, availablePlans }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleAssign = () => {
    const planId = selectRef.current?.value;
    if (!planId) return;
    setError(null);
    startTransition(async () => {
      const result = await assignPlanToUser(userId, planId);
      if (result.error) setError(result.error);
      else if (selectRef.current) selectRef.current.value = "";
    });
  };

  const handleUnassign = (planId: string) => {
    startTransition(async () => {
      await unassignPlanFromUser(userId, planId);
    });
  };

  return (
    <div className="space-y-3">
      {/* 割り当て済みプラン */}
      {assignedPlans.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだプランが割り当てられていません</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assignedPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center gap-1 rounded-md border bg-gray-50 px-2.5 py-1.5 text-sm"
            >
              <span>{plan.name}</span>
              <button
                onClick={() => handleUnassign(plan.id)}
                disabled={isPending}
                className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                title="割り当て解除"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* プラン追加 */}
      {availablePlans.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <select
              ref={selectRef}
              defaultValue=""
              className="flex-1 rounded-lg border border-input bg-white px-2.5 py-2 text-sm outline-none focus-visible:border-ring transition-colors"
            >
              <option value="" disabled>
                追加するプランを選択...
              </option>
              {availablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button onClick={handleAssign} disabled={isPending} size="sm" className="shrink-0">
              <Plus className="w-4 h-4 mr-1" />
              {isPending ? "処理中..." : "割り当て"}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      {availablePlans.length === 0 && assignedPlans.length > 0 && (
        <p className="text-xs text-muted-foreground">すべてのプランが割り当て済みです</p>
      )}
    </div>
  );
}
