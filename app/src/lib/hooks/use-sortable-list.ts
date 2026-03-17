"use client";

import { useState, useTransition, useCallback } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";

type SortableItem = { id: string };

export function useSortableList<T extends SortableItem>(
  initialItems: T[],
  reorderAction: (orderedIds: string[]) => Promise<void>,
) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(prev, oldIndex, newIndex);

        startTransition(async () => {
          await reorderAction(reordered.map((i) => i.id));
        });

        return reordered;
      });
    },
    [reorderAction, startTransition],
  );

  return { items, isPending, handleDragEnd };
}
