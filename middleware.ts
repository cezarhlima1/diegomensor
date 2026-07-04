import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Protege as rotas da área logada (/calculadora e /conta) e renova a sessão
 * Supabase. As demais rotas (públicas) nem executam o middleware — ver
 * config.matcher no fim do arquivo.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail-closed: sem configuração do Supabase não há como validar sessão,
  // então a área logada fica inacessível (redirect para /login).
  if (!url || !anonKey) {
    return redirectParaLogin(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Propaga cookies renovados tanto para a requisição (server
        // components desta mesma navegação) quanto para a resposta (browser).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() valida o JWT junto ao Supabase e dispara o refresh da sessão
  // quando necessário (por isso não usar getSession() aqui).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectParaLogin(request);
  }

  return response;
}

function redirectParaLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Somente a área logada passa pelo middleware; todas as rotas públicas
  // (/, /quiz, /cadastro, /bio, /v1, /obrigado, /api/lead, ...) são ignoradas.
  matcher: ["/calculadora/:path*", "/conta/:path*"],
};
