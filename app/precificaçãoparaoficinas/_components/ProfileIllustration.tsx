function Mechanic({ x = 90, y = 36, scale = 1, light = false }: { x?: number; y?: number; scale?: number; light?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-13 29v12h26V29" fill="#e6ad83" />
    <rect x="-18" y="-5" width="36" height="40" rx="17" fill="#f1c49f" />
    <path d="M-19 9V-3c2-18 35-20 39 0v12H-19Z" fill="#123955" />
    <path d="M-23 41 0 36l23 5 9 39h-64Z" fill={light ? "#83ceff" : "#076ca7"} />
    <path d="m-8 38 8 12 8-12M0 50v30" fill="none" stroke="#e8f5fd" strokeWidth="2" />
    <rect x="8" y="51" width="10" height="9" rx="2" fill="#e8f5fd" />
    <path d="M-14 80v22M14 80v22" stroke="#123955" strokeWidth="13" strokeLinecap="round" />
    <path d="m-24 47-12 27M24 47l12 27" stroke="#f1c49f" strokeWidth="10" strokeLinecap="round" />
    <circle cx="-6" cy="14" r="1.5" fill="#123955" /><circle cx="6" cy="14" r="1.5" fill="#123955" />
    <path d="M-4 24q4 4 8 0" fill="none" stroke="#9d6043" strokeWidth="1.5" strokeLinecap="round" />
  </g>;
}

export default function ProfileIllustration({ kind }: { kind: number }) {
  return <svg viewBox="0 0 180 170" fill="none" aria-hidden="true" focusable="false">
    <circle cx="90" cy="85" r="70" fill="#e5f3fd" />
    <ellipse cx="90" cy="153" rx="67" ry="7" fill="#c4dfef" />
    {kind === 0 && <>
      <path d="M23 100V51l35-23 35 23v49" stroke="#9dc8e0" strokeWidth="3" strokeLinejoin="round" />
      <path d="M34 100V61h47v39M35 70h44M35 79h44" stroke="#9dc8e0" strokeWidth="3" />
      <Mechanic x={105} y={39} />
      <rect x="119" y="99" width="35" height="43" rx="4" fill="#fff" stroke="#076ca7" strokeWidth="2" />
      <path d="M127 110h18M127 118h18M127 126h11" stroke="#076ca7" strokeWidth="2" strokeLinecap="round" />
    </>}
    {kind === 1 && <>
      <Mechanic x={42} y={56} scale={0.75} light /><Mechanic x={138} y={56} scale={0.75} light />
      <Mechanic x={90} y={32} />
      <path d="m77 21 9 7 17-17" stroke="#076ca7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>}
    {kind === 2 && <>
      <Mechanic x={59} y={40} />
      <g stroke="#076ca7" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M107 83V59h28l12 13h12v23h-52Z" fill="#fff" />
        <path d="M112 59v17h35M135 59v17" />
        <circle cx="118" cy="95" r="7" fill="#123955" /><circle cx="148" cy="95" r="7" fill="#123955" />
        <path d="m105 129 7-13h29l9 13v14h-45Z" fill="#83ceff" />
        <path d="M111 129h33" /><circle cx="115" cy="143" r="5" fill="#123955" /><circle cx="141" cy="143" r="5" fill="#123955" />
      </g>
    </>}
    {kind === 3 && <>
      <Mechanic x={62} y={39} />
      <rect x="92" y="70" width="66" height="56" rx="5" fill="#fff" stroke="#076ca7" strokeWidth="2.5" />
      <path d="M101 82h45M101 93h45M101 104h26M112 77v36M131 77v36" stroke="#b8d6e9" strokeWidth="2" />
      <circle cx="147" cy="129" r="17" fill="#076ca7" />
      <path d="m139 129 6 6 10-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>}
    {kind === 4 && <>
      <path d="M90 151v-18h23v-22h23V89h25v62" fill="#b8def6" stroke="#7fb9dc" strokeWidth="2" strokeLinejoin="round" />
      <Mechanic x={58} y={39} />
      <path d="M107 79V48h36M107 48l24-24M130 24h13v13" stroke="#076ca7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="107" cy="79" r="5" fill="#076ca7" />
    </>}
  </svg>;
}
