import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createDepartment } from "../actions";
import { DepartmentForm } from "../_components/DepartmentForm";

export default async function NewDepartmentPage() {
  return (
    <div className="p-8 max-w-xl space-y-6">
      <Link
        href="/admin/departments"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        部署一覧に戻る
      </Link>

      <div>
        <h1 className="text-2xl font-bold">部署を追加</h1>
        <p className="text-muted-foreground mt-1">新しい部署を作成します。</p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <DepartmentForm action={createDepartment} submitLabel="部署を作成する" />
      </div>
    </div>
  );
}
