"use client";

import { useTransition, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { deleteGroup } from "../actions";

type Props = {
  groupId: string;
  groupName: string;
};

export function DeleteGroupButton({ groupId, groupName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm(`「${groupName}」を削除してもよいですか？\nこの操作は元に戻せません。`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteGroup(groupId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-destructive hover:text-destructive hover:bg-destructive/10"
        )}
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {error && (
        <p className="text-xs text-destructive max-w-[260px] text-right leading-tight">{error}</p>
      )}
    </div>
  );
}
