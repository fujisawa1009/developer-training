"use client";

import { useActionState } from "react";
import { createItem } from "../actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export function CreateItemForm({
  catId,
  templateId,
}: {
  catId: string;
  templateId: string;
}) {
  const action = createItem.bind(null, catId, templateId);
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <input
            type="text"
            name="title"
            placeholder="項目名（例：挨拶・礼儀が適切にできる）"
            required
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state?.errors?.title && (
            <p className="text-xs text-red-600">{state.errors.title[0]}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
        >
          {pending ? "追加中..." : "追加"}
        </button>
      </form>
      {state?.message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {state.message}
        </p>
      )}
    </div>
  );
}
