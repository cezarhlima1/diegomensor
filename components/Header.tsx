import { Logo } from "./icons";
import Cta from "./Cta";

export default function Header() {
  return (
    <header
      id="site-header"
      className="site-header fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 py-4 sm:px-8 lg:px-12"
    >
      <a href="#" className="brand flex items-center gap-[11px] font-display font-extrabold text-base tracking-[-.01em]">
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

      <Cta className="hidden md:inline-flex !py-[11px] !px-5 !text-[13px]">
        Quero acessar
      </Cta>
    </header>
  );
}
