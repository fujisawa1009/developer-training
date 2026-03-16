"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlanFormState } from "../actions";

type Props = {
  action:       (prevState: PlanFormState, formData: FormData) => Promise<PlanFormState>;
  defaultValues?: { name?: string; description?: string };
  submitLabel?: string;
};

export function PlanForm({ action, defaultValues, submitLabel = "作成する" }: Props) {
  const [state, dispatch, isPending] = useActionState(action, null);

  return (
    <form action={dispatch} className="space-y-5">
      {state?.message && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {state.message}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">プラン名 *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name ?? ""}
          placeholder="例: 新卒エンジニア基礎コース"
          aria-invalid={!!state?.errors?.name}
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name.join(", ")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">説明</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="このカリキュラムプランの目的や対象者を記述..."
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "処理中..." : submitLabel}
      </Button>
    </form>
  );
}
