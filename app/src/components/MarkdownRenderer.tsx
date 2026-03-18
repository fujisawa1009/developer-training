"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // コードブロック: 言語指定ありの場合はシンタックスハイライト
        pre: ({ children }) => <div className="my-4">{children}</div>,
        code({ className, children }) {
          const match = /language-(\w+)/.exec(className || "");
          if (match) {
            return (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                customStyle={{ borderRadius: "6px", fontSize: "0.85rem" }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          }
          // 言語指定なし（ASCIIアート・プレーンテキスト等）
          return (
            <code className="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono text-rose-700">
              {children}
            </code>
          );
        },
        // 見出し
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-3 border-b pb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-5 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mt-4 mb-2">{children}</h3>
        ),
        // 段落
        p: ({ children }) => (
          <p className="mb-3 text-sm leading-relaxed">{children}</p>
        ),
        // リスト
        ul: ({ children }) => (
          <ul className="list-disc pl-6 mb-3 space-y-1 text-sm">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 mb-3 space-y-1 text-sm">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        // 引用
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-4 py-2 my-4 rounded-r text-sm italic">
            {children}
          </blockquote>
        ),
        // テーブル
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-gray-300 px-3 py-2">{children}</td>
        ),
        // 水平線
        hr: () => <hr className="my-6 border-gray-200" />,
        // 強調
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
