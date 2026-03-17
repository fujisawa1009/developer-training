"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { SortableRow } from "@/components/sortable-row";
import { useSortableList } from "@/lib/hooks/use-sortable-list";
import { reorderCurriculumItems, removeCurriculumFromPlan } from "../../actions";
import { useTransition } from "react";

type CurriculumItemData = {
  id: string;
  order: number;
  curriculumName: string;
  lessonCount: number;
};

type Props = {
  planId: string;
  initialItems: CurriculumItemData[];
};

export function SortableCurriculumItemTable({ planId, initialItems }: Props) {
  const [isDeleting, startDeleteTransition] = useTransition();

  const reorder = async (orderedIds: string[]) => {
    await reorderCurriculumItems(planId, orderedIds);
  };

  const { items, isPending, handleDragEnd } = useSortableList(initialItems, reorder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  return (
    <div
      className={cn(
        "rounded-lg border bg-white overflow-hidden",
        (isPending || isDeleting) && "opacity-70 pointer-events-none",
      )}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-8" />
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-12">順</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                カリキュラム名
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                レッスン数
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {items.map((item, index) => (
                <SortableRow key={item.id} id={item.id}>
                  <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3 font-medium">{item.curriculumName}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{item.lessonCount} レッスン</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon-sm" }),
                        "text-destructive hover:text-destructive",
                      )}
                      title="プランから削除"
                      onClick={() => {
                        startDeleteTransition(async () => {
                          await removeCurriculumFromPlan(item.id, planId);
                        });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </SortableRow>
              ))}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    </div>
  );
}
