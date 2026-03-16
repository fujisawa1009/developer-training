"use client";

import { useTransition, useState, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addCurriculumToPlan } from "../../actions";

type Curriculum = { id: string; name: string };

type Props = {
  planId:    string;
  curricula: Curriculum[];
};

export function AddCurriculumForm({ planId, curricula }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleAdd = () => {
    const curriculumId = selectRef.current?.value;
    if (!curriculumId) return;
    setError(null);
    startTransition(async () => {
      const result = await addCurriculumToPlan(planId, curriculumId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <select
          ref={selectRef}
          className="flex-1 rounded-lg border border-input bg-white px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
          defaultValue=""
        >
          <option value="" disabled>
            追加するカリキュラムを選択...
          </option>
          {curricula.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button onClick={handleAdd} disabled={isPending} size="sm" className="shrink-0">
          <Plus className="w-4 h-4 mr-1" />
          {isPending ? "追加中..." : "追加"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
