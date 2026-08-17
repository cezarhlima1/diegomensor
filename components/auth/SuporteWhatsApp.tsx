import { WhatsApp } from "@/components/icons";

/** Dígitos do WhatsApp de suporte (55 47 9135-4788) — código do país + DDD, sem espaços/traços, formato exigido pelo link wa.me. */
const NUMERO_WHATSAPP_SUPORTE = "554791354788";

/**
 * Link de contato de suporte via WhatsApp. Reutilizado no header logado
 * (`/calculadora`, `/conta`, via HeaderLogado) e no `/login`; as Fases 3/4
 * do plano de cadastro reaproveitam este mesmo componente em
 * `/teste-gratis` e `/licenca-expirada`. Presentacional puro, sem estado —
 * `className` deixa o chamador ajustar o encaixe no layout (pill de nav vs.
 * link avulso), sem expor a URL/número para fora do componente.
 */
export default function SuporteWhatsApp({ className = "auth-suporte" }: { className?: string }) {
  return (
    <a
      href={`https://wa.me/${NUMERO_WHATSAPP_SUPORTE}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <WhatsApp className="w-[14px] h-[14px]" />
      Suporte
    </a>
  );
}
