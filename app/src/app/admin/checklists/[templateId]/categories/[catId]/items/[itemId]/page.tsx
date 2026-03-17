import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { GuideEditForm } from "./_components/GuideEditForm";

export default async function ItemGuidePage({
  params,
}: {
  params: Promise<{ templateId: string; catId: string; itemId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as string;
  if (role !== "admin" && role !== "instructor") redirect("/dashboard");

  const { templateId, catId, itemId } = await params;

  const item = await prisma.checklistItem.findFirst({
    where: {
      id: itemId,
      categoryId: catId,
      category: { checklistTemplateId: templateId, template: { tenantId: session.user.tenantId } },
    },
    include: {
      category: { include: { template: true } },
      guide: { include: { resourceLinks: { orderBy: { order: "asc" } } } },
    },
  });
  if (!item) redirect(`/admin/checklists/${templateId}/categories/${catId}`);

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      {/* パンくず */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/admin/checklists" className="text-muted-foreground hover:text-foreground">
          チェックリスト管理
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link
          href={`/admin/checklists/${templateId}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {item.category.template.name}
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link
          href={`/admin/checklists/${templateId}/categories/${catId}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {item.category.name}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium truncate max-w-48">{item.title}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">学習ガイド編集</h1>
        <p className="text-muted-foreground mt-1 text-sm">項目：{item.title}</p>
      </div>

      <GuideEditForm
        itemId={itemId}
        templateId={templateId}
        catId={catId}
        initialBody={item.guide?.body ?? ""}
        initialLinks={
          item.guide?.resourceLinks.map((l) => ({
            title: l.title,
            url: l.url,
            order: l.order,
          })) ?? []
        }
      />
    </div>
  );
}
