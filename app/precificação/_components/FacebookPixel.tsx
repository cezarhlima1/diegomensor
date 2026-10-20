import Script from "next/script";
import { CURSO_PRECIFICACAO_VALOR, META_PIXEL_ID } from "@/lib/meta";

/* Meta Pixel — rastreamento dos funis de aquisição. Cada evento dispara
   duas vezes com o mesmo eventID: no browser (fbq) e via beacon para
   /api/ev (Conversions API, first-party — imune a adblock). O Meta
   deduplica pelo eventID, então nunca conta em dobro. */

type ConversionEvent = "Purchase" | "CompleteRegistration";

/* Parâmetros de custom_data do fbq por evento de conversão. O valor
   reportado pela CAPI é definido no servidor (app/api/ev/route.ts). */
const CONVERSION_PARAMS: Record<ConversionEvent, string> = {
  Purchase: `{value:${CURSO_PRECIFICACAO_VALOR},currency:'BRL'}`,
  CompleteRegistration: "{}",
};

function buildScript(conversion?: ConversionEvent) {
  const conversionSnippet = conversion
    ? `
  var cvId = evId();
  fbq('track', '${conversion}', ${CONVERSION_PARAMS[conversion]}, {eventID: cvId});
  capi('${conversion}', cvId);`
    : "";

  return `
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  function evId(){return (self.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2)}
  function capi(name,id){try{
    var payload=JSON.stringify({eventName:name,eventId:id,sourceUrl:location.href});
    if(navigator.sendBeacon){navigator.sendBeacon('/api/ev',new Blob([payload],{type:'application/json'}))}
    else{fetch('/api/ev',{method:'POST',headers:{'Content-Type':'application/json'},body:payload,keepalive:true})}
  }catch(e){}}
  var pvId = evId();
  fbq('init', '${META_PIXEL_ID}');
  fbq('track', 'PageView', {}, {eventID: pvId});
  capi('PageView', pvId);${conversionSnippet}
`;
}

export default function FacebookPixel({ conversion }: { conversion?: ConversionEvent } = {}) {
  return (
    <>
      <Script
        id="scr-facebook-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: buildScript(conversion) }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
