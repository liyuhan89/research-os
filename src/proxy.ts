// Next.js 16 的中间件文件约定已由 middleware 改名为 proxy。
// 强制登录：/research 未登录时重定向到 /login；其余页面与 API 放行
//（受保护的 API 在各 route handler 内自行校验 auth()）。

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith("/research")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/research/:path*"],
};
