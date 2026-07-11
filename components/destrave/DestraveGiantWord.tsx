/** Palavra monumental em segundo plano — textura tipográfica de baixíssima opacidade, cortada pelas bordas da seção. */
export default function DestraveGiantWord({ word, className }: { word: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`dest-giant-word ${className ?? ""}`}>
      {word}
    </span>
  );
}
