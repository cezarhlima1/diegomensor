/** Corrente + cadeado decorativo — reforça a identidade "destrancar a oficina" no herói. */
export default function DestraveChainMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 170" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeWidth={9} opacity={0.55}>
        <ellipse cx="46" cy="46" rx="30" ry="19" transform="rotate(-16 46 46)" />
        <ellipse cx="100" cy="62" rx="30" ry="19" transform="rotate(16 100 62)" />
        <ellipse cx="154" cy="46" rx="30" ry="19" transform="rotate(-16 154 46)" />
        <ellipse cx="208" cy="62" rx="30" ry="19" transform="rotate(16 208 62)" />
      </g>
      <g transform="translate(216 40)">
        <path d="M18 40V24a28 28 0 0 1 56 0v16" stroke="currentColor" strokeWidth={12} fill="none" opacity={0.6} />
        <rect x="0" y="38" width="92" height="72" rx="11" fill="currentColor" opacity={0.85} />
        <rect x="41" y="66" width="10" height="20" rx="4" fill="var(--color-bg-deep)" />
        <circle cx="46" cy="66" r="8" fill="var(--color-bg-deep)" />
      </g>
    </svg>
  );
}
