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
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { FileText, Film, ClipboardList, SquarePen, Trash2, Eye } from "lucide-react";
import { SortableRow } from "@/components/sortable-row";
import { useSortableList } from "@/lib/hooks/use-sortable-list";
import { reorderLessons, deleteLesson } from "../../actions";
import { useTransition } from "react";

const LESSON_TYPE_ICONS = {
  text: FileText,
  video: Film,
  assignment: ClipboardList,
};

const LESSON_TYPE_LABELS = {
  text: "テキスト",
  video: "動画",
  assignment: "課題",
};

type Lesson = {
  id: string;
  order: number;
  title: string;
  type: "text" | "video" | "assignment";
  slug: string;
};

type Props = {
  curriculumId: string;
  initialLessons: Lesson[];
};

export function SortableLessonTable({ curriculumId, initialLessons }: Props) {
  const [isDeleting, startDeleteTransition] = useTransition();

  const reorder = async (orderedIds: string[]) => {
    await reorderLessons(curriculumId, orderedIds);
  };

  const { items, isPending, handleDragEnd } = useSortableList(initialLessons, reorder);

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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8" />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">順</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">タイトル</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">タイプ</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">スラッグ</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <SortableContext items={items.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {items.map((lesson, index) => {
                const Icon = LESSON_TYPE_ICONS[lesson.type];
                return (
                  <SortableRow key={lesson.id} id={lesson.id}>
                    <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{lesson.title}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="gap-1">
                        <Icon className="w-3 h-3" />
                        {LESSON_TYPE_LABELS[lesson.type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {lesson.slug}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/curricula/${curriculumId}/lessons/${lesson.id}`}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                          title="表示"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/curricula/${curriculumId}/lessons/${lesson.id}/edit`}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                          title="編集"
                        >
                          <SquarePen className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                            "text-destructive hover:text-destructive",
                          )}
                          title="削除"
                          onClick={() => {
                            startDeleteTransition(async () => {
                              await deleteLesson(lesson.id, curriculumId);
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </SortableRow>
                );
              })}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    </div>
  );
}
