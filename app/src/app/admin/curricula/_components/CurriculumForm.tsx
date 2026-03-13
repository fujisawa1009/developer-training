"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "../actions";

type Props = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: {
    name?: string;
    slug?: string;
    description?: string;
    order?: number;
  };
  submitLabel?: string;
};

export function CurriculumForm({ action, defaultValues, submitLabel = "保存する" }: Props) {
  const [state, dispatch, isPending] = useActionState(action, null);

  return (
    <form action={dispatch} className="space-y-5">
      {state?.message && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {state.message}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">カリキュラム名 *</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="例: Git入門"
          defaultValue={defaultValues?.name}
          aria-invalid={!!state?.errors?.name}
        />
        {state?.errors?.name && (
          <p className="text-xs text-destructive">{state.errors.name.join(", ")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">スラッグ *</Label>
        <Input
          id="slug"
          name="slug"
          required
          placeholder="例: git-basics"
          defaultValue={defaultValues?.slug}
          aria-invalid={!!state?.errors?.slug}
        />
        <p className="text-xs text-muted-foreground">英小文字・数字・ハイフンのみ（例: git-basics）</p>
        {state?.errors?.slug && (
          <p className="text-xs text-destructive">{state.errors.slug.join(", ")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">説明</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="カリキュラムの概要..."
          defaultValue={defaultValues?.description}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="order">表示順</Label>
        <Input
          id="order"
          name="order"
          type="number"
          min="0"
          defaultValue={defaultValues?.order ?? 0}
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">数値が小さいほど先に表示されます</p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中..." : submitLabel}
      </Button>
    </form>
  );
}
