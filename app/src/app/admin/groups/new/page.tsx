import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createGroup } from "../actions";
import { GroupForm } from "../_components/GroupForm";

export default async function NewGroupPage() {
  return (
    <div className="p-8 max-w-xl space-y-6">
      <Link
        href="/admin/groups"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        グループ一覧に戻る
      </Link>

      <div>
        <h1 className="text-2xl font-bold">グループを追加</h1>
        <p className="text-muted-foreground mt-1">新しいグループを作成します。</p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <GroupForm action={createGroup} submitLabel="グループを作成する" />
      </div>
    </div>
  );
}
