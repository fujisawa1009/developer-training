import NextAuth from "next-auth";
import { authConfig } from "@/auth/config";
import { NextResponse } from "next/server";

// Edge互換のauth設定のみを使ってミドルウェアを構築（Prisma不使用）
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login";
  const isPublic = isAuthPage || pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // /admin/* は admin または instructor のみアクセス可
  if (pathname.startsWith("/admin")) {
    const role = req.auth?.user?.role as string | undefined;
    if (role !== "admin" && role !== "instructor") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
