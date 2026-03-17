"use client";

import { useState, useTransition } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { saveInstructorEvaluations, type InstructorEvalItem } from "../actions";

type Rating = "S" | "A" | "B" | "C";

const RATING_SCORE: Record<Rating, number> = { S: 4, A: 3, B: 2, C: 1 };

const RATING_STYLES: Record<Rating, string> = {
  S: "border-purple-500 bg-purple-50 text-purple-700",
  A: "border-blue-500 bg-blue-50 text-blue-700",
  B: "border-green-500 bg-green-50 text-green-700",
  C: "border-yellow-500 bg-yellow-50 text-yellow-700",
};

function GapBadge({ self, instructor }: { self: Rating | null; instructor: Rating | null }) {
  if (!self || !instructor) return null;
  const diff = RATING_SCORE[self] - RATING_SCORE[instructor];
  if (diff > 0)
    return (
      <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
        ↑ 過大評価
      </span>
    );
  if (diff < 0)
    return (
      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
        ↓ 過小評価
      </span>
    );
  return (
    <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
      ✓ 一致
    </span>
  );
}

type ChecklistItemData = {
  id: string;
  title: string;
  order: number;
  selfRating: Rating | null;
  selfComment: string | null;
  existingInstructorRating: Rating | null;
  existingInstructorComment: string | null;
};

type CategoryData = {
  id: string;
  name: string;
  order: number;
  items: ChecklistItemData[];
};

type ItemState = { rating: Rating | null; comment: string };

type Props = {
  periodId: string;
  learnerId: string;
  categories: CategoryData[];
};

export function InstructorEvaluationForm({ periodId, learnerId, categories }: Props) {
  const initialState: Record<string, ItemState> = {};
  for (const cat of categories) {
    for (const item of cat.items) {
      initialState[item.id] = {
        rating: item.existingInstructorRating,
        comment: item.existingInstructorComment ?? "",
      };
    }
  }

  const [state, setState] = useState(initialState);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(categories.length > 0 ? [categories[0].id] : [])
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const totalItems = Object.keys(state).length;
  const ratedItems = Object.values(state).filter((v) => v.rating !== null).length;

  // ギャップサマリ
  let overEval = 0,
    underEval = 0,
    matched = 0;
  for (const cat of categories) {
    for (const item of cat.items) {
      const selfR = item.selfRating;
      const instR = state[item.id]?.rating;
      if (!selfR || !instR) continue;
      const diff = RATING_SCORE[selfR] - RATING_SCORE[instR];
      if (diff > 0) overEval++;
      else if (diff < 0) underEval++;
      else matched++;
    }
  }

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const setRating = (itemId: string, rating: Rating) => {
    setState((prev) => ({ ...prev, [itemId]: { ...prev[itemId], rating } }));
  };

  const setComment = (itemId: string, comment: string) => {
    setState((prev) => ({ ...prev, [itemId]: { ...prev[itemId], comment } }));
  };

  const handleSubmit = () => {
    const items: InstructorEvalItem[] = Object.entries(state)
      .filter(([, v]) => v.rating !== null)
      .map(([checklistItemId, v]) => ({
        checklistItemId,
        rating: v.rating!,
        comment: v.comment,
      }));

    startTransition(async () => {
      const result = await saveInstructorEvaluations(periodId, learnerId, items);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `${items.length}項目の講師評価を保存しました` });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* 進捗バー */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">評価進捗</span>
          <span className="text-sm font-semibold">
            {ratedItems} / {totalItems} 項目
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${totalItems > 0 ? (ratedItems / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* ギャップサマリ（評価入力後に表示） */}
      {(overEval + underEval + matched) > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-medium mb-3">ギャップサマリ（現在の入力値）</p>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-2xl font-bold text-green-700">{matched}</p>
              <p className="text-xs text-green-600 mt-0.5">✓ 一致</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-2xl font-bold text-red-700">{overEval}</p>
              <p className="text-xs text-red-600 mt-0.5">↑ 過大評価</p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-2xl font-bold text-blue-700">{underEval}</p>
              <p className="text-xs text-blue-600 mt-0.5">↓ 過小評価</p>
            </div>
          </div>
        </div>
      )}

      {/* メッセージ */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" && <CheckCircle2 className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* カテゴリ別 */}
      {categories.map((cat) => {
        const isOpen = openCategories.has(cat.id);
        const catRated = cat.items.filter((item) => state[item.id]?.rating !== null).length;

        return (
          <div key={cat.id} className="rounded-lg border bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {catRated === cat.items.length ? (
                  <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                )}
                <span className="font-medium text-sm">{cat.name}</span>
                <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                  {catRated}/{cat.items.length}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="border-t divide-y">
                {cat.items.map((item) => {
                  const instState = state[item.id];
                  return (
                    <div key={item.id} className="px-5 py-4">
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-xs text-muted-foreground pt-1 w-6 shrink-0 text-right">
                          {item.order}.
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-2">{item.title}</p>

                          {/* 自己評価（読み取り専用） */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-muted-foreground w-20">受講者評価:</span>
                            {item.selfRating ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex w-7 h-7 items-center justify-center text-xs font-bold rounded-md border-2 ${RATING_STYLES[item.selfRating]}`}
                                >
                                  {item.selfRating}
                                </span>
                                {item.selfComment && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.selfComment}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">未入力</span>
                            )}
                          </div>

                          {/* 講師評価入力 */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-20">講師評価:</span>
                            <div className="flex items-center gap-1.5">
                              {(["S", "A", "B", "C"] as Rating[]).map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setRating(item.id, r)}
                                  className={`w-8 h-8 text-xs font-bold rounded-md border-2 transition-colors ${
                                    instState?.rating === r
                                      ? RATING_STYLES[r]
                                      : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                              {instState?.rating && item.selfRating && (
                                <GapBadge self={item.selfRating} instructor={instState.rating} />
                              )}
                            </div>
                          </div>

                          {instState?.rating && (
                            <input
                              type="text"
                              placeholder="コメント（任意）"
                              value={instState.comment}
                              onChange={(e) => setComment(item.id, e.target.value)}
                              className="mt-2 ml-[88px] w-[calc(100%-88px)] text-xs border rounded-md px-2.5 py-1.5 bg-gray-50 placeholder:text-muted-foreground focus:outline-none focus:border-orange-400"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* 保存ボタン */}
      <div className="sticky bottom-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || ratedItems === 0}
          className="w-full py-3 bg-orange-600 text-white rounded-xl font-medium text-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {isPending ? "保存中..." : `${ratedItems}項目の講師評価を保存する`}
        </button>
      </div>
    </div>
  );
}
