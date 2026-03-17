"use client";

import { useState, useTransition } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { saveSelfEvaluations, type SelfEvalItem } from "../actions";

type Rating = "S" | "A" | "B" | "C";

type ChecklistItemData = {
  id: string;
  title: string;
  order: number;
  existingRating: Rating | null;
  existingComment: string | null;
};

type CategoryData = {
  id: string;
  name: string;
  order: number;
  items: ChecklistItemData[];
};

type Props = {
  periodId: string;
  categories: CategoryData[];
};

type ItemState = { rating: Rating | null; comment: string };

const RATING_STYLES: Record<Rating, string> = {
  S: "border-purple-500 bg-purple-50 text-purple-700",
  A: "border-blue-500 bg-blue-50 text-blue-700",
  B: "border-green-500 bg-green-50 text-green-700",
  C: "border-yellow-500 bg-yellow-50 text-yellow-700",
};

const RATING_DESCRIPTIONS: Record<Rating, string> = {
  S: "指導なしで実行・他に教えられる",
  A: "ほぼ自力で実行可能",
  B: "説明を受ければできる",
  C: "理解不足・再教育必要",
};

export function SelfEvaluationForm({ periodId, categories }: Props) {
  const initialState: Record<string, ItemState> = {};
  for (const cat of categories) {
    for (const item of cat.items) {
      initialState[item.id] = {
        rating: item.existingRating,
        comment: item.existingComment ?? "",
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
    const items: SelfEvalItem[] = Object.entries(state)
      .filter(([, v]) => v.rating !== null)
      .map(([checklistItemId, v]) => ({
        checklistItemId,
        rating: v.rating!,
        comment: v.comment,
      }));

    startTransition(async () => {
      const result = await saveSelfEvaluations(periodId, items);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `${items.length}項目の自己評価を保存しました` });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* 進捗バー */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">入力進捗</span>
          <span className="text-sm font-semibold">
            {ratedItems} / {totalItems} 項目
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${totalItems > 0 ? (ratedItems / totalItems) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 評価基準説明 */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {(["S", "A", "B", "C"] as Rating[]).map((r) => (
          <div key={r} className={`rounded-md border-2 px-3 py-2 ${RATING_STYLES[r]}`}>
            <p className="font-bold mb-0.5">{r}</p>
            <p className="opacity-80">{RATING_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </div>

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

      {/* カテゴリ別チェックリスト */}
      {categories.map((cat) => {
        const isOpen = openCategories.has(cat.id);
        const catRated = cat.items.filter((item) => state[item.id]?.rating !== null).length;
        const catComplete = catRated === cat.items.length;

        return (
          <div key={cat.id} className="rounded-lg border bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {catComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
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
                  const itemState = state[item.id];
                  return (
                    <div key={item.id} className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-muted-foreground pt-2 w-6 shrink-0 text-right">
                          {item.order}.
                        </span>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm">{item.title}</span>
                            <div className="flex gap-1 shrink-0">
                              {(["S", "A", "B", "C"] as Rating[]).map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setRating(item.id, r)}
                                  className={`w-8 h-8 text-xs font-bold rounded-md border-2 transition-colors ${
                                    itemState?.rating === r
                                      ? RATING_STYLES[r]
                                      : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                          {itemState?.rating && (
                            <input
                              type="text"
                              placeholder="コメント（任意）"
                              value={itemState.comment}
                              onChange={(e) => setComment(item.id, e.target.value)}
                              className="w-full text-xs border rounded-md px-2.5 py-1.5 bg-gray-50 placeholder:text-muted-foreground focus:outline-none focus:border-blue-400"
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
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {isPending ? "保存中..." : `${ratedItems}項目の自己評価を保存する`}
        </button>
      </div>
    </div>
  );
}
