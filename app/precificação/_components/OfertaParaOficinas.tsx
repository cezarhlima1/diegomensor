import Cta from "./Cta";
import { Check } from "./icons";

const included = [
  { title: "Treinamento completo de precificação", description: "aulas práticas para calcular mão de obra e peças" },
  { title: "Planilha de precificação", description: "para fazer as contas da tua própria oficina" },
  { title: "Tabela de markup", description: "para precificar as peças corretamente" },
  { title: "Aula bônus + checklist", description: "para revisar e implementar a precificação na rotina" },
];

export default function OfertaParaOficinas() {
  return (
    <section id="checkout" aria-labelledby="oferta-title" className="checkout-light py-[72px] md:py-24">
      <div className="wrap mx-auto max-w-2xl text-center">
        <div className="price-card mx-auto max-w-[680px] text-center" data-glow>
          <span className="limited mx-auto">Condição especial por tempo limitado</span>
          <ul className="mx-auto mt-6 grid max-w-[520px] list-none gap-5 text-left">
            {included.map((item) => (
              <li key={item.title} className="flex items-start gap-3 text-[16px] leading-[1.7] text-[#173b54]">
                <span className="price-feat-ck mt-1"><Check className="h-[13px] w-[13px]" /></span>
                <span><strong>{item.title}</strong> — {item.description}</span>
              </li>
            ))}
          </ul>
          <div className="my-8 border-t border-[#173b54]/15" />
          <h2 id="oferta-title" className="!text-[#173b54] text-[22px] font-semibold leading-relaxed">Tudo isso por:</h2>
          <div className="price-main mx-auto mt-3 !text-[clamp(56px,9vw,76px)] leading-none">R$197</div>
          <p className="mt-4 !text-[#526d80] text-[16px] font-semibold">À vista. Pagamento único.</p>
          <p className="mt-4 !text-[#526d80] text-[14px]">ou</p>
          <div className="price-main mx-auto mb-8 mt-2 !text-[clamp(30px,6vw,48px)] leading-none">12x de R$20,25</div>
          <Cta variant="wide" className="!text-[clamp(14px,2vw,18px)]">QUERO ORGANIZAR MINHA PRECIFICAÇÃO</Cta>
        </div>
      </div>
    </section>
  );
}
