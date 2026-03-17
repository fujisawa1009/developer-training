"use client";

import { useState, useActionState } from "react";
import { saveGuide } from "../actions";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { Plus, Trash2, GripVertical } from "lucide-react";

type ResourceLink = { title: string; url: string; order: number };

export function GuideEditForm({
  itemId,
  templateId,
  catId,
  initialBody,
  initialLinks,
}: {
  itemId: string;
  templateId: string;
  catId: string;
  initialBody: string;
  initialLinks: ResourceLink[];
}) {
  const [links, setLinks] = useState<ResourceLink[]>(initialLinks);

  const action = saveGuide.bind(null, itemId, templateId, catId);
  const [state, formAction, pending] = useActionState(action, null);

  function addLink() {
    setLinks((prev) => [
      ...prev,
      { title: "", url: "", order: prev.length },
    ]);
  }

  function removeLink(idx: number) {
    setLinks((prev) => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, order: i })));
  }

  function updateLink(idx: number, field: keyof ResourceLink, value: string | number) {
    setLinks((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Markdown ボディ */}
      <div className="space-y-2">
        <label className="text-sm font-medium">学習ガイド本文（Markdown）</label>
        <p className="text-xs text-muted-foreground">
          Markdown記法で記述できます。受講者には本文として表示されます。
        </p>
        <textarea
          name="body"
          rows={20}
          defaultValue={initialBody}
          placeholder={"# 見出し\n\n説明文をここに記述します。\n\n```bash\n# コード例\ngit clone https://github.com/...\n```"}
          className="w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      {/* 参考リンク */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">参考リンク</label>
          <button
            type="button"
            onClick={addLink}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Plus className="w-4 h-4 mr-1" />
            リンクを追加
          </button>
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-md px-4 py-6 text-center">
            参考リンクがありません。「リンクを追加」で追加できます。
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((link, idx) => (
              <div key={idx} className="flex items-start gap-2 rounded-lg border bg-gray-50 p-3">
                <GripVertical className="w-4 h-4 mt-2 text-muted-foreground shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">タイトル</label>
                    <input
                      type="text"
                      value={link.title}
                      onChange={(e) => updateLink(idx, "title", e.target.value)}
                      placeholder="参考ドキュメント"
                      className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">URL</label>
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateLink(idx, "url", e.target.value)}
                      placeholder="https://..."
                      className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mt-0.5"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeLink(idx)}
                  className="p-1.5 rounded hover:bg-red-100 text-red-500 hover:text-red-700 mt-0.5 shrink-0"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* hidden input で JSON送信 */}
      <input type="hidden" name="links" value={JSON.stringify(links)} />

      {/* フィードバック + 保存ボタン */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className={cn(buttonVariants(), "min-w-24")}
        >
          {pending ? "保存中..." : "保存"}
        </button>
        {state?.success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5">
            {state.success}
          </p>
        )}
        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
