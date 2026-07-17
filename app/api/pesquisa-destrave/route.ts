import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 24_576;
const MAX_CAMPO = 4_000;
const TIMEOUT_WEBHOOK_MS = 8_000;

function textoPlanilha(valor: unknown, maximo = MAX_CAMPO): string {
  const texto = String(valor ?? "").trim().slice(0, maximo);
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

export async function POST(req: Request) {
  const webhook = process.env.SHEETS_WEBHOOK_URL;
  if (!webhook || !webhook.startsWith("https://")) {
    return NextResponse.json({ ok: false, error: "missing-webhook" }, { status: 500 });
  }

  const tamanho = Number(req.headers.get("content-length"));
  if (Number.isFinite(tamanho) && tamanho > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const name = textoPlanilha(body.name, 120);
  const phone = textoPlanilha(body.phone, 30);
  const respostas = {
    problemaPrincipal: textoPlanilha(body.problemaPrincipal),
    areaPerda: textoPlanilha(body.areaPerda, 200),
    tentativaSolucao: textoPlanilha(body.tentativaSolucao),
    dificuldadeFechamento: textoPlanilha(body.dificuldadeFechamento),
    tresProblemas: textoPlanilha(body.tresProblemas),
    solucaoEsperada: textoPlanilha(body.solucaoEsperada),
    faturamento: textoPlanilha(body.faturamento, 100),
  };

  if (
    name.length < 3 ||
    phone.replace(/\D/g, "").length < 10 ||
    Object.values(respostas).some((resposta) => !resposta)
  ) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  try {
    const resposta = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        email: "",
        source: "pesquisa-obrigado-destrave",
        answers: JSON.stringify(respostas),
      }),
      signal: AbortSignal.timeout(TIMEOUT_WEBHOOK_MS),
    });
    if (!resposta.ok) throw new Error(`webhook respondeu ${resposta.status}`);
  } catch {
    return NextResponse.json({ ok: false, error: "sheets-failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
