"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground")}
    >
      <LogOut className="w-4 h-4 mr-1.5" />
      ログアウト
    </button>
  );
}
