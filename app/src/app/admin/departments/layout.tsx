import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminDepartmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  if (session.user.role !== "admin") {
    redirect("/admin/curricula");
  }

  return <>{children}</>;
}
