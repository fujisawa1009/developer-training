"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GroupFormState } from "../actions";

type Props = {
  action: (prevState: GroupFormState, formData: FormData) => Promise<GroupFormState>;
  defaultValues?: { name?: string };
  submitLabel?: string;
};

export function GroupForm({ action, defaultValues, submitLabel = "作成する" }: Props) {
  const [state, dispatch, isPending] = useActionState(action, null);

  return (
    <form action={dispatch} className="space-y-5">
      {state?.message && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {state.message}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">グループ名 *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name ?? ""}
          placeholder="例: システム課、プロジェクトAチーム"
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
