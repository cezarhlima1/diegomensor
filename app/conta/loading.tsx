/**
 * Feedback imediato ao navegar para /conta. A página é dinâmica (várias
 * consultas no servidor) — sem este boundary o clique em "Minha conta"
 * parecia não reagir até a resposta chegar.
 */
export default function Loading() {
  return (
    <main className="conta-page">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[760px]">
        <div className="calc-card cta-reveal" role="status" aria-live="polite">
          <p className="calc-card-kicker">Minha conta</p>
          <h1 className="calc-card-title">Carregando…</h1>
          <p className="calc-card-sub">Buscando os dados da sua conta.</p>
        </div>
      </div>
    </main>
  );
}
