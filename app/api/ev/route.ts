import { NextResponse, type NextRequest } from "next/server";
import {
  CURSO_PRECIFICACAO_VALOR,
  sendMetaServerEvent,
  type MetaEventName,
} from "@/lib/meta";

const MAX_BODY_BYTES = 2_048;

const EVENTOS_PERMITIDOS: ReadonlySet<string> = new Set([
  "PageView",
  "Purchase",
  "CompleteRegistration",
] satisfies MetaEventName[]);

/**
 * Endpoint first-party da Conversions API do Meta. O FacebookPixel envia
 * um beacon para cá com o mesmo eventId usado no fbq(); o servidor repassa
 * para a Graph API. Como a URL é do próprio domínio, adblockers que
 * bloqueiam connect.facebook.net não afetam este caminho.
 *
 * O valor do Purchase é definido aqui (não vem do cliente) para o dado
 * reportado ao Meta não ser manipulável pelo browser.
 */
export async function POST(req: NextRequest) {
  const tamanho = Number(req.headers.get("content-length"));
  if (Number.isFinite(tamanho) && tamanho > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });
  }

  let body: { eventName?: string; eventId?: string; sourceUrl?: string };
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const eventName = String(body.eventName ?? "");
  const eventId = String(body.eventId ?? "").slice(0, 64);
  const sourceUrl = String(body.sourceUrl ?? "").slice(0, 1_024);

  if (!EVENTOS_PERMITIDOS.has(eventName) || !eventId || !sourceUrl.startsWith("https://")) {
    return NextResponse.json({ ok: false, error: "invalid-event" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;

  const enviado = await sendMetaServerEvent({
    eventName: eventName as MetaEventName,
    eventId,
    sourceUrl,
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
    fbp: req.cookies.get("_fbp")?.value,
    fbc: req.cookies.get("_fbc")?.value,
    ...(eventName === "Purchase" && { value: CURSO_PRECIFICACAO_VALOR, currency: "BRL" }),
  });

  return NextResponse.json({ ok: enviado });
}
