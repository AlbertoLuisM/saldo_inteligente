import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/receitas/:path*",
    "/despesas/:path*",
    "/dividas/:path*",
    "/contas-pagar/:path*",
    "/contas-receber/:path*",
    "/metas/:path*",
    "/saude-financeira/:path*",
    "/relatorios/:path*",
    "/consultor-ia/:path*",
    "/notificacoes/:path*",
    "/configuracoes/:path*",
    "/seguranca/:path*",
    "/visao-financeira/:path*",
  ],
};
