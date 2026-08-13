import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const destination = requestedNext === "/CRM" ? "/CRM" : "/calculadora";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.redirect(new URL(destination === "/CRM" ? "/login-crm?erro=confirmacao" : "/login?erro=confirmacao", request.url));
}
