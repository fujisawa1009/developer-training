"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

type Props = {
  action: () => Promise<void>;
  label?: string;
};

export function CompleteLessonButton({ action, label = "このレッスンを完了する" }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      onClick={() => startTransition(() => action())}
      disabled={isPending}
      className="gap-2"
    >
      <CheckCircle2 className="w-4 h-4" />
      {isPending ? "処理中..." : label}
    </Button>
  );
}
