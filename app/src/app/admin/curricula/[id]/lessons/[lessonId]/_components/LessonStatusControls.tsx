"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { publishLesson, unpublishLesson } from "../../../../actions";

type Props = {
  lessonId: string;
  curriculumId: string;
  status: "published" | "draft";
};

export function LessonStatusControls({ lessonId, curriculumId, status }: Props) {
  const [isPending, startTransition] = useTransition();

  if (status === "published") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(() => unpublishLesson(lessonId, curriculumId))
        }
      >
        <EyeOff className="w-4 h-4 mr-1.5" />
        {isPending ? "処理中..." : "一時非公開にして編集"}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(() => publishLesson(lessonId, curriculumId))
      }
    >
      <Eye className="w-4 h-4 mr-1.5" />
      {isPending ? "処理中..." : "公開する"}
    </Button>
  );
}
