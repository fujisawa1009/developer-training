"use client";

import { useTransition, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { deletePlan } from "../../actions";

type Props = {
  planId:   string;
  planName: string;
};

export function DeletePlanButton({ planId, planName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm(`「${planName}」を削除してもよいですか？\nこの操作は元に戻せません。`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePlan(planId);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "text-destructive hover:text-destructive hover:border-destructive"
        )}
      >
        <Trash2 className="w-3.5 h-3.5 mr-1" />
        {isPending ? "削除中..." : "削除"}
      </button>
      {error && (
        <p className="text-xs text-destructive max-w-[260px] text-right leading-tight">{error}</p>
      )}
    </div>
  );
}
