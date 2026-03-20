"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { retryAiGrading } from "../../actions";

type Props = {
  submissionId: string;
};

export function RetryAiGradingButton({ submissionId }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await retryAiGrading(submissionId);
        })
      }
      className="gap-1.5"
    >
      <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "AI採点中..." : "AI再採点"}
    </Button>
  );
}
