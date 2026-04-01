"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { generateLessonDraft, saveLessonDraft } from "../../../../actions";

type Target = "body" | "description" | "modelAnswer" | "all";
type Difficulty = "beginner" | "intermediate" | "advanced";

type Props = {
  lessonId: string;
  curriculumId: string;
  lessonTitle: string;
  lessonType: "text" | "video" | "assignment";
};

const TARGET_OPTIONS: { value: Target; label: string }[] = [
  { value: "body", label: "本文のみ" },
  { value: "description", label: "練習問題のみ" },
  { value: "modelAnswer", label: "模範解答のみ" },
  { value: "all", label: "すべて" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "初級" },
  { value: "intermediate", label: "中級" },
  { value: "advanced", label: "上級" },
];

export function AiGenerateModal({ lessonId, curriculumId, lessonTitle, lessonType }: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>(lessonType === "assignment" ? "description" : "body");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<{ body?: string; description?: string; modelAnswer?: string } | null>(null);
  const [isGenerating, startGenerate] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    setResult(null);
    startGenerate(async () => {
      try {
        const res = await generateLessonDraft(lessonId, curriculumId, {
          target,
          instruction,
          difficulty,
          lessonTitle,
        });
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "生成中にエラーが発生しました");
      }
    });
  };

  const handleSave = () => {
    if (!result) return;
    startSave(async () => {
      await saveLessonDraft(lessonId, curriculumId, {
        ...(result.body !== undefined && { draftBody: result.body }),
        ...(result.description !== undefined && { draftDescription: result.description }),
        ...(result.modelAnswer !== undefined && { draftModelAnswer: result.modelAnswer }),
        generatedBy: "ai",
      });
      setOpen(false);
      setResult(null);
      setInstruction("");
    });
  };

  const handleDiscard = () => {
    setResult(null);
    setInstruction("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Sparkles className="w-4 h-4 mr-1.5" />
            AI生成
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AIでコンテンツを生成</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-5 pt-2">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            {/* 生成対象 */}
            <div className="space-y-1.5">
              <Label>生成対象</Label>
              <div className="flex flex-wrap gap-2">
                {TARGET_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                      target === opt.value
                        ? "border-ring bg-primary text-primary-foreground"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={target === opt.value}
                      onChange={() => setTarget(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 難易度 */}
            <div className="space-y-1.5">
              <Label>難易度</Label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                      difficulty === opt.value
                        ? "border-ring bg-primary text-primary-foreground"
                        : "border-input hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={difficulty === opt.value}
                      onChange={() => setDifficulty(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 指示 */}
            <div className="space-y-1.5">
              <Label htmlFor="instruction">テーマ・指示</Label>
              <textarea
                id="instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={4}
                placeholder="例: SQLのJOINについて初心者向けに説明して。INNER JOINとLEFT JOINの違いを中心に。"
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
              />
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating || !instruction.trim()} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成する
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <p className="text-sm text-muted-foreground">生成結果を確認してください。下書きとして保存するか破棄できます。</p>

            {result.body !== undefined && (
              <div className="space-y-1.5">
                <Label>本文（プレビュー）</Label>
                <pre className="text-sm bg-gray-50 rounded-lg border p-3 whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
                  {result.body}
                </pre>
              </div>
            )}
            {result.description !== undefined && (
              <div className="space-y-1.5">
                <Label>練習問題説明（プレビュー）</Label>
                <pre className="text-sm bg-gray-50 rounded-lg border p-3 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                  {result.description}
                </pre>
              </div>
            )}
            {result.modelAnswer !== undefined && (
              <div className="space-y-1.5">
                <Label>模範解答（プレビュー）</Label>
                <pre className="text-sm bg-gray-50 rounded-lg border p-3 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                  {result.modelAnswer}
                </pre>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleDiscard} disabled={isSaving}>
                破棄して戻る
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "下書きに保存"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
