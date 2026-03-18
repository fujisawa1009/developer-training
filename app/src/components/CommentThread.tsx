"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send } from "lucide-react";
import type { CommentFormState } from "@/app/submissions/actions";

type Comment = {
  id: string;
  body: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    role: string;
  };
};

type Props = {
  comments: Comment[];
  action: (
    prevState: CommentFormState,
    formData: FormData,
  ) => Promise<CommentFormState>;
  currentUserId: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  instructor: "講師",
  learner: "受講者",
  hr: "人事",
};

export function CommentThread({ comments, action, currentUserId }: Props) {
  const [state, dispatch, isPending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [prevState, setPrevState] = useState(state);

  // 成功時（state が null に戻った）にフォームをクリア
  if (state !== prevState) {
    setPrevState(state);
    if (state === null && formRef.current) {
      formRef.current.reset();
    }
  }

  return (
    <div className="rounded-lg border bg-white p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-semibold">コメント</h2>
        {comments.length > 0 && (
          <span className="text-xs text-muted-foreground">
            ({comments.length}件)
          </span>
        )}
      </div>

      {/* コメント一覧 */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          まだコメントはありません
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isMe = comment.author.id === currentUserId;
            return (
              <div
                key={comment.id}
                className={`rounded-md border p-3 text-sm ${
                  isMe ? "bg-blue-50/50 border-blue-200" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-medium text-sm">
                    {comment.author.name}
                  </span>
                  <Badge
                    variant={
                      comment.author.role === "learner"
                        ? "secondary"
                        : "default"
                    }
                    className="text-xs"
                  >
                    {ROLE_LABELS[comment.author.role] ?? comment.author.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(comment.createdAt).toLocaleString("ja-JP")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{comment.body}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* 投稿フォーム */}
      <form
        ref={formRef}
        action={dispatch}
        className="space-y-3 pt-2 border-t"
      >
        {state?.message && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {state.message}
          </p>
        )}
        <textarea
          name="body"
          rows={3}
          required
          placeholder="コメントを入力..."
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
          aria-invalid={!!state?.errors?.body}
        />
        {state?.errors?.body && (
          <p className="text-xs text-destructive">
            {state.errors.body.join(", ")}
          </p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending}
            size="sm"
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {isPending ? "送信中..." : "コメントする"}
          </Button>
        </div>
      </form>
    </div>
  );
}
