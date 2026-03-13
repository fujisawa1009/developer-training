"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "../actions";

type LessonType = "text" | "video" | "assignment";
type AssignmentType = "git" | "sql" | "program" | "debug";

type Props = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
};

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  text: "テキスト",
  video: "動画",
  assignment: "課題",
};

const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  git: "Git",
  sql: "SQL",
  program: "プログラミング",
  debug: "デバッグ",
};

export function LessonForm({ action }: Props) {
  const [state, dispatch, isPending] = useActionState(action, null);
  const [lessonType, setLessonType] = useState<LessonType>("text");

  return (
    <form action={dispatch} className="space-y-5">
      {state?.message && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {state.message}
        </p>
      )}

      {/* レッスンタイプ */}
      <div className="space-y-1.5">
        <Label htmlFor="type">レッスンタイプ *</Label>
        <div className="flex gap-2">
          {(["text", "video", "assignment"] as LessonType[]).map((t) => (
            <label
              key={t}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                lessonType === t
                  ? "border-ring bg-primary text-primary-foreground"
                  : "border-input hover:bg-muted"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t}
                checked={lessonType === t}
                onChange={() => setLessonType(t)}
                className="sr-only"
              />
              {LESSON_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
      </div>

      {/* 共通フィールド */}
      <div className="space-y-1.5">
        <Label htmlFor="title">タイトル *</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="例: Gitとは何か"
          aria-invalid={!!state?.errors?.title}
        />
        {state?.errors?.title && (
          <p className="text-xs text-destructive">{state.errors.title.join(", ")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">スラッグ *</Label>
        <Input
          id="slug"
          name="slug"
          required
          placeholder="例: 01-what-is-git"
          aria-invalid={!!state?.errors?.slug}
        />
        <p className="text-xs text-muted-foreground">英小文字・数字・ハイフンのみ（例: 01-intro）</p>
        {state?.errors?.slug && (
          <p className="text-xs text-destructive">{state.errors.slug.join(", ")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="order">表示順</Label>
        <Input id="order" name="order" type="number" min="0" defaultValue="0" className="w-32" />
      </div>

      {/* テキストレッスン */}
      {lessonType === "text" && (
        <div className="space-y-1.5">
          <Label htmlFor="body">本文（Markdown）*</Label>
          <textarea
            id="body"
            name="body"
            rows={12}
            placeholder="## 見出し&#10;&#10;本文をMarkdownで記述..."
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-mono outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
            aria-invalid={!!state?.errors?.body}
          />
          {state?.errors?.body && (
            <p className="text-xs text-destructive">{state.errors.body.join(", ")}</p>
          )}
        </div>
      )}

      {/* 動画レッスン */}
      {lessonType === "video" && (
        <div className="space-y-1.5">
          <Label htmlFor="videoUrl">動画URL *</Label>
          <Input
            id="videoUrl"
            name="videoUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            aria-invalid={!!state?.errors?.videoUrl}
          />
          {state?.errors?.videoUrl && (
            <p className="text-xs text-destructive">{state.errors.videoUrl.join(", ")}</p>
          )}
        </div>
      )}

      {/* 課題レッスン */}
      {lessonType === "assignment" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assignmentType">課題タイプ *</Label>
            <select
              id="assignmentType"
              name="assignmentType"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors"
            >
              {(["git", "sql", "program", "debug"] as AssignmentType[]).map((t) => (
                <option key={t} value={t}>
                  {ASSIGNMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {state?.errors?.assignmentType && (
              <p className="text-xs text-destructive">{state.errors.assignmentType.join(", ")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assignmentDescription">課題説明 *</Label>
            <textarea
              id="assignmentDescription"
              name="assignmentDescription"
              rows={6}
              placeholder="課題の内容と要件を記述..."
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
              aria-invalid={!!state?.errors?.assignmentDescription}
            />
            {state?.errors?.assignmentDescription && (
              <p className="text-xs text-destructive">
                {state.errors.assignmentDescription.join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "追加中..." : "レッスンを追加"}
      </Button>
    </form>
  );
}
