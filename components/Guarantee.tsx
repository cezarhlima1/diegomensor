import { ShieldCheck } from "./icons";

export default function Guarantee() {
  return (
    <section className="py-[72px] md:py-24">
      <div className="wrap">
        <div className="reveal flex flex-col sm:flex-row items-center gap-7 text-center sm:text-left max-w-[880px] mx-auto rounded-[22px] border border-line px-8 py-8 sm:px-10 sm:py-9 bg-[linear-gradient(150deg,var(--color-card-2),#0e151c)]">
          <div className="shield">
            <ShieldCheck className="w-[42px] h-[42px]" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-[clamp(22px,2.6vw,28px)] mb-2">
              Garantia de 7 dias, <span className="text-blue">risco zero</span>
            </h3>
            <p className="text-muted text-base max-w-[52ch] mx-auto sm:mx-0">
              Você tem 7 dias para pedir reembolso caso não faça sentido para você.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
