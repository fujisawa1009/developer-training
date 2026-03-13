import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CurriculumForm } from "../_components/CurriculumForm";
import { createCurriculum } from "../actions";

export default function NewCurriculumPage() {
  return (
    <div className="p-8 max-w-2xl space-y-6">
      <Link
        href="/admin/curricula"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        カリキュラム一覧に戻る
      </Link>

      <h1 className="text-2xl font-bold">カリキュラム新規作成</h1>

      <div className="bg-white rounded-lg border p-6">
        <CurriculumForm action={createCurriculum} submitLabel="作成する" />
      </div>
    </div>
  );
}
