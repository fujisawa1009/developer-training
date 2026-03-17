"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const PERIOD_OPTIONS = [
  { value: "month_1", label: "1ヶ月評価", description: "①社会人基礎" },
  { value: "month_3", label: "3ヶ月評価", description: "③Git / ④プログラミング基礎" },
  { value: "month_6", label: "6ヶ月評価", description: "②IT基礎 / ⑤DB / ⑥Web開発" },
  { value: "month_12", label: "12ヶ月評価", description: "⑦インフラ / ⑧開発プロセス（総合）" },
] as const;

type Props = {
  action: (
    prevState: { error?: string } | null,
    formData: FormData
  ) => Promise<{ error?: string } | null>;
};

export function CreatePeriodForm({ action }: Props) {
  const [state, dispatch, isPending] = useActionState(action, null);

  return (
    <form action={dispatch} className="space-y-4">
      {state?.error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {state.error}
        </p>
      )}

      <div className="space-y-2">
        <Label>評価タイプ *</Label>
        <div className="grid grid-cols-2 gap-3">
          {PERIOD_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex flex-col gap-0.5 px-4 py-3 rounded-lg border-2 border-input cursor-pointer hover:bg-blue-50 hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-colors"
            >
              <input
                type="radio"
                name="type"
                value={opt.value}
                className="sr-only"
                required
              />
              <span className="font-medium text-sm">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "開始中..." : "評価タイミングを開始する"}
      </Button>
    </form>
  );
}
