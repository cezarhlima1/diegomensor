import { Logo } from "./icons";

export default function Footer() {
  return (
    <footer className="border-t border-line py-12 relative z-[1]">
      <div className="wrap flex flex-wrap items-start justify-between gap-7">
        <a href="#" className="brand flex items-center gap-[11px] font-display font-extrabold text-[18px] tracking-[-.01em]">
          <span className="brand-mark">
            <Logo className="w-[18px] h-[18px]" />
          </span>
          <span>
            Precificação para Oficinas
            <small className="block font-mono font-medium text-[10px] tracking-[.14em] text-muted uppercase">
              by Diego Mensor
            </small>
          </span>
        </a>

        <div className="font-mono text-[12.5px] text-muted leading-[1.8] text-left sm:text-right">
          <b className="text-offwhite font-bold">Produtor:</b> MENSOR TREINAMENTOS LTDA
          <br />
          CNPJ: 66.021.375/0001-46
          <br />
          diegomensor@hotmail.com
        </div>

        <div className="w-full border-t border-line mt-[34px] pt-[22px] font-mono text-xs text-muted-dim flex flex-wrap justify-between gap-3.5">
          <span>© MENSOR TREINAMENTOS LTDA — Todos os direitos reservados</span>
          <span className="text-blue">@diegomensor</span>
        </div>
      </div>
    </footer>
  );
}
