"use client";

import { useActionState } from "react";
import { createTemplate } from "../actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export function CreateTemplateForm() {
  const [state, action, pending] = useActionState(createTemplate, null);

  return (
    <form action={action} className="flex items-start gap-3">
      <div className="flex-1 space-y-1">
        <input
          type="text"
          name="name"
          placeholder="テンプレート名（例：新卒研修チェックリスト）"
          required
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state?.errors?.name && (
          <p className="text-xs text-red-600">{state.errors.name[0]}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
      >
        {pending ? "作成中..." : "作成"}
      </button>
    </form>
  );
}
