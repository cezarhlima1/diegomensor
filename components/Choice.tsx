import { Check } from "./icons";

const bad = [
  "Mais orçamento no dedo",
  "Mais preço baseado em concorrente",
  "Mais faturamento sem entender por que sobra tão pouco",
  "Mais um fim de mês olhando a conta e pensando: “eu trabalhei isso tudo… pra isso?”",
];

const good = [
  "Aprender os 7 passos",
  "Entender quanto sua oficina realmente custa",
  "Descobrir quanto precisa cobrar",
  "Parar de precificar no improviso",
  "Proteger sua margem",
  "Construir lucro com clareza",
];

export default function Choice() {
  return (
    <section className="py-[72px] md:py-24 text-center">
      <div className="wrap">
        <span className="tag reveal">Vamos bater um papo sério</span>
        <h2 className="reveal d1 font-display font-extrabold text-[clamp(26px,3.6vw,44px)] mt-[18px] mb-2 mx-auto max-w-[22ch]">
          Por mais quanto tempo você vai continuar trabalhando muito…{" "}
          <span className="text-blue">sem saber se está cobrando certo?</span>
        </h2>
        <p className="reveal d2 font-mono text-muted tracking-[.12em] text-[15px]">
          6 meses? 1 ano? 2 anos?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[22px] mt-[50px] text-left">
          {/* continuar como está */}
          <div className="choice-card choice-bad reveal d1">
            <h3 className="font-display font-black text-xl tracking-[.04em] uppercase mb-[22px] text-muted">
              Continuar como está
            </h3>
            <ul className="grid gap-[14px] list-none">
              {bad.map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-[15.5px] leading-[1.45] text-muted">
                  <span className="choice-ic">✕</span> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* tomar atitude */}
          <div className="choice-card choice-good reveal d2">
            <h3 className="font-display font-black text-xl tracking-[.04em] uppercase mb-[22px] text-white">
              Tomar uma atitude agora
            </h3>
            <ul className="grid gap-[14px] list-none">
              {good.map((t, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-[15.5px] leading-[1.45] text-offwhite font-medium"
                >
                  <span className="choice-ic">
                    <Check className="w-[14px] h-[14px]" />
                  </span>{" "}
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
