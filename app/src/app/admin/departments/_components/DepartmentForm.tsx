"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DepartmentFormState } from "../actions";

type Props = {
  action: (prevState: DepartmentFormState, formData: FormData) => Promise<DepartmentFormState>;
  defaultValues?: { name?: string };
  submitLabel?: string;
};

export function DepartmentForm({ action, defaultValues, submitLabel = "作成する" }: Props) {
  const [state, dispatch, isPending] = useActionState(action, null);

  return (
    <form action={dispatch} className="space-y-5">
      {state?.message && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {state.message}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">部署名 *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name ?? ""}
          placeholder="例: 開発部"
          aria-invalid={!!state?.errors?.name}
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name.join(", ")}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "処理中..." : submitLabel}
      </Button>
    </form>
  );
}
