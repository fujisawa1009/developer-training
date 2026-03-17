"use client";

import { useActionState } from "react";
import { deleteItem } from "../actions";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export function DeleteItemButton({
  id,
  catId,
  templateId,
  title,
}: {
  id: string;
  catId: string;
  templateId: string;
  title: string;
}) {
  const action = deleteItem.bind(null, id, catId, templateId);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm(`項目「${title}」を削除しますか？`)) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          disabled={pending}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-red-500 hover:text-red-700 hover:bg-red-50"
          )}
          title="削除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </form>
      {state?.message && (
        <p className="text-xs text-red-600 mt-1 max-w-48">{state.message}</p>
      )}
    </div>
  );
}
