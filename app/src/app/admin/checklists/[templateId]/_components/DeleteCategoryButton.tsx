"use client";

import { useActionState } from "react";
import { deleteCategory } from "../actions";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export function DeleteCategoryButton({
  id,
  templateId,
  name,
}: {
  id: string;
  templateId: string;
  name: string;
}) {
  const action = deleteCategory.bind(null, id, templateId);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm(`カテゴリ「${name}」を削除しますか？配下の項目もすべて削除されます。`)) {
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
