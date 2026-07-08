import Script from "next/script";

/* Meta Pixel — rastreamento de eventos (PageView) para os funis
   de aquisição. ID da conta de anúncios do Diego Mensor. */
const PIXEL_ID = "567420969768240";

const pixelScript = `
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${PIXEL_ID}');
  fbq('track', 'PageView');
`;

export default function FacebookPixel() {
  return (
    <>
      <Script
        id="scr-facebook-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: pixelScript }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
