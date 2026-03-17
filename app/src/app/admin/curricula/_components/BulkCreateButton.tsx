"use client";

import { useTransition } from "react";
import { bulkCreateCurricula } from "../actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Layers } from "lucide-react";

export function BulkCreateButton() {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await bulkCreateCurricula();
      if (result?.message) {
        alert(result.message);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(buttonVariants({ variant: "outline" }))}
    >
      <Layers className="w-4 h-4 mr-1.5" />
      {isPending ? "作成中..." : "テンプレートから一括作成"}
    </button>
  );
}
