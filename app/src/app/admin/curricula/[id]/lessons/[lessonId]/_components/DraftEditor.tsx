"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { saveLessonDraft } from "../../../../actions";

type Props = {
  lessonId: string;
  curriculumId: string;
  lessonType: "text" | "video" | "assignment";
  draftBody?: string | null;
  draftDescription?: string | null;
  draftModelAnswer?: string | null;
};

export function DraftEditor({
  lessonId,
  curriculumId,
  lessonType,
  draftBody,
  draftDescription,
  draftModelAnswer,
}: Props) {
  const [body, setBody] = useState(draftBody ?? "");
  const [description, setDescription] = useState(draftDescription ?? "");
  const [modelAnswer, setModelAnswer] = useState(draftModelAnswer ?? "");
  const [isSaving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    startSave(async () => {
      await saveLessonDraft(lessonId, curriculumId, {
        ...(lessonType === "text" && { draftBody: body || null }),
        ...(lessonType !== "video" && { draftDescription: description || null }),
        ...(lessonType !== "video" && { draftModelAnswer: modelAnswer || null }),
        generatedBy: "human",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      {lessonType === "text" && (
        <div className="space-y-1.5">
          <Label htmlFor="draftBody">本文（下書き）</Label>
          <textarea
            id="draftBody"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="Markdownで本文を記述..."
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-mono outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
          />
        </div>
      )}

      {lessonType !== "video" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="draftDescription">練習問題説明（下書き）</Label>
            <textarea
              id="draftDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="課題の内容と要件を記述..."
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="draftModelAnswer">模範解答（下書き）</Label>
            <textarea
              id="draftModelAnswer"
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              rows={6}
              placeholder="期待する回答例を記述..."
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1.5" />
              下書きを保存
            </>
          )}
        </Button>
        {saved && <span className="text-sm text-green-600">保存しました</span>}
      </div>
    </div>
  );
}
