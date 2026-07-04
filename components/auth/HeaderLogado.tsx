import { sair } from "./actions";

/**
 * Header compartilhado da área logada (/calculadora, /conta — Fases 3 e 4).
 * Server component presentacional: mostra a empresa ativa, um slot para
 * navegação extra (ex.: link /conta na Fase 3) e o botão Sair, que submete
 * a server action `sair` via <form> — funciona mesmo sem JavaScript.
 */
export default function HeaderLogado({
  nomeEmpresa,
  children,
}: {
  /** Nome da empresa ativa da sessão. */
  nomeEmpresa: string;
  /** Slot para ações extras (ex.: link para /conta). */
  children?: React.ReactNode;
}) {
  return (
    <header className="auth-header">
      <div className="wrap auth-header-in">
        <span className="auth-header-empresa" title={nomeEmpresa}>
          {nomeEmpresa}
        </span>
        <nav className="auth-header-nav">
          {children}
          <form action={sair}>
            <button type="submit" className="auth-sair">
              Sair
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
