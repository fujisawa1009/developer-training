"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { GradeFormState } from "../../actions";

type Review = {
  passed: boolean | null;
  instructorComment: string | null;
} | null;

type Props = {
  action: (prevState: GradeFormState, formData: FormData) => Promise<GradeFormState>;
  existingReview?: Review;
};

export function GradeForm({ action, existingReview }: Props) {
  const [state, dispatch, isPending] = useActionState(action, null);

  return (
    <form action={dispatch} className="space-y-5">
      {state?.message && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {state.message}
        </p>
      )}

      {/* 合否 */}
      <div className="space-y-2">
        <Label>判定 *</Label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-input cursor-pointer hover:bg-green-50 hover:border-green-400 has-[:checked]:border-green-500 has-[:checked]:bg-green-50 transition-colors">
            <input
              type="radio"
              name="passed"
              value="true"
              className="accent-green-600"
              defaultChecked={existingReview?.passed === true}
              required
            />
            <span className="font-medium text-green-700">合格</span>
            <span className="text-xs text-muted-foreground">次のレッスンへ進める</span>
          </label>
          <label className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-input cursor-pointer hover:bg-red-50 hover:border-red-400 has-[:checked]:border-red-500 has-[:checked]:bg-red-50 transition-colors">
            <input
              type="radio"
              name="passed"
              value="false"
              className="accent-red-600"
              defaultChecked={existingReview?.passed === false}
            />
            <span className="font-medium text-red-700">不合格</span>
            <span className="text-xs text-muted-foreground">再提出が必要</span>
          </label>
        </div>
        {state?.errors?.passed && (
          <p className="text-xs text-destructive">{state.errors.passed.join(", ")}</p>
        )}
      </div>

      {/* コメント */}
      <div className="space-y-1.5">
        <Label htmlFor="instructorComment">フィードバックコメント *</Label>
        <textarea
          id="instructorComment"
          name="instructorComment"
          rows={5}
          required
          defaultValue={existingReview?.instructorComment || ""}
          placeholder="採点理由・改善点・良かった点などを記入してください..."
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
          aria-invalid={!!state?.errors?.instructorComment}
        />
        {state?.errors?.instructorComment && (
          <p className="text-xs text-destructive">{state.errors.instructorComment.join(", ")}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "採点中..." : existingReview ? "再採点を確定する" : "採点を確定する"}
      </Button>
    </form>
  );
}
