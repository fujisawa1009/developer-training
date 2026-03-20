"use client";

import { Bot, AlertTriangle, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AiScoreData = {
  recommendation: "pass" | "fail";
  score: number;
};

type AiCommentData = {
  comment: string;
  aiGeneratedSuspicion: {
    level: "low" | "medium" | "high";
    reason: string;
  };
  details: Array<{
    criteria: string;
    result: "pass" | "fail" | "warning";
    note: string;
  }>;
};

type Props = {
  aiScore: string | null;
  aiComment: string | null;
};

const SUSPICION_STYLES = {
  low: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", label: "低" },
  medium: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", label: "中" },
  high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "高" },
} as const;

const RESULT_ICON = {
  pass: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  fail: <XCircle className="w-4 h-4 text-red-600" />,
  warning: <AlertCircle className="w-4 h-4 text-yellow-600" />,
} as const;

export function AiGradingDisplay({ aiScore, aiComment }: Props) {
  if (!aiScore && !aiComment) return null;

  let scoreData: AiScoreData | null = null;
  let commentData: AiCommentData | null = null;

  try {
    if (aiScore) scoreData = JSON.parse(aiScore);
    if (aiComment) commentData = JSON.parse(aiComment);
  } catch {
    return (
      <div className="rounded-lg border bg-white p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold">AI採点結果</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          AI採点データの解析に失敗しました。
        </p>
        {aiScore && (
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{aiScore}</pre>
        )}
        {aiComment && (
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{aiComment}</pre>
        )}
      </div>
    );
  }

  const suspicion = commentData?.aiGeneratedSuspicion;
  const suspicionStyle = suspicion ? SUSPICION_STYLES[suspicion.level] : null;

  return (
    <div className="rounded-lg border bg-white p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-purple-600" />
        <h2 className="font-semibold">AI採点結果</h2>
      </div>

      {/* スコアと推奨 */}
      {scoreData && (
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold">
            {scoreData.score}
            <span className="text-base font-normal text-muted-foreground">/100</span>
          </div>
          <Badge
            variant={scoreData.recommendation === "pass" ? "default" : "destructive"}
          >
            {scoreData.recommendation === "pass" ? "合格推奨" : "不合格推奨"}
          </Badge>
        </div>
      )}

      {/* AIコメント */}
      {commentData?.comment && (
        <div className="rounded-md bg-purple-50 border border-purple-200 p-3 text-sm">
          {commentData.comment}
        </div>
      )}

      {/* 評価基準の詳細 */}
      {commentData?.details && commentData.details.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">評価基準の内訳</p>
          <div className="space-y-1.5">
            {commentData.details.map((detail, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {RESULT_ICON[detail.result]}
                <div>
                  <span className="font-medium">{detail.criteria}</span>
                  <span className="text-muted-foreground ml-2">{detail.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI生成の疑い */}
      {suspicion && suspicion.level !== "low" && suspicionStyle && (
        <div className={`rounded-md ${suspicionStyle.bg} ${suspicionStyle.border} border p-3 text-sm space-y-1`}>
          <div className={`flex items-center gap-1.5 font-medium ${suspicionStyle.text}`}>
            <AlertTriangle className="w-4 h-4" />
            AI生成回答の疑い: {suspicionStyle.label}
          </div>
          <p className={suspicionStyle.text}>{suspicion.reason}</p>
        </div>
      )}
    </div>
  );
}
