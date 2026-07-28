/* Meta Pixel / Conversions API — constantes e envio server-side.
   O mesmo evento é disparado no browser (fbq) e no servidor (CAPI)
   com o mesmo eventId; o Meta deduplica. Assim o rastreamento
   sobrevive a adblockers que bloqueiam connect.facebook.net. */

export const META_PIXEL_ID = "567420969768240";

/* Preço à vista do curso de precificação (R$), usado no evento Purchase. */
export const CURSO_PRECIFICACAO_VALOR = 197;

export type MetaEventName = "PageView" | "Purchase" | "CompleteRegistration";

const GRAPH_API_URL = `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`;
const TIMEOUT_CAPI_MS = 8_000;

type MetaServerEvent = {
  eventName: MetaEventName;
  eventId: string;
  sourceUrl: string;
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  value?: number;
  currency?: string;
};

/**
 * Envia um evento para a Conversions API. Sem META_CAPI_ACCESS_TOKEN
 * configurado vira no-op (retorna false) — o pixel do browser continua
 * funcionando normalmente.
 */
export async function sendMetaServerEvent(ev: MetaServerEvent): Promise<boolean> {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) return false;

  const userData: Record<string, string> = {};
  if (ev.ip) userData.client_ip_address = ev.ip;
  if (ev.userAgent) userData.client_user_agent = ev.userAgent;
  if (ev.fbp) userData.fbp = ev.fbp;
  if (ev.fbc) userData.fbc = ev.fbc;

  const data: Record<string, unknown> = {
    event_name: ev.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: ev.eventId,
    event_source_url: ev.sourceUrl,
    action_source: "website",
    user_data: userData,
  };
  if (ev.value !== undefined) {
    data.custom_data = { value: ev.value, currency: ev.currency ?? "BRL" };
  }

  try {
    const res = await fetch(GRAPH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [data], access_token: token }),
      signal: AbortSignal.timeout(TIMEOUT_CAPI_MS),
    });
    if (!res.ok) {
      console.error("meta-capi: resposta não-ok", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("meta-capi: falha no envio", err);
    return false;
  }
}
