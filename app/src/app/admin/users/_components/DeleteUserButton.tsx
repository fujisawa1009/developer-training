"use client";

import { useTransition, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { deleteUser } from "../actions";

type Props = {
  userId: string;
  userName: string;
  isSelf: boolean;
};

export function DeleteUserButton({ userId, userName, isSelf }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isSelf) {
    return (
      <button
        disabled
        title="自分自身は削除できません"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground cursor-not-allowed opacity-40"
        )}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  }

  const handleDelete = () => {
    if (!confirm(`「${userName}」を削除してもよいですか？\nこの操作は元に戻せません。`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(userId);
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
        <p className="text-xs text-destructive max-w-[200px] text-right leading-tight">{error}</p>
      )}
    </div>
  );
}
